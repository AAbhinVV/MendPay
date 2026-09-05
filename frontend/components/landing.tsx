"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  CornerDownRight,
  Fingerprint,
  LockKeyhole,
  MoveUpRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand } from "./brand";

const stages = [
  {
    label: "Listen first.",
    detail:
      "A failed checkout is a signal, not the whole story. Read the failure reason and the original payment state before deciding what happens next.",
    title: "Payment failed. Or did it?",
    status: "Bank response delayed",
    tone: "orange",
    icon: Clock3,
  },
  {
    label: "Make a considered move.",
    detail:
      "Observe ambiguous payments. Surface clear recovery candidates for your approval. If the evidence is uncertain, send the case to a person.",
    title: "Your approval. Your call.",
    status: "Recovery awaiting approval",
    tone: "yellow",
    icon: Fingerprint,
  },
  {
    label: "Know when to stop.",
    detail:
      "When an original payment resolves, stop the recovery workflow. Record the outcome and keep the full decision trail, including duplicate-payment alerts.",
    title: "One order. One happy ending.",
    status: "Original payment captured",
    tone: "blue",
    icon: CheckCheck,
  },
];

function PaymentStory({
  stage,
  compact = false,
}: {
  stage: number;
  compact?: boolean;
}) {
  const current = stages[stage];
  const Icon = current.icon;
  return (
    <div className={`payment-story ${compact ? "compact" : ""}`}>
      <div className="story-top">
        <span className="sample-label">ILLUSTRATIVE ORDER</span>
        <span className="sample-id">#1042</span>
      </div>
      <div className="receipt-total">
        <span>One very good purchase.</span>
        <strong>
          ₹2,499<span>.00</span>
        </strong>
        <span>Payment lifecycle</span>
      </div>
      <div className="receipt-rule" />
      <div className="story-event">
        <span className="event-icon red">
          <X size={18} />
        </span>
        <div>
          <strong>Checkout interrupted</strong>
          <p>The customer sees “payment failed”.</p>
        </div>
        <span className="event-time">now</span>
      </div>
      <div className="story-connector">
        <span />
        <small>A failure isn’t always final.</small>
      </div>
      <div className={`story-decision ${current.tone}`} key={stage}>
        <Icon size={24} />
        <div>
          <strong>{current.status}</strong>
          <p>
            {stage === 0
              ? "Hold the nudge. Watch the original."
              : stage === 1
                ? "No link issued until you approve."
                : "No second payment request needed."}
          </p>
        </div>
      </div>
      <div className="story-bottom">
        <ShieldCheck size={16} />
        <span>
          {stage === 2
            ? "Recovery stopped · decision recorded"
            : "MendPay is keeping watch"}
        </span>
      </div>
    </div>
  );
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      "(min-width: 800px) and (prefers-reduced-motion: no-preference)",
      () => {
        const sections = gsap.utils.toArray<HTMLElement>(
          ".workflow-step",
          root.current!,
        );
        sections.forEach((section, index) =>
          ScrollTrigger.create({
            trigger: section,
            start: "top 58%",
            end: "bottom 58%",
            onEnter: () => setStage(index),
            onEnterBack: () => setStage(index),
          }),
        );
        gsap.fromTo(
          ".workflow-track-fill",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".workflow-steps",
              start: "top 65%",
              end: "bottom 55%",
              scrub: 0.4,
            },
          },
        );
      },
    );
    return () => media.revert();
  }, []);

  return (
    <div className="landing" ref={root}>
      <header className="landing-header">
        <nav className="nav-pill" aria-label="Main navigation">
          <Brand />
          <div className="nav-links">
            <a href="#how-it-works">How it works</a>
            <Link href="/guide">Field guide</Link>
          </div>
          <Link className="nav-cta" href="/dashboard">
            Open app <MoveUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="hero-label">
              <span className="label-dot" />
              Revenue recovery, with a little more care
            </div>
            <h1>
              A second chance.
              <br />
              <span className="highlight">Not a second</span>
              <br />
              charge<span className="orange-text">.</span>
            </h1>
            <p className="hero-description">
              Recover the sale. Keep the trust. A payment recovery workspace
              that knows when to wait, when to ask, and when to stop.
            </p>
            <div className="hero-actions">
              <Link className="button button-navy" href="/dashboard">
                Explore the workspace <ArrowRight size={18} />
              </Link>
              <a className="text-link" href="#how-it-works">
                Meet the workflow <ArrowDown size={16} />
              </a>
            </div>
            <div className="hero-footnote">
              <LockKeyhole size={14} /> Interactive demo · No real payments or
              messages
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-heading">A smarter next step.</div>
            <div className="receipt-tilt">
              <PaymentStory stage={0} />
            </div>
            <div className="floating-note note-yellow">
              <CornerDownRight size={22} />
              <span>
                Sometimes, the best
                <br />
                follow-up is to wait.
              </span>
            </div>
            <div className="guard-stamp">
              <ShieldCheck size={25} />
              <span>
                Customer trust
                <br />
                <strong>comes first.</strong>
              </span>
            </div>
          </div>
        </section>
        <div className="principles wrap">
          <span>
            Less chasing.
            <br />
            <strong>More considered recovery.</strong>
          </span>
          <span>
            <Clock3 /> Observe before acting
          </span>
          <span>
            <Fingerprint /> Human-approved actions
          </span>
          <span>
            <ShieldCheck /> Every decision, recorded
          </span>
        </div>
        <section className="workflow wrap" id="how-it-works">
          <div className="section-heading">
            <h2>
              Failed doesn’t mean
              <br />
              <span className="muted-heading">finished.</span>
            </h2>
            <p>
              There’s a story between a failed payment and a recovered sale.
              Give every order the right next chapter.
            </p>
          </div>
          <div className="workflow-grid">
            <div className="workflow-steps">
              <div className="workflow-track">
                <div className="workflow-track-fill" />
              </div>
              {stages.map((item, index) => (
                <article
                  className={`workflow-step ${stage === index ? "is-current" : ""}`}
                  key={item.label}
                >
                  <span className={`step-number ${item.tone}`}>
                    0{index + 1}
                  </span>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setStage(index)}
                    aria-pressed={stage === index}
                  >
                    Show this moment <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>
            <div className="workflow-preview">
              <div className="preview-caption">
                <span>Follow the payment</span>
                <span>0{stage + 1} / 03</span>
              </div>
              <h3>{stages[stage].title}</h3>
              <PaymentStory stage={stage} compact />
              <p className="preview-disclaimer">
                Sample scenario · Outcomes are simulated, not live revenue.
              </p>
            </div>
          </div>
        </section>
        <section className="trust-section" id="guardrails">
          <div className="wrap trust-grid">
            <div>
              <span className="trust-mark">
                <LockKeyhole size={36} />
              </span>
              <h2>
                Your revenue.
                <br />
                Their trust.
                <br />
                <span>Both matter.</span>
              </h2>
              <p>
                A recovery tool should explain its decisions, not ask you to
                take a leap of faith.
              </p>
              <Link className="text-link" href="/guide">
                Under the hood <ArrowRight size={18} />
              </Link>
            </div>
            <div className="guardrail-list">
              <article>
                <span>01</span>
                <div>
                  <h3>Permission before payment.</h3>
                  <p>
                    Review a recovery case before a link is issued. The amount
                    stays tied to the original order.
                  </p>
                </div>
                <Check size={20} />
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Uncertainty gets a human.</h3>
                  <p>
                    Unknown failures go to manual review. A confident-sounding
                    explanation is not a payment guarantee.
                  </p>
                </div>
                <Check size={20} />
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>An honest record.</h3>
                  <p>
                    See what happened, which component made the call, and what
                    stopped the workflow.
                  </p>
                </div>
                <Check size={20} />
              </article>
              <div className="prototype-note">
                <span className="pill pink">Prototype, not autopilot</span>
                <p>
                  Real-world recovery needs verified webhooks, durable
                  scheduling, reconciliation, and merchant authentication. The
                  field guide shows the gaps.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="faq wrap">
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
          <div>
            {[
              [
                "Is this moving real money?",
                "No. This frontend opens an isolated simulation workspace. Demo approvals create simulated links, and payment events are triggered by you. No customer is contacted.",
              ],
              [
                "Why not just send another payment link?",
                "A delayed original payment can still resolve. Asking for another payment too soon introduces duplicate-payment risk. MendPay demonstrates observation, approval, and stopping rules around that decision.",
              ],
              [
                "Where does the AI fit?",
                "The existing backend supports optional structured AI triage for uncertain failures. This demo uses deterministic triage for repeatable outcomes. Policy checks—not an LLM—gate recovery actions.",
              ],
              [
                "What can I try in the dashboard?",
                "Load 12 sample cases, filter the queue, inspect a decision, approve a simulated link, or replay a late original payment. Watch the case state and audit trail update together.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="statement-footer">
        <div className="wrap">
          <div className="footer-callout">
            <h2>
              Make the right
              <br />
              <span>next move.</span>
            </h2>
            <Link className="button button-yellow" href="/dashboard">
              Open your workspace <ArrowRight size={20} />
            </Link>
          </div>
          <div className="footer-meta">
            <Brand />
            <span>Built for the revenue recovery track.</span>
            <Link href="/guide">
              Project field guide <MoveUpRight size={16} />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
