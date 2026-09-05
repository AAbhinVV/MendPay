from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PaymentState(StrEnum):
    FAILED = "failed"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    UNKNOWN = "unknown"


class FailureClass(StrEnum):
    HARD_FAILURE = "hard_failure"
    MAY_LATE_AUTHORIZE = "may_late_authorize"
    ALREADY_RESOLVED = "already_resolved"
    UNCERTAIN = "uncertain"


class RecoveryAction(StrEnum):
    OBSERVE = "observe"
    RECOVER_NOW = "recover_now"
    STOP = "stop"
    REVIEW = "review"


class CaseState(StrEnum):
    FAILED_DETECTED = "failed_detected"
    TRIAGED = "triaged"
    OBSERVING = "observing"
    AWAITING_APPROVAL = "awaiting_approval"
    LINK_ISSUED = "link_issued"
    RECOVERY_PAID = "recovery_paid"
    ORIGINAL_RECOVERED = "original_recovered"
    STOPPED = "stopped"
    EXPIRED = "expired"
    MANUAL_REVIEW = "manual_review"
    DUPLICATE_PAYMENT_DETECTED = "duplicate_payment_detected"


TERMINAL_STATES = {
    CaseState.RECOVERY_PAID,
    CaseState.ORIGINAL_RECOVERED,
    CaseState.STOPPED,
    CaseState.EXPIRED,
    CaseState.MANUAL_REVIEW,
    CaseState.DUPLICATE_PAYMENT_DETECTED,
}


class PaymentEvent(BaseModel):
    event_id: str
    event_type: str
    merchant_id: str = "demo_merchant"
    order_id: str
    payment_id: str
    amount: int = Field(gt=0, description="Amount in currency subunits")
    currency: str = "INR"
    status: PaymentState = PaymentState.UNKNOWN
    error_source: str | None = None
    error_step: str | None = None
    error_reason: str | None = None
    error_description: str | None = None
    customer_opted_out: bool = False
    occurred_at: datetime = Field(default_factory=utc_now)


class RecoveryDecision(BaseModel):
    failure_class: FailureClass
    action: RecoveryAction
    observe_minutes: int = Field(default=0, ge=0, le=30)
    reason_codes: list[str] = Field(default_factory=list)
    explanation: str
    confidence: float = Field(ge=0, le=1)
    needs_human_review: bool = False


class AuditEvent(BaseModel):
    at: datetime = Field(default_factory=utc_now)
    actor: str
    action: str
    detail: dict[str, Any] = Field(default_factory=dict)


class RecoveryCase(BaseModel):
    case_id: str
    merchant_id: str
    order_id: str
    original_payment_id: str
    amount: int
    currency: str = "INR"
    original_payment_state: PaymentState = PaymentState.FAILED
    recovery_payment_state: PaymentState = PaymentState.UNKNOWN
    state: CaseState = CaseState.FAILED_DETECTED
    failure_class: FailureClass | None = None
    decision: RecoveryDecision | None = None
    observation_deadline: datetime | None = None
    recovery_link_id: str | None = None
    recovery_link_url: str | None = None
    contacts_sent: int = 0
    customer_opted_out: bool = False
    approved: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    audit: list[AuditEvent] = Field(default_factory=list)

    @property
    def amount_rupees(self) -> float:
        return self.amount / 100

