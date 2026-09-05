"""Isolated, local-only simulation API for the React product demo.

Never uses the environment's live provider or LLM. Stored demo cases are scoped
to a dedicated merchant; the lock serializes mutations within this one process.
"""
from threading import RLock
from datetime import timedelta
from fastapi import APIRouter, HTTPException

from .engine import RecoveryEngine, DemoPaymentLinkProvider
from .models import PaymentEvent, PaymentState, CaseState, utc_now
from .storage import CaseRepository


def create_studio_router(repository: CaseRepository) -> APIRouter:
    router = APIRouter(prefix="/api/studio", tags=["Local simulation"])
    engine = RecoveryEngine(link_provider=DemoPaymentLinkProvider())
    merchant = "studio_simulation"
    lock = RLock()

    def workspace():
        return {"mode": "simulation", "cases": [c for c in repository.list() if c.merchant_id == merchant]}

    def get_case(case_id):
        case = repository.get(case_id)
        if not case or case.merchant_id != merchant:
            raise HTTPException(404, "This case is not in the simulated workspace.")
        return case

    @router.get("")
    def list_cases():
        return workspace()

    @router.post("/seed")
    def seed():
        scenarios = [
            ("1042", 249900, "request_timed_out", "observe"),
            ("1041", 429900, "card_expired", "approval"),
            ("1040", 189900, "network_error", "resolved"),
            ("1039", 649900, "insufficient_balance", "approval"),
            ("1038", 329900, "unclassified_response", "review"),
            ("1037", 129900, "card_expired", "paid"),
            ("1036", 849900, "server_error", "observe"),
            ("1035", 279900, "card_declined", "link"),
            ("1034", 159900, "network_error", "resolved"),
            ("1033", 549900, "incorrect_pin", "approval"),
            ("1032", 99900, "card_expired", "paid"),
            ("1031", 389900, "unclassified_response", "review"),
        ]
        with lock:
            for index, (number, amount, reason, scenario) in enumerate(scenarios):
                order_id = f"order_demo_{number}"
                if repository.find_by_order(merchant, order_id):
                    continue
                event = PaymentEvent(event_id=f"evt_studio_{number}", event_type="payment.failed",
                    merchant_id=merchant, order_id=order_id, payment_id=f"pay_demo_{number}",
                    amount=amount, status=PaymentState.FAILED, error_reason=reason)
                case = engine.create_case(event)
                case.created_at = utc_now() - timedelta(minutes=index * 7 + 2)
                if scenario in {"paid", "link"}:
                    engine.approve_and_issue_link(case)
                if scenario == "paid":
                    engine.apply_payment_update(case, payment_id=f"pay_recovery_{number}", state=PaymentState.CAPTURED, event_id=f"evt_seed_paid_{number}")
                if scenario == "resolved":
                    engine.apply_payment_update(case, payment_id=case.original_payment_id, state=PaymentState.CAPTURED, event_id=f"evt_seed_resolved_{number}")
                repository.save(case)
        return workspace()

    @router.post("/cases/{case_id}/{action}")
    def act(case_id: str, action: str):
        with lock:
            case = get_case(case_id)
            if action == "approve":
                # An HTTP retry must not invalidate or issue a second link.
                if case.recovery_link_id:
                    return workspace()
                if case.state != CaseState.AWAITING_APPROVAL:
                    raise HTTPException(409, "Only a case awaiting approval can issue a simulated link.")
                engine.approve_and_issue_link(case)
            elif action == "observe":
                if case.state != CaseState.OBSERVING:
                    raise HTTPException(409, "This case is not observing an original payment.")
                case.observation_deadline = utc_now() - timedelta(seconds=1)
                engine.observation_expired(case)
            elif action == "original-paid":
                if case.state not in {CaseState.OBSERVING, CaseState.LINK_ISSUED, CaseState.AWAITING_APPROVAL}:
                    raise HTTPException(409, "This case cannot simulate an original payment in its current state.")
                engine.apply_payment_update(case, payment_id=case.original_payment_id, state=PaymentState.CAPTURED, event_id=f"evt_studio_original_{case_id}")
            elif action == "recovery-paid":
                if case.state != CaseState.LINK_ISSUED:
                    raise HTTPException(409, "Issue a simulated recovery link first.")
                engine.apply_payment_update(case, payment_id=f"pay_recovery_{case_id}", state=PaymentState.CAPTURED, event_id=f"evt_studio_recovery_{case_id}")
            elif action == "duplicate":
                if case.state != CaseState.RECOVERY_PAID:
                    raise HTTPException(409, "First simulate a captured recovery payment.")
                engine.apply_payment_update(case, payment_id=case.original_payment_id, state=PaymentState.CAPTURED, event_id=f"evt_studio_duplicate_{case_id}")
            else:
                raise HTTPException(404, "Unknown simulated action.")
            repository.save(case)
        return workspace()

    return router
