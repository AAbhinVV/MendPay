from fastapi import FastAPI
from fastapi.testclient import TestClient

from saferecover.studio import create_studio_router
from saferecover.storage import CaseRepository
from saferecover.engine import RecoveryEngine
from saferecover.models import PaymentEvent, PaymentState


def studio(tmp_path):
    repo = CaseRepository(str(tmp_path / "studio.db"))
    app = FastAPI()
    app.include_router(create_studio_router(repo))
    return TestClient(app), repo


def test_seed_is_idempotent_and_isolated(tmp_path):
    client, repo = studio(tmp_path)
    real = RecoveryEngine().create_case(PaymentEvent(event_id="external",event_type="payment.failed",merchant_id="other",order_id="other_order",payment_id="other_payment",amount=100,status=PaymentState.FAILED))
    repo.save(real)
    assert client.get("/api/studio").json()["cases"] == []
    first = client.post("/api/studio/seed").json()
    second = client.post("/api/studio/seed").json()
    assert first["mode"] == "simulation"
    assert len(first["cases"]) == 12
    assert {c["case_id"] for c in first["cases"]} == {c["case_id"] for c in second["cases"]}
    assert len(repo.list()) == 13
    assert client.post(f"/api/studio/cases/{real.case_id}/approve").status_code == 404


def test_approval_retry_and_duplicate_capture(tmp_path):
    client, _ = studio(tmp_path)
    cases = client.post("/api/studio/seed").json()["cases"]
    case = next(c for c in cases if c["state"] == "awaiting_approval")
    url = f'/api/studio/cases/{case["case_id"]}'
    client.post(f"{url}/approve")
    retried = client.post(f"{url}/approve").json()["cases"]
    current = next(c for c in retried if c["case_id"] == case["case_id"])
    assert current["state"] == "link_issued"
    assert sum(a["action"] == "payment_link_issued" for a in current["audit"]) == 1
    paid = client.post(f"{url}/recovery-paid").json()["cases"]
    assert next(c for c in paid if c["case_id"] == case["case_id"])["state"] == "recovery_paid"
    duplicate = client.post(f"{url}/duplicate").json()["cases"]
    assert next(c for c in duplicate if c["case_id"] == case["case_id"])["state"] == "duplicate_payment_detected"


def test_observation_blocks_approval_and_stops_on_original(tmp_path):
    client, _ = studio(tmp_path)
    cases = client.post("/api/studio/seed").json()["cases"]
    case = next(c for c in cases if c["state"] == "observing")
    url = f'/api/studio/cases/{case["case_id"]}'
    assert client.post(f"{url}/approve").status_code == 409
    result = client.post(f"{url}/original-paid").json()["cases"]
    updated = next(c for c in result if c["case_id"] == case["case_id"])
    assert updated["state"] == "original_recovered"
    assert updated["recovery_link_id"] is None


def test_advance_window_and_unknown_actions(tmp_path):
    client, _ = studio(tmp_path)
    cases = client.post("/api/studio/seed").json()["cases"]
    case = next(c for c in cases if c["state"] == "observing")
    url = f'/api/studio/cases/{case["case_id"]}'
    assert client.post(f"{url}/recovery-paid").status_code == 409
    result = client.post(f"{url}/observe").json()["cases"]
    assert next(c for c in result if c["case_id"] == case["case_id"])["state"] == "awaiting_approval"
    assert client.post(f"{url}/refund").status_code == 404
