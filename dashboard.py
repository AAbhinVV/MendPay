from __future__ import annotations

import os
from datetime import timedelta

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

from saferecover.engine import RecoveryEngine
from saferecover.llm import OpenAITriageAgent
from saferecover.models import PaymentEvent, PaymentState, utc_now
from saferecover.razorpay_client import RazorpayPaymentLinkProvider
from saferecover.simulator import evaluate_policies, generate_scenarios

load_dotenv()


st.set_page_config(page_title="MendPay", page_icon="🛡️", layout="wide")

st.markdown(
    """
    <style>
      .stApp { background: #0b0c10; color: #f4efe6; }
      [data-testid="stMetric"] { background: #15171d; border: 1px solid #2c3039; padding: 18px; border-radius: 14px; }
      .safe-card { background:#15171d; border:1px solid #2c3039; border-radius:14px; padding:18px; }
      .eyebrow { color:#e7aa4c; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
      .muted { color:#a5aab5; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="eyebrow">Revenue recovery · safety first</div>', unsafe_allow_html=True)
st.title("MendPay")
st.caption("Recover genuinely failed payments without asking late-authorizing customers to pay twice.")

if "engine" not in st.session_state:
    triage_agent = OpenAITriageAgent() if os.getenv("OPENAI_API_KEY") else None
    link_provider = None
    if os.getenv("SAFERECOVER_DEMO_MODE", "true").lower() == "false" and os.getenv("RAZORPAY_KEY_ID"):
        link_provider = RazorpayPaymentLinkProvider()
    st.session_state.engine = RecoveryEngine(link_provider=link_provider, triage_agent=triage_agent)
if "cases" not in st.session_state:
    engine = st.session_state.engine
    transient = PaymentEvent(
        event_id="evt_network_001",
        event_type="payment.failed",
        order_id="order_late_001",
        payment_id="pay_original_late",
        amount=849900,
        status=PaymentState.FAILED,
        error_source="bank",
        error_step="payment_authentication",
        error_reason="network_error",
        error_description="The bank did not respond before timeout.",
    )
    hard = PaymentEvent(
        event_id="evt_card_002",
        event_type="payment.failed",
        order_id="order_hard_002",
        payment_id="pay_original_hard",
        amount=249900,
        status=PaymentState.FAILED,
        error_source="customer",
        error_step="payment_authentication",
        error_reason="card_expired",
        error_description="The card has expired.",
    )
    st.session_state.cases = [engine.create_case(transient), engine.create_case(hard)]

scenarios = generate_scenarios()
evaluation = evaluate_policies(scenarios)
safe = evaluation["MendPay"]
baseline = evaluation["Immediate baseline"]

cols = st.columns(4)
cols[0].metric("Simulated revenue recovered", f"₹{safe['recovered_rupees']:,.0f}")
cols[1].metric("Duplicate value prevented", f"₹{safe['duplicate_value_prevented_rupees']:,.0f}")
cols[2].metric("Unsafe exposure", "₹0", f"-₹{baseline['duplicate_exposure_rupees']:,.0f} vs baseline")
cols[3].metric("Contacts avoided", int(baseline["contacts"] - safe["contacts"]))

overview, cases_tab, evaluation_tab, architecture_tab = st.tabs(
    ["Control room", "Recovery cases", "Held-out evaluation", "Agent architecture"]
)

with overview:
    st.subheader("The payment race")
    st.markdown(
        """
        <div class="safe-card">
        <b>Failure webhook</b> → triage → <b>observe risky failures</b> → recheck original payment →
        merchant approval → recovery link → monitor both payments → stop or detect duplicate.
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.info("MendPay optimizes two outcomes together: recovered revenue and duplicate-charge prevention.")
    state_counts = pd.Series([case.state.value for case in st.session_state.cases]).value_counts()
    st.bar_chart(state_counts)

with cases_tab:
    for index, case in enumerate(st.session_state.cases):
        with st.expander(f"{case.order_id} · ₹{case.amount_rupees:,.2f} · {case.state.value}", expanded=True):
            left, right = st.columns([2, 1])
            with left:
                st.write(case.decision.explanation if case.decision else "No decision")
                st.code(" → ".join(event.action for event in case.audit), language=None)
            with right:
                st.metric("Confidence", f"{(case.decision.confidence if case.decision else 0):.0%}")
                st.write("Reasons:", ", ".join(case.decision.reason_codes if case.decision else []))

            if case.state.value == "observing":
                if st.button("Replay late authorization", key=f"late_{index}", type="primary"):
                    st.session_state.engine.apply_payment_update(
                        case,
                        payment_id=case.original_payment_id,
                        state=PaymentState.CAPTURED,
                        event_id=f"evt_late_{index}",
                    )
                    st.rerun()
                if st.button("Expire observation safely", key=f"expire_{index}"):
                    case.observation_deadline = utc_now() - timedelta(seconds=1)
                    st.session_state.engine.observation_expired(case)
                    st.rerun()
            elif case.state.value == "awaiting_approval":
                if st.button("Approve guarded recovery", key=f"approve_{index}", type="primary"):
                    st.session_state.engine.approve_and_issue_link(case)
                    st.rerun()
            elif case.state.value == "link_issued":
                st.success(f"Demo payment link: {case.recovery_link_url}")
                if st.button("Simulate recovery payment", key=f"recover_{index}", type="primary"):
                    st.session_state.engine.apply_payment_update(
                        case,
                        payment_id=f"pay_recovery_{index}",
                        state=PaymentState.CAPTURED,
                        event_id=f"evt_recovered_{index}",
                    )
                    st.rerun()

with evaluation_tab:
    st.caption("Fixed-seed simulated cohort; amounts are not claimed as real revenue.")
    frame = pd.DataFrame(evaluation).T.reset_index(names="Policy")
    st.dataframe(frame, width="stretch", hide_index=True)
    chart = frame.set_index("Policy")[["duplicate_exposure_rupees", "duplicate_value_prevented_rupees"]]
    st.bar_chart(chart)

with architecture_tab:
    st.markdown(
        """
        **Case Orchestrator** coordinates typed agents:

        `Triage Agent → Late-Authorization Agent → Payment Observer → Policy Guardian → Recovery Executor → Duplicate Guardian → Outcome Agent`

        The model may interpret ambiguous evidence. Deterministic code owns money, payment status, deadlines, and external actions.
        """
    )

with st.sidebar:
    st.header("Demo controls")
    st.write("Mode", "Demo" if os.getenv("SAFERECOVER_DEMO_MODE", "true").lower() == "true" else "Connected")
    if st.button("Reset demo"):
        del st.session_state.cases
        st.rerun()
