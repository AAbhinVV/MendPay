from __future__ import annotations

import json
import os
from datetime import timedelta

from fastapi import FastAPI, Header, HTTPException, Request
from dotenv import load_dotenv
from pydantic import BaseModel

from .engine import RecoveryEngine
from .llm import OpenAITriageAgent
from .models import PaymentEvent, PaymentState, utc_now
from .razorpay_client import RazorpayPaymentLinkProvider, verify_webhook_signature
from .storage import CaseRepository

load_dotenv()


app = FastAPI(title="MendPay API", version="0.1.0")
repository = CaseRepository(os.getenv("SAFERECOVER_DB_PATH", "work/saferecover.db"))
triage_agent = OpenAITriageAgent() if os.getenv("OPENAI_API_KEY") else None
link_provider = None
if os.getenv("SAFERECOVER_DEMO_MODE", "true").lower() == "false" and os.getenv("RAZORPAY_KEY_ID"):
    link_provider = RazorpayPaymentLinkProvider()
engine = RecoveryEngine(link_provider=link_provider, triage_agent=triage_agent)

# Demo workspace uses a separate provider and merchant scope, never live keys.
from .studio import create_studio_router
app.include_router(create_studio_router(repository))


class SimulatedUpdate(BaseModel):
    payment_id: str
    state: PaymentState


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/cases")
def list_cases():
    return repository.list()


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    case = repository.get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case


@app.post("/api/demo/failure")
def create_demo_failure(event: PaymentEvent):
    case = engine.create_case(event)
    repository.save(case)
    return case


@app.post("/api/cases/{case_id}/expire-observation")
def expire_observation(case_id: str):
    case = get_case(case_id)
    case.observation_deadline = utc_now() - timedelta(seconds=1)
    engine.observation_expired(case)
    repository.save(case)
    return case


@app.post("/api/cases/{case_id}/approve")
def approve(case_id: str):
    case = get_case(case_id)
    engine.approve_and_issue_link(case)
    repository.save(case)
    return case


@app.post("/api/cases/{case_id}/simulate-event")
def simulate_event(case_id: str, update: SimulatedUpdate):
    case = get_case(case_id)
    engine.apply_payment_update(
        case,
        payment_id=update.payment_id,
        state=update.state,
        event_id=f"sim_{utc_now().timestamp()}",
    )
    repository.save(case)
    return case


@app.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(default="")):
    raw = await request.body()
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if not secret or not verify_webhook_signature(raw, x_razorpay_signature, secret):
        raise HTTPException(401, "Invalid webhook signature")
    payload = json.loads(raw)
    payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
    event_id = payload.get("id") or f"{payload.get('event')}:{payload.get('created_at')}:{payment.get('id')}"
    if not repository.claim_webhook(event_id):
        return {"status": "duplicate_ignored"}
    event_type = payload.get("event", "")
    merchant_id = payload.get("account_id", "demo_merchant")
    order_id = payment.get("order_id")
    payment_id = payment.get("id")
    if not order_id or not payment_id:
        return {"status": "accepted_no_case", "event_id": event_id}

    case = repository.find_by_order(merchant_id, order_id)
    if event_type == "payment.failed" and case is None:
        case = engine.create_case(
            PaymentEvent(
                event_id=event_id,
                event_type=event_type,
                merchant_id=merchant_id,
                order_id=order_id,
                payment_id=payment_id,
                amount=payment["amount"],
                currency=payment.get("currency", "INR"),
                status=PaymentState.FAILED,
                error_source=payment.get("error_source"),
                error_step=payment.get("error_step"),
                error_reason=payment.get("error_reason"),
                error_description=payment.get("error_description"),
            )
        )
        repository.save(case)
    elif case and event_type in {"payment.authorized", "payment.captured", "order.paid"}:
        state = PaymentState.AUTHORIZED if event_type == "payment.authorized" else PaymentState.CAPTURED
        engine.apply_payment_update(
            case,
            payment_id=payment_id,
            state=state,
            event_id=event_id,
        )
        repository.save(case)
    return {"status": "accepted", "event_id": event_id, "case_id": case.case_id if case else None}
