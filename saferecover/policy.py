from __future__ import annotations

from datetime import timedelta

from .models import (
    CaseState,
    FailureClass,
    PaymentEvent,
    PaymentState,
    RecoveryAction,
    RecoveryCase,
    RecoveryDecision,
    utc_now,
)


TRANSIENT_REASONS = {
    "gateway_error",
    "network_error",
    "payment_processing_error",
    "server_error",
    "request_timed_out",
    "transaction_pending",
}

HARD_REASONS = {
    "card_expired",
    "incorrect_pin",
    "invalid_card",
    "insufficient_balance",
    "card_not_enrolled",
    "card_declined",
}


def deterministic_triage(event: PaymentEvent) -> RecoveryDecision:
    reason = (event.error_reason or "").strip().lower()
    source = (event.error_source or "").strip().lower()

    if event.status in {PaymentState.AUTHORIZED, PaymentState.CAPTURED}:
        return RecoveryDecision(
            failure_class=FailureClass.ALREADY_RESOLVED,
            action=RecoveryAction.STOP,
            reason_codes=["PAYMENT_ALREADY_RESOLVED"],
            explanation="The original payment is no longer failed, so recovery must stop.",
            confidence=1.0,
        )
    if reason in HARD_REASONS:
        return RecoveryDecision(
            failure_class=FailureClass.HARD_FAILURE,
            action=RecoveryAction.RECOVER_NOW,
            reason_codes=[reason.upper()],
            explanation="The failure is final enough to offer a new, guarded payment path.",
            confidence=0.96,
        )
    if reason in TRANSIENT_REASONS or source in {"bank", "gateway"}:
        return RecoveryDecision(
            failure_class=FailureClass.MAY_LATE_AUTHORIZE,
            action=RecoveryAction.OBSERVE,
            observe_minutes=15,
            reason_codes=[reason.upper() or "TRANSIENT_PROVIDER_FAILURE"],
            explanation="A transient bank or gateway failure can resolve late; observe before asking the customer to pay again.",
            confidence=0.94,
        )
    return RecoveryDecision(
        failure_class=FailureClass.UNCERTAIN,
        action=RecoveryAction.REVIEW,
        reason_codes=["UNKNOWN_FAILURE_REASON"],
        explanation="The evidence is insufficient for an automated recovery decision.",
        confidence=0.45,
        needs_human_review=True,
    )


def apply_decision(case: RecoveryCase, decision: RecoveryDecision) -> RecoveryCase:
    case.failure_class = decision.failure_class
    case.decision = decision
    case.state = CaseState.TRIAGED
    if decision.action == RecoveryAction.OBSERVE:
        case.state = CaseState.OBSERVING
        case.observation_deadline = utc_now() + timedelta(minutes=decision.observe_minutes)
    elif decision.action == RecoveryAction.RECOVER_NOW:
        case.state = CaseState.AWAITING_APPROVAL
    elif decision.action == RecoveryAction.STOP:
        case.state = CaseState.ORIGINAL_RECOVERED
    else:
        case.state = CaseState.MANUAL_REVIEW
    case.updated_at = utc_now()
    return case


def recovery_guardrails(case: RecoveryCase) -> list[str]:
    violations: list[str] = []
    if case.customer_opted_out:
        violations.append("CUSTOMER_OPTED_OUT")
    if case.original_payment_state in {PaymentState.AUTHORIZED, PaymentState.CAPTURED}:
        violations.append("ORIGINAL_ALREADY_RESOLVED")
    if case.contacts_sent >= 2:
        violations.append("CONTACT_CAP_REACHED")
    if case.recovery_link_id:
        violations.append("ACTIVE_RECOVERY_LINK_EXISTS")
    if case.state != CaseState.AWAITING_APPROVAL:
        violations.append("CASE_NOT_AWAITING_APPROVAL")
    return violations
