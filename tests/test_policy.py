from saferecover.models import PaymentEvent, PaymentState, RecoveryAction
from saferecover.policy import deterministic_triage


def test_unknown_failure_fails_closed():
    decision = deterministic_triage(
        PaymentEvent(
            event_id="evt_unknown",
            event_type="payment.failed",
            order_id="order_unknown",
            payment_id="pay_unknown",
            amount=100,
            status=PaymentState.FAILED,
        )
    )
    assert decision.action == RecoveryAction.REVIEW
    assert decision.needs_human_review


def test_explicit_hard_failure_wins_over_bank_source():
    decision = deterministic_triage(
        PaymentEvent(
            event_id="evt_expired",
            event_type="payment.failed",
            order_id="order_expired",
            payment_id="pay_expired",
            amount=100,
            status=PaymentState.FAILED,
            error_source="bank",
            error_reason="card_expired",
        )
    )
    assert decision.action == RecoveryAction.RECOVER_NOW
