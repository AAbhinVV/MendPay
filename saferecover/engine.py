from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import uuid4

from .models import (
    AuditEvent,
    CaseState,
    PaymentEvent,
    PaymentState,
    RecoveryCase,
    RecoveryDecision,
    utc_now,
)
from .policy import apply_decision, deterministic_triage, recovery_guardrails


class PaymentLinkProvider(Protocol):
    def create_link(self, case: RecoveryCase) -> tuple[str, str]: ...
    def cancel_link(self, link_id: str) -> None: ...


class TriageAgent(Protocol):
    def decide(self, event: PaymentEvent) -> RecoveryDecision: ...


class DemoPaymentLinkProvider:
    def create_link(self, case: RecoveryCase) -> tuple[str, str]:
        link_id = f"plink_demo_{case.case_id[-8:]}"
        return link_id, f"https://rzp.io/i/{link_id}"

    def cancel_link(self, link_id: str) -> None:
        return None


class RecoveryEngine:
    """Pure workflow engine. External persistence can snapshot returned cases."""

    def __init__(
        self,
        link_provider: PaymentLinkProvider | None = None,
        triage_agent: TriageAgent | None = None,
    ):
        self.link_provider = link_provider or DemoPaymentLinkProvider()
        self.triage_agent = triage_agent

    @staticmethod
    def _audit(case: RecoveryCase, actor: str, action: str, **detail: object) -> None:
        case.audit.append(AuditEvent(actor=actor, action=action, detail=detail))
        case.updated_at = utc_now()

    def create_case(self, event: PaymentEvent, decision: RecoveryDecision | None = None) -> RecoveryCase:
        case = RecoveryCase(
            case_id=f"rcv_{uuid4().hex[:12]}",
            merchant_id=event.merchant_id,
            order_id=event.order_id,
            original_payment_id=event.payment_id,
            amount=event.amount,
            currency=event.currency,
            original_payment_state=event.status,
            customer_opted_out=event.customer_opted_out,
        )
        self._audit(case, "orchestrator", "failure_detected", event_id=event.event_id)
        chosen = decision or deterministic_triage(event)
        if chosen.needs_human_review and self.triage_agent:
            try:
                chosen = self.triage_agent.decide(event)
                self._audit(case, "llm_triage_agent", "structured_decision_received")
            except Exception as exc:
                self._audit(
                    case,
                    "llm_triage_agent",
                    "fallback_to_manual_review",
                    error_type=type(exc).__name__,
                )
        apply_decision(case, chosen)
        self._audit(
            case,
            "triage_agent",
            "decision_made",
            failure_class=chosen.failure_class.value,
            decision_action=chosen.action.value,
            confidence=chosen.confidence,
            reason_codes=chosen.reason_codes,
        )
        return case

    def observation_expired(self, case: RecoveryCase, now: datetime | None = None) -> RecoveryCase:
        now = now or utc_now()
        if case.state != CaseState.OBSERVING:
            return case
        if case.observation_deadline and now < case.observation_deadline:
            return case
        if case.original_payment_state in {PaymentState.AUTHORIZED, PaymentState.CAPTURED}:
            case.state = CaseState.ORIGINAL_RECOVERED
            self._audit(case, "payment_observer", "original_recovered_during_observation")
        else:
            case.state = CaseState.AWAITING_APPROVAL
            self._audit(case, "payment_observer", "observation_expired_unresolved")
        return case

    def approve_and_issue_link(self, case: RecoveryCase) -> RecoveryCase:
        fetch_payment = getattr(self.link_provider, "fetch_payment", None)
        if fetch_payment:
            try:
                current = fetch_payment(case.original_payment_id)
                current_state = PaymentState(current.get("status", PaymentState.UNKNOWN.value))
                case.original_payment_state = current_state
                self._audit(
                    case,
                    "payment_observer",
                    "pre_action_status_rechecked",
                    payment_state=current_state.value,
                )
                if current_state in {PaymentState.AUTHORIZED, PaymentState.CAPTURED}:
                    case.state = CaseState.ORIGINAL_RECOVERED
                    self._audit(case, "policy_guardian", "recovery_stopped_before_link")
                    return case
            except Exception as exc:
                case.state = CaseState.MANUAL_REVIEW
                self._audit(
                    case,
                    "payment_observer",
                    "pre_action_status_check_failed",
                    error_type=type(exc).__name__,
                )
                return case
        violations = recovery_guardrails(case)
        if violations:
            self._audit(case, "policy_guardian", "action_blocked", violations=violations)
            case.state = CaseState.MANUAL_REVIEW
            return case
        case.approved = True
        self._audit(case, "merchant", "recovery_approved")

        # Final state check must occur in the caller immediately before this method.
        link_id, link_url = self.link_provider.create_link(case)
        case.recovery_link_id = link_id
        case.recovery_link_url = link_url
        case.state = CaseState.LINK_ISSUED
        case.contacts_sent += 1
        self._audit(case, "recovery_executor", "payment_link_issued", link_id=link_id)
        return case

    def apply_payment_update(
        self,
        case: RecoveryCase,
        *,
        payment_id: str,
        state: PaymentState,
        event_id: str,
    ) -> RecoveryCase:
        self._audit(
            case,
            "payment_observer",
            "payment_update_received",
            payment_id=payment_id,
            payment_state=state.value,
            event_id=event_id,
        )
        paid = state in {PaymentState.AUTHORIZED, PaymentState.CAPTURED}
        if payment_id == case.original_payment_id:
            case.original_payment_state = state
            if paid:
                if case.recovery_payment_state == PaymentState.CAPTURED:
                    case.state = CaseState.DUPLICATE_PAYMENT_DETECTED
                    self._audit(case, "duplicate_guardian", "duplicate_payment_detected", amount=case.amount)
                else:
                    if case.recovery_link_id:
                        self.link_provider.cancel_link(case.recovery_link_id)
                        self._audit(case, "recovery_executor", "recovery_link_cancelled", link_id=case.recovery_link_id)
                    case.state = CaseState.ORIGINAL_RECOVERED
                    self._audit(case, "policy_guardian", "pending_recovery_stopped")
        elif case.recovery_link_id and payment_id.startswith("pay_recovery_"):
            case.recovery_payment_state = state
            if state == PaymentState.CAPTURED:
                if case.original_payment_state in {PaymentState.AUTHORIZED, PaymentState.CAPTURED}:
                    case.state = CaseState.DUPLICATE_PAYMENT_DETECTED
                    self._audit(case, "duplicate_guardian", "duplicate_payment_detected", amount=case.amount)
                else:
                    case.state = CaseState.RECOVERY_PAID
                    self._audit(case, "outcome_agent", "revenue_recovered", amount=case.amount)
        case.updated_at = utc_now()
        return case
