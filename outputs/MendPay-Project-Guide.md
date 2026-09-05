# MendPay — project and build field guide

## 1. What this project does

MendPay is a revenue-recovery prototype for failed online payments. Its specific idea is that a failed checkout does not always justify an immediate second payment request: an ambiguous original payment may still resolve. The workflow therefore has three useful interventions: observe, recover with merchant approval, or stop/escalate.

The intended user is a merchant or payment-operations teammate. Instead of manually comparing failure messages and payment statuses, they get a queue of cases, an explanation of each initial decision, bounded actions, and a chronological audit trail. The intended benefit is fewer unnecessary recovery requests, clearer operator decisions, and more traceable recovery work. These are product hypotheses, not validated savings or a guarantee against duplicate payments.

This repository has two interfaces:

- The original Streamlit MVP (`dashboard.py`). It uses its own session-state demonstration.
- The new Next.js / React product frontend (`frontend/`): landing page, interactive recovery workspace, and field-guide page. Its cases come from FastAPI and persist in SQLite.

The two dashboards do not share the same in-memory presentation state. The React workspace uses the isolated merchant `studio_simulation`; do not expect Streamlit's session-state actions to appear there.

## 2. What is real and what is simulated

**Working now:** React routes; GSAP scroll-linked workflow; responsive layout; reduced-motion support; local shadcn Skeleton; server-rendered streaming through Suspense; API-backed sample cases; filter/search; approval gating; simulated payment-state transitions; persisted audit records; JSON export; error and empty states.

**Always simulated in the React workspace:** payment links, original/recovery captures, time advancement, customer contact, and the money displayed. The studio router creates its own `DemoPaymentLinkProvider` and does not use live Razorpay credentials or an LLM, even if they exist in the environment. It restricts access to its own demo merchant's cases.

**Existing integrations, not verified by this frontend build:** the general backend's Razorpay test-mode provider and optional structured AI triage. They are separate from the studio router. No real API key or live customer was used to validate this frontend.

**Not implemented:** production authentication, team invitations, real messaging, refund execution, durable scheduler, multi-process coordination, production-grade reconciliation, causal recovery measurement, or independently deployed specialist agents.

Never describe the simulated totals as actual money recovered. Original payments that resolve naturally must be kept separate from recovery-link payments. Cases with duplicate-payment alerts are excluded from the frontend's recovery-payment total, pending reconciliation. The display is a snapshot by current state, not a financial ledger.

## 3. The complete user workflow

1. **Arrive on the landing page.** The headline is “A second chance. Not a second charge.” It describes a concrete problem rather than a generic AI promise. A sample receipt shows the gap between the customer's failure screen and the payment's eventual state.
2. **Explore the sequence.** Scroll through “Listen first”, “Make a considered move”, and “Know when to stop”. The adjacent payment visual updates through GSAP ScrollTrigger on desktop. Buttons let the user inspect any stage without relying on scroll. On small screens or reduced motion, the interaction remains available without scroll effects.
3. **Open the workspace.** Next.js performs client-side navigation. The route template provides a short entrance transition. The loading route and Suspense fallback show the expected skeleton layout while API data is fetched. There is no artificial delay just to exhibit loading.
4. **Load sample cases.** The explicit button creates twelve deterministic sample orders through the backend engine. Seeding is idempotent within the single-process demo: existing samples are preserved, not reset. Some samples illustrate earlier simulated outcomes and are clearly labeled as sample data.
5. **Read the overview.** Totals are calculated from the fetched cases, not hardcoded marketing numbers. The overview separates recovery captures, original captures, pending approvals, and observations. The queue distribution is a categorical snapshot, not an invented time-series chart.
6. **Find a case.** Search by order ID, case ID, reason code, or status. Filter for approvals, observations, recovered cases, or manual review. A no-match state offers “Clear filters”.
7. **Inspect before acting.** Open a case drawer. It shows the amount, current state, original classification explanation, reason codes, payment states, approval record, and audit events. The original explanation is labeled as initial classification; it does not pretend to describe every later event.
8. **Try a bounded action.** For an approval candidate, approve the displayed simulated amount. For an observing case, simulate the original capture or manually advance the observation window. An outstanding demo link supports a simulated recovery capture or late original capture.
9. **See the outcome.** The API returns the latest workspace after a mutation. The frontend replaces its state only after the server confirms the result. The amounts, queue, and open drawer update together. A monetary outcome is not optimistically invented while a request is pending.
10. **Test a failure case.** On a recovery-paid case, simulate a late original capture. The case becomes “Duplicate detected”. The interface asks for investigation; it does not pretend a refund has happened.
11. **Inspect/export the audit.** The audit screen combines timestamped events from all cases. JSON export preserves structured details. Times are displayed in IST; persisted timestamps remain UTC.
12. **Learn the constraints.** The guardrails screen is read-only. The field guide explains the unfinished production work before any real-money use.

## 4. System map and source files

```text
Browser
  ├─ /                   Landing and interactive payment story
  ├─ /dashboard          Recovery workspace
  └─ /guide              Guide summary and document download
          │ same-origin fetch
          ▼
Next.js /api/studio/*    Allowlisted proxy, origin check, timeout
          │ private/local backend origin
          ▼
FastAPI /api/studio/*    Isolated merchant + demo provider + local lock
          ▼
RecoveryEngine          Triage → policy → observation/approval → outcome
          ▼
CaseRepository          SQLite snapshots containing audit entries
```

| File or directory | Responsibility |
| --- | --- |
| `frontend/app/page.tsx`, `components/landing.tsx` | Landing composition and GSAP workflow |
| `frontend/app/dashboard/page.tsx` | Async server data boundary and Suspense streaming |
| `frontend/app/dashboard/loading.tsx` | Route loading fallback |
| `frontend/components/dashboard.tsx` | Queue, derived totals, case drawer, actions, audit, policies |
| `frontend/components/ui/skeleton.tsx` | Local shadcn-style Skeleton primitive |
| `frontend/app/tokens.css`, `globals.css` | Palette, type, layout, interaction and responsive styles |
| `frontend/lib/server-api.ts` | Server-only API origin and bounded uncached fetching |
| `frontend/app/api/studio/[[...path]]/route.ts` | Narrow GET/POST proxy; rejects unrelated paths |
| `frontend/app/api/guide/route.ts` | Downloads this file from the sibling outputs directory |
| `saferecover/studio.py` | Isolated deterministic simulation API for the new frontend |
| `saferecover/api.py` | Original API/webhook routes and studio-router registration |
| `saferecover/models.py` | Payment, case, decision and audit schemas |
| `saferecover/policy.py` | Failure classification and action guardrails |
| `saferecover/engine.py` | Workflow transitions, provider boundary and audit generation |
| `saferecover/storage.py` | SQLite case and webhook storage |
| `saferecover/llm.py` | Optional AI triage in the general backend, not studio |
| `saferecover/razorpay_client.py` | Existing provider adapter, not used by studio |
| `saferecover/simulator.py` | Illustrative batch simulator; not a validated benchmark |
| `tests/`, `frontend/tests/` | Backend and frontend verification |

The “agent” names in audit entries are functional roles. Today they run within an ordinary Python engine. They are not eight separate LLMs, independent workers, or a distributed agent platform.

## 5. Run the project manually

Use a recent supported Node.js runtime (the implementation was built with Node 24), Python 3.11+, and pnpm. Keep services bound to localhost. From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:SAFERECOVER_DB_PATH = "work/studio-preview.db"
.\.venv\Scripts\python.exe -m uvicorn saferecover.api:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3000`. Click “Open app”, then “Load sample cases”. No credentials are needed for the studio demo. The frontend defaults to the local API on port 8000. For another port, create `frontend/.env.local` with `SAFERECOVER_API_URL=http://127.0.0.1:YOUR_PORT`, then restart Next.js. This variable is deliberately not prefixed with `NEXT_PUBLIC_`; provider addresses/credentials belong on the server.

Production-build smoke test, still local-only:

```powershell
cd frontend
pnpm build
pnpm start
```

Do not run `dev` and `start` on the same port at the same time. Stop the intended foreground process with Ctrl+C. If port 8000 already serves an old API process, restart it after adding the studio router; a running non-reload Python process does not pick up file edits.

Verification:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd frontend
pnpm typecheck
pnpm test:e2e
```

The browser tests require a running frontend and backend and an installed Chromium-compatible browser. See `frontend/playwright.config.ts` for the configured channel. They mutate only the isolated demo cases. The guide download assumes the frontend runs from its own directory next to `outputs/`; include that file if packaging/deploying separately.

The mutating browser scenario explicitly skips if all approval samples have already been exercised. For a fresh repeatable run, stop your own API process, set `$env:SAFERECOVER_DB_PATH = "work/qa-fresh.db"` to a new file, and start the API again. This preserves your existing database. Do not delete a database just to reset a test. Backend tests use temporary databases automatically.

## 6. Step-by-step manual build sequence

### Step A — Define the money and identity contracts

Start with currency subunits as integers, not floating-point rupees. An amount of `249900` means ₹2,499.00. Persist merchant ID, order ID, original payment ID, case ID, and currency. Distinguish provider references from internal IDs. Validate amounts at the boundary; never let an LLM choose or rewrite them.

### Step B — Draw the state machine before the screens

Write a transition table. Typical paths are `observing → awaiting_approval → link_issued → recovery_paid` and `observing → original_recovered`. Unknown evidence goes to `manual_review`; a double capture goes to `duplicate_payment_detected`. List allowed actions for each state and reject all others server-side. A disabled button is usability, not security.

### Step C — Implement deterministic rules and tests

Classify repeatable failures first. Treat ambiguous provider states conservatively. Test unknown reasons, opt-out, existing links, resolved originals, and repeated commands. A failure code alone is not final evidence that the payment can never resolve. The current classifier is a prototype heuristic.

### Step D — Isolate side effects behind a provider interface

The engine receives a provider with create/cancel methods. Build a fake provider first so tests never depend on a payment network. Only then add a provider-backed test-mode adapter. Keep test and live credentials structurally separate and fail closed on a live-key configuration during demos.

### Step E — Persist state and audit together

The MVP stores a JSON case snapshot including audit events. For real use, use a transaction that updates state with a version check and appends an immutable event. Persist the action intent before calling an external provider. Reconcile external responses into that intent afterward; see the outbox discussion below.

### Step F — Build the narrow API

Use explicit action endpoints, validated payloads, predictable errors, and tenant authorization. The added studio API restricts operations to its own merchant and has a process-local lock plus idempotent seeding and repeat approval. That is enough for a single-process local demo, not enough for public multi-tenant use.

### Step G — Establish the design system

Create tokens before components: warm-white surfaces, navy ink, yellow actions, orange observation, red errors, pink review, purple links. Use Space Grotesk display with Geist body, bundled locally. Hallmark informed the narrative landing structure, floating nav, intentional whitespace, semantic states, restrained transitions, and no invented proof metrics. The user's explicit multi-accent request takes precedence over Hallmark's usual single-accent preference.

### Step H — Build the static experience, then stateful components

Lay out the hero, workflow, trust section, FAQ, and footer. Build mobile reflow early. Add the dashboard's empty state, skeleton, error state, queue, case drawer, and audit before polishing motion. Bind totals to the same case state as the queue so numbers and rows cannot disagree within a response.

### Step I — Add streaming and motion at clear boundaries

The async server workspace waits on uncached API data inside Suspense. The shell/loading screen can render first, then React streams resolved content. This is component streaming, not token streaming, SSE, or live background payment updates. Refresh explicitly synchronizes external changes. GSAP is confined to client effects, and its matchMedia scope is reverted on unmount to prevent duplicate triggers in React Strict Mode. No scroll hijacking is used.

### Step J — Exercise failure paths, not just the hero CTA

Test at 320, 375, 414, 768, and desktop widths. Check horizontal overflow, keyboard focus, dialog Escape, readable contrast, reduced motion, and long identifiers. Kill or disconnect the API to check a real error state. Send a repeated approval and verify one link; send an invalid transition and verify rejection. Production also needs out-of-order events, process crashes, reconciliation, and concurrent-worker tests.

## 7. Where a manual build breaks, and low-level fixes

### 7.1 Browser can’t reach the API

**Symptom:** CORS failures, fetch errors, 404 studio routes, or an empty dashboard.

**Cause:** Browser and Python API have different origins; the server is down; the old Python process predates new routes; or a deployment uses `localhost` in the wrong container.

**Fix:** The browser calls same-origin Next.js routes. The Next server calls the configured FastAPI origin with a timeout. Verify `/health` and `/api/studio` directly, restart the correct API process, and configure a reachable private backend hostname when deployed. Do not solve CORS with unrestricted origins plus credentials.

### 7.2 Server components touch browser APIs

**Symptom:** `window is not defined`, hydration mismatch, or duplicate animations.

**Cause:** GSAP or DOM code runs during server rendering; nondeterministic timestamps differ between server and client; Strict Mode mounts an effect twice.

**Fix:** Put interactions behind `"use client"`, start GSAP inside an effect, and revert its context/matchMedia on cleanup. Keep initial data serializable and stable. Render local timestamps with an explicit timezone. Keep server-only environment access in a server-only module.

### 7.3 Skeleton appears forever—or never streams

**Cause:** A request lacks a timeout, a parent awaits data outside the Suspense boundary, or infrastructure buffers the response.

**Fix:** Put the slow async component inside the boundary, keep the shell outside its await, set `AbortSignal.timeout`, and provide an explicit error/empty result. Inspect the response stream under throttling rather than adding fake sleeps. On a fast local connection a skeleton may be imperceptible; that is desirable, not broken.

### 7.4 Double-clicking approval creates two links

**Cause:** Both requests read `awaiting_approval`, then each calls the provider before either saves.

**Current demo:** A process-local lock serializes actions and an existing link makes repeat approval return current state. The UI also uses an in-flight lock.

**Production fix:** Use a database row lock or compare-and-swap (`UPDATE ... WHERE version = expected_version`), a unique action key per case/attempt, and a durable action-intent record. Use provider-supported idempotency where available; otherwise reconcile by a stable reference before retrying. Browser button disabling does not solve concurrent tabs or worker races.

### 7.5 Original payment captures after status checking

**Cause:** Time-of-check/time-of-use race. A successful status read is stale the instant a later event arrives. A 15-minute timer is not proof of final failure.

**Fix:** Reconcile original order/payment state immediately before action, track provider events continuously, cancel outstanding recovery requests when the original resolves, and retain a post-payment reconciliation path. An external provider and your DB cannot share one atomic transaction. Design compensating actions and explicit uncertainty; do not claim exactly-once charging from local locks alone.

### 7.6 Webhooks are duplicated, delayed, or out of order

**Current gap:** The original handler claims a webhook ID before its full processing succeeds. A later processing error may cause a retry to be ignored. The engine can also accept a stale failed state after a more advanced state.

**Fix:** Use a durable inbox with `received`, `processing`, `processed`, and `failed` states; atomically apply the event and mark it processed. Deduplicate within provider/account scope. Validate signatures against exact raw bytes before parsing. Enforce transition precedence or reconcile authoritative provider state when events conflict. Never assume timestamps alone establish a total order.

### 7.7 API times out after the provider created a link

**Cause:** Provider side effect succeeds but the response or DB save fails. Blind retry duplicates the side effect.

**Fix:** Persist an action intent with a stable reference, call the provider, record response identity, then reconcile unknown outcomes before retrying. A transactional outbox can reliably dispatch intents, but it does not magically make the external API atomic. The current demo provider has no real network side effects; general production handling remains unfinished.

### 7.8 A real recovery webhook cannot be correlated

**Current gap:** The engine recognizes demo recovery payment IDs by a `pay_recovery_` prefix. Actual provider IDs do not satisfy this contract.

**Fix:** Persist a link/order/payment mapping with merchant ownership. Consume and verify the provider's appropriate link/payment events, look up the mapping, and match amount/currency before updating a case. Never infer ownership from a payment-ID prefix or browser-supplied case ID.

### 7.9 Authorization gets counted as captured revenue

**Current gap:** Some engine logic treats `authorized` and `captured` similarly for stopping recovery; duplicate detection can also be overbroad. Authorization is not the same as captured funds or settlement.

**Fix:** Separate “do not request another payment” from “money recovered”. Maintain explicit authorized, captured, refunded, disputed, and settled facts. Recognize revenue/cash metrics according to defined business accounting semantics. The frontend only counts captured states in its two simulated payment totals; it still is not a financial ledger.

### 7.10 Cancellation is assumed to have succeeded

**Cause:** Sending a cancellation request is treated as final even when the provider times out or returns an unexpected status.

**Fix:** Track `cancel_requested`, `cancel_confirmed`, and `cancel_unknown`; retry safely and reconcile provider status. Escalate an unknown outcome. Stop messages separately from link cancellation. No real cancellation behavior was validated in the studio.

### 7.11 A “multi-agent” app races against itself

**Cause:** Each specialist independently writes the case or triggers money actions. More LLM calls create more nondeterminism without a durable coordinator.

**Fix:** Give one orchestrator ownership of legal transitions. Specialists return typed evidence/proposals, not unrestricted payment commands. The deterministic policy service authorizes the action; only the executor holds provider credentials. Store versions, action IDs, trace IDs, and budget limits. Retry work from durable queues with bounded backoff and dead-letter handling.

### 7.12 Demo metrics look convincing but prove nothing

**Current gap:** The earlier batch simulator consults latent scenario outcomes and uses simplifying assumptions. Its duplicate-exposure amount is not observed duplicate charges, and it does not establish real conversion lift.

**Fix:** Separate ground truth from agent inputs; replay held-out event streams through the actual engine; define recovery attribution and observation windows; model waiting costs, contact costs, false positives, and customer behavior; compare against a specified baseline. Real uplift requires properly designed merchant evaluation with permission. Label synthetic evaluation as synthetic and publish assumptions.

### 7.13 Small-screen UI overflows or hides a decision

**Cause:** Fixed-width tables, long identifiers, nowrap labels, nested scroll containers, or missing keyboard focus traps.

**Fix:** Use `minmax(0,1fr)`, mobile case-row reflow, wrapping for identifiers, short button labels, and `overflow-x: clip` at the page level. Native dialog supplies modal focus containment and Escape behavior. Test the drawer at 320px, keyboard-only, and with reduced motion. Do not hide an essential approval action just to make a screenshot fit.

## 8. Scaling into a genuine multi-agent architecture

Keep the payment state machine deterministic. Scale the specialists around it:

1. **Ingestion/observer worker:** verifies and persists provider events; reconciles current status.
2. **Triage specialist:** proposes a failure class with evidence and uncertainty; optional LLM for unstructured descriptions.
3. **Recovery planner:** proposes an intervention under merchant constraints; cannot send it.
4. **Policy guardian:** deterministic checks for tenant, amount, consent, contact cap, approval freshness, and payment state.
5. **Executor:** performs only authorized intents with idempotency/reconciliation; owns provider credentials.
6. **Outcome reconciler:** maps payments back to cases, separates natural resolution from recovery, flags duplicates.
7. **Audit/evaluation pipeline:** records immutable evidence and computes carefully defined metrics.

Use a durable queue partitioned by merchant/order, a transactional database, and a scheduler for observation deadlines. Idempotency and ownership must survive worker restarts. Each specialist should have a typed input/output contract, explicit timeout, retry budget, model cost limit, and fallback to a person. Add agents only where their independent work improves a measurable decision; a set of role names alone is not a scaling architecture.

## 9. Before any public or real-money release

- Add authentication, tenant authorization, least-privilege secrets, rate limiting, and audit access controls.
- Disable/remove public demo mutation routes; do not expose the current API to the internet.
- Replace process-local coordination with durable transactions, inbox/outbox, scheduler, and provider reconciliation.
- Implement real link/payment correlation and ordered/authoritative payment-state handling.
- Confirm test-mode credentials are enforced; prohibit live keys in the demo deployment.
- Establish lawful customer communication consent, opt-out handling, quiet hours, and retention policies with appropriate review. This prototype is not compliance certification.
- Add monitoring, structured logs with PII redaction, backups, recovery drills, and deletion/retention procedures.
- Run provider test-mode integration tests and concurrent/failure-injection tests before a supervised pilot.
- Validate the actual merchant problem with interviews and real workflow observation. The differentiator is evidence-aware recovery and trustworthy control, not the number of agents.

## 10. Design and implementation references

Verification at handoff: 13 backend tests passed, TypeScript passed, and 4 Chrome browser tests passed. Browser coverage includes the recovery/duplicate workflow, JSON export, search, API error feedback, guide download, reduced motion, horizontal-overflow checks at 320/375/414/768/1440px, and automated axe WCAG A/AA checks on the landing page, workspace overview, guide, and an open case drawer. These are automated checks, not a manual screen-reader certification or live-payment audit.

The requested visual reference was `https://tryspar.dev`, but retrieval failed in this environment; the implementation does not claim to reproduce an inspected reference. It follows the user's light/navy/yellow/multi-accent direction and Hallmark's narrative workflow principles.

- [Next.js loading UI and streaming](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)

The frontend lockfile records the exact installed dependency versions. Keep it in version control and use frozen installs for repeatable builds.
