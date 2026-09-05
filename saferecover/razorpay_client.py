from __future__ import annotations

import hashlib
import hmac
import os
from datetime import timedelta

import requests

from .models import RecoveryCase, utc_now


class RazorpayPaymentLinkProvider:
    base_url = "https://api.razorpay.com/v1"

    def __init__(self, key_id: str | None = None, key_secret: str | None = None):
        self.key_id = key_id or os.getenv("RAZORPAY_KEY_ID")
        self.key_secret = key_secret or os.getenv("RAZORPAY_KEY_SECRET")
        if not self.key_id or not self.key_secret:
            raise RuntimeError("Razorpay test credentials are not configured")

    @property
    def auth(self) -> tuple[str, str]:
        return self.key_id, self.key_secret

    def create_link(self, case: RecoveryCase) -> tuple[str, str]:
        payload = {
            "amount": case.amount,
            "currency": case.currency,
            "accept_partial": False,
            "reference_id": f"safe_{case.case_id}"[:40],
            "description": f"Safe recovery for order {case.order_id}"[:2048],
            "expire_by": int((utc_now() + timedelta(hours=48)).timestamp()),
            "reminder_enable": False,
            "notes": {"case_id": case.case_id, "original_payment_id": case.original_payment_id},
        }
        response = requests.post(
            f"{self.base_url}/payment_links",
            auth=self.auth,
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        return data["id"], data["short_url"]

    def cancel_link(self, link_id: str) -> None:
        response = requests.post(
            f"{self.base_url}/payment_links/{link_id}/cancel",
            auth=self.auth,
            timeout=15,
        )
        if response.status_code not in {200, 400}:
            response.raise_for_status()

    def fetch_payment(self, payment_id: str) -> dict:
        response = requests.get(
            f"{self.base_url}/payments/{payment_id}",
            auth=self.auth,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()


def verify_webhook_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

