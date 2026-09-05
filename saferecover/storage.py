from __future__ import annotations

import sqlite3
from pathlib import Path

from .models import RecoveryCase


class CaseRepository:
    def __init__(self, path: str = "work/saferecover.db"):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_db(self) -> None:
        with self._connect() as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS cases (case_id TEXT PRIMARY KEY, merchant_id TEXT, order_id TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL)"
            )
            db.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS active_case_per_order ON cases(merchant_id, order_id)"
            )
            db.execute(
                "CREATE TABLE IF NOT EXISTS webhook_events (event_id TEXT PRIMARY KEY, received_at TEXT DEFAULT CURRENT_TIMESTAMP)"
            )

    def save(self, case: RecoveryCase) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO cases(case_id, merchant_id, order_id, payload, updated_at) VALUES(?,?,?,?,?) "
                "ON CONFLICT(case_id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
                (case.case_id, case.merchant_id, case.order_id, case.model_dump_json(), case.updated_at.isoformat()),
            )

    def get(self, case_id: str) -> RecoveryCase | None:
        with self._connect() as db:
            row = db.execute("SELECT payload FROM cases WHERE case_id=?", (case_id,)).fetchone()
        return RecoveryCase.model_validate_json(row["payload"]) if row else None

    def list(self) -> list[RecoveryCase]:
        with self._connect() as db:
            rows = db.execute("SELECT payload FROM cases ORDER BY updated_at DESC").fetchall()
        return [RecoveryCase.model_validate_json(row["payload"]) for row in rows]

    def find_by_order(self, merchant_id: str, order_id: str) -> RecoveryCase | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT payload FROM cases WHERE merchant_id=? AND order_id=?",
                (merchant_id, order_id),
            ).fetchone()
        return RecoveryCase.model_validate_json(row["payload"]) if row else None

    def claim_webhook(self, event_id: str) -> bool:
        try:
            with self._connect() as db:
                db.execute("INSERT INTO webhook_events(event_id) VALUES(?)", (event_id,))
            return True
        except sqlite3.IntegrityError:
            return False
