# Five-minute pitch script

## 0:00–0:35 — The overlooked problem

“A failed payment is not always final. Razorpay documents that network or processing delays can cause a failed payment to become authorized later. Most recovery flows immediately send another link. That can turn revenue recovery into a double charge, refund, support ticket, and lost trust.”

## 0:35–1:05 — Product promise

“MendPay recovers genuinely failed revenue without asking customers whose original payment is still resolving to pay twice. It optimizes recovery and safety together.”

## 1:05–1:45 — Two cases

Open **Recovery cases**.

- Show the expired-card failure: hard failure, ready for guarded recovery.
- Show the network failure: possible late authorization, placed in observation.
- Point out the evidence, decision, confidence, and audit actors.

## 1:45–2:30 — The agent knows when not to act

Click **Replay late authorization** on the network case.

“The original payment captured during observation. MendPay stops the workflow. No link, no reminder, no duplicate-payment exposure. This refusal is the core safety behavior.”

## 2:30–3:15 — Complete a recovery

Approve the expired-card case and issue a recovery link. In connected mode, open and complete the Razorpay test link; otherwise use **Simulate recovery payment**.

“The amount and order are deterministic, the merchant approves the action, and the executor—not the LLM—calls Razorpay. A captured recovery event closes the workflow.”

## 3:15–3:55 — Measured batch result

Open **Held-out evaluation**.

“The fixed-seed 120-case simulator replays identical payment timelines through an immediate-recovery baseline and MendPay. We preserve simulated recovered revenue while eliminating duplicate exposure and avoiding unnecessary contacts. Every rupee here is explicitly labelled simulated.”

## 3:55–4:35 — Multi-agent architecture

Open **Agent architecture**.

“Triage and late-authorization agents interpret evidence. The Payment Observer owns provider truth. The deterministic Policy Guardian owns consent, amount, status, and contact rules. The Recovery Executor has the only payment-link tool. The Duplicate Guardian watches both payment paths.”

## 4:35–5:00 — Close

“Many systems demonstrate that an agent can act. MendPay demonstrates the harder judgment: when it must wait, when it may recover, and when it must stop. The result is revenue recovery that protects customer trust.”

## Claims discipline

- Say “simulated recovered revenue” for benchmark results.
- Say “duplicate-payment exposure prevented,” not actual refunds saved.
- Say the live/test transaction proves integration, not production uplift.
- Do not claim that an LLM predicts late authorization; it makes a bounded recommendation from available evidence.
