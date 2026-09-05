from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class Scenario:
    scenario_id: str
    amount: int
    failure_kind: str
    original_resolves_late: bool
    customer_pays_recovery: bool
    opted_out: bool = False


def generate_scenarios(count: int = 120, seed: int = 42) -> list[Scenario]:
    rng = random.Random(seed)
    scenarios: list[Scenario] = []
    kinds = ["network_error", "gateway_error", "card_expired", "insufficient_balance", "unknown"]
    for index in range(count):
        kind = rng.choices(kinds, weights=[24, 18, 24, 24, 10], k=1)[0]
        transient = kind in {"network_error", "gateway_error"}
        resolves_late = transient and rng.random() < 0.42
        pays_recovery = (not resolves_late) and kind != "unknown" and rng.random() < 0.58
        scenarios.append(
            Scenario(
                scenario_id=f"sim_{index + 1:03d}",
                amount=rng.randrange(499, 24_999),
                failure_kind=kind,
                original_resolves_late=resolves_late,
                customer_pays_recovery=pays_recovery,
                opted_out=rng.random() < 0.04,
            )
        )
    return scenarios


def evaluate_policies(scenarios: list[Scenario]) -> dict[str, dict[str, float]]:
    metrics = {
        "Immediate baseline": {"recovered": 0, "duplicates": 0, "contacts": 0, "prevented": 0},
        "MendPay": {"recovered": 0, "duplicates": 0, "contacts": 0, "prevented": 0},
    }
    for item in scenarios:
        if not item.opted_out:
            metrics["Immediate baseline"]["contacts"] += 1
            if item.customer_pays_recovery:
                metrics["Immediate baseline"]["recovered"] += item.amount
            if item.original_resolves_late:
                # The baseline exposes the full late-authorized amount to a duplicate request.
                metrics["Immediate baseline"]["duplicates"] += item.amount

        safe_should_contact = not item.opted_out and not item.original_resolves_late and item.failure_kind != "unknown"
        if safe_should_contact:
            metrics["MendPay"]["contacts"] += 1
            if item.customer_pays_recovery:
                metrics["MendPay"]["recovered"] += item.amount
        if item.original_resolves_late and not item.opted_out:
            metrics["MendPay"]["prevented"] += item.amount

    for policy in metrics.values():
        policy["recovered_rupees"] = round(policy.pop("recovered") / 100, 2)
        policy["duplicate_exposure_rupees"] = round(policy.pop("duplicates") / 100, 2)
        policy["duplicate_value_prevented_rupees"] = round(policy.pop("prevented") / 100, 2)
    return metrics
