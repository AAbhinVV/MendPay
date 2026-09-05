import hashlib
import hmac
import json

from fastapi.testclient import TestClient

import saferecover.api as api
from saferecover.storage import CaseRepository


def signed(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def test_webhook_signature_and_idempotency(tmp_path, monkeypatch):
    secret = "test_secret"
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", secret)
    monkeypatch.setattr(api, "repository", CaseRepository(str(tmp_path / "cases.db")))
    payload = {
        "account_id": "merchant_test",
        "event": "payment.failed",
        "created_at": 1_700_000_000,
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_failed_1",
                    "order_id": "order_1",
                    "amount": 49_900,
                    "currency": "INR",
                    "error_source": "bank",
                    "error_step": "payment_authentication",
                    "error_reason": "network_error",
                }
            }
        },
    }
    body = json.dumps(payload, separators=(",", ":")).encode()
    client = TestClient(api.app)

    rejected = client.post("/webhooks/razorpay", content=body, headers={"Content-Type": "application/json"})
    assert rejected.status_code == 401

    headers = {"X-Razorpay-Signature": signed(body, secret), "Content-Type": "application/json"}
    accepted = client.post("/webhooks/razorpay", content=body, headers=headers)
    duplicate = client.post("/webhooks/razorpay", content=body, headers=headers)
    assert accepted.status_code == 200
    assert accepted.json()["case_id"]
    assert duplicate.json()["status"] == "duplicate_ignored"

