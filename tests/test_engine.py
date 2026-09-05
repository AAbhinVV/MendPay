from datetime import timedelta

from saferecover.engine import RecoveryEngine
from saferecover.models import CaseState, PaymentEvent, PaymentState, utc_now


def event(reason: str, source: str = "customer") -> PaymentEvent:
    return PaymentEvent(
        event_id=f"evt_{reason}",
        event_type="payment.failed",
        order_id=f"order_{reason}",
        payment_id=f"pay_{reason}",
        amount=10_000,
        status=PaymentState.FAILED,
        error_source=source,
        error_reason=reason,
    )


def test_transient_failure_is_observed():
    case = RecoveryEngine().create_case(event("network_error", "bank"))
    assert case.state == CaseState.OBSERVING
    assert case.observation_deadline is not None


def test_hard_failure_waits_for_approval():
    case = RecoveryEngine().create_case(event("card_expired"))
    assert case.state == CaseState.AWAITING_APPROVAL


def test_late_original_capture_stops_recovery_and_cancels_link():
    engine = RecoveryEngine()
    case = engine.create_case(event("network_error", "bank"))
    engine.apply_payment_update(
        case,
        payment_id=case.original_payment_id,
        state=PaymentState.CAPTURED,
        event_id="evt_late_capture",
    )
    assert case.state == CaseState.ORIGINAL_RECOVERED


def test_observation_expiry_allows_approval():
    engine = RecoveryEngine()
    case = engine.create_case(event("gateway_error", "gateway"))
    case.observation_deadline = utc_now() - timedelta(seconds=1)
    engine.observation_expired(case)
    assert case.state == CaseState.AWAITING_APPROVAL


def test_opt_out_blocks_link():
    engine = RecoveryEngine()
    blocked = event("card_expired")
    blocked.customer_opted_out = True
    case = engine.create_case(blocked)
    engine.approve_and_issue_link(case)
    assert case.state == CaseState.MANUAL_REVIEW
    assert case.recovery_link_id is None


def test_recovery_then_original_capture_detects_duplicate():
    engine = RecoveryEngine()
    case = engine.create_case(event("card_expired"))
    engine.approve_and_issue_link(case)
    engine.apply_payment_update(
        case,
        payment_id="pay_recovery_1",
        state=PaymentState.CAPTURED,
        event_id="evt_recovery",
    )
    assert case.state == CaseState.RECOVERY_PAID
    engine.apply_payment_update(
        case,
        payment_id=case.original_payment_id,
        state=PaymentState.CAPTURED,
        event_id="evt_original_late",
    )
    assert case.state == CaseState.DUPLICATE_PAYMENT_DETECTED

