# MendPay

## Next.js product frontend

The new `frontend/` contains a responsive landing page, GSAP workflow, and an API-backed simulated recovery dashboard. Start FastAPI on `127.0.0.1:8000`, then run `pnpm install --frozen-lockfile` and `pnpm dev` from `frontend/`. Open `http://127.0.0.1:3000` and load the sample cases. The studio workspace never uses real payment credentials or sends messages.

See [the complete project/build guide](outputs/MendPay-Project-Guide.md) for the user journey, architecture, setup, low-level failure modes, and production gaps. Existing Streamlit functionality is preserved; its session state is separate from the studio workspace.


**Revenue recovery without duplicate charges.** MendPay is a Razorpay Buildathon Track 03 prototype that handles the race between a `payment.failed` event, late authorization of the original payment, and a second recovery payment.

## Why it exists

Typical recovery tools send a new link immediately after failure. Some payment failures can resolve later. MendPay observes risky failures, revalidates the original payment before every recovery action, and stops pending recovery when the original succeeds.

The project deliberately separates:

- AI interpretation: ambiguous failure triage and customer-safe explanations.
- Deterministic control: amounts, statuses, observation windows, approvals, idempotency, and Razorpay actions.

## Quick start

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run dashboard.py
```

The dashboard works without credentials using deterministic demo adapters.

Run the API separately:

```powershell
uvicorn saferecover.api:app --reload
```

Run tests:

```powershell
pytest -q
```

## Optional integrations

Copy `.env.example` to `.env` and configure:

- `OPENAI_API_KEY` for schema-constrained ambiguous triage.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from Razorpay **Test Mode**.
- `RAZORPAY_WEBHOOK_SECRET` to validate webhook signatures.

The OpenAI integration uses the Responses API, structured outputs, and `gpt-5.6-luna`. When unavailable, deterministic triage continues and ambiguous cases fail closed to manual review.

## Demo flow

1. Open **Recovery cases**.
2. Replay late authorization on the transient bank failure; observe recovery stop.
3. Approve the expired-card case and issue a demo recovery link.
4. Simulate its recovery payment.
5. Review the fixed-seed policy comparison under **Held-out evaluation**.

All monetary results in the evaluation tab are simulated and explicitly labelled.

## Safety invariants

- One active recovery workflow per merchant/order.
- One active recovery link per case.
- No link if the original is authorized/captured, the customer opted out, or the case is not awaiting approval.
- No automated refunds.
- No model output can directly invoke Razorpay.
- Every workflow transition is auditable.
