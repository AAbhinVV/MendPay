import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
export const metadata = { title: "Project field guide" };
export default function Guide() {
  return (
    <main id="main" className="guide-page wrap">
      <Brand />
      <h1>The recovery field guide.</h1>
      <p className="guide-lede">
        What MendPay does, how the pieces fit, and what needs to be true
        before a recovery workflow touches real money.
      </p>
      <div className="guide-links">
        <a className="button button-navy" href="/api/guide">
          <ArrowDownToLine size={18} />
          Download the full guide
        </a>
        <Link className="text-link" href="/dashboard">
          Open the workspace <ArrowRight size={18} />
        </Link>
      </div>
      <section>
        <h2>The idea in one sentence.</h2>
        <p>
          MendPay is a payment recovery prototype that treats “wait” and
          “stop” as useful outcomes—not just “send another link”. It classifies
          a failure, observes ambiguous payments, requests approval for a
          recovery action, and records the result.
        </p>
      </section>
      <section>
        <h2>The end-to-end journey.</h2>
        <ol>
          <li>
            <strong>Understand the product.</strong> The landing page follows a
            sample order through detection, decision, and resolution.
          </li>
          <li>
            <strong>Load a safe workspace.</strong> Twelve sample cases are
            generated through the real Python workflow engine, using an isolated
            simulated provider.
          </li>
          <li>
            <strong>Find the next decision.</strong> Filter by approval,
            observation, resolved cases, or manual review. Search by order
            number or failure reason.
          </li>
          <li>
            <strong>Read the evidence.</strong> Open a case for its original
            classification, current payment states, reason codes, and
            chronological audit trail.
          </li>
          <li>
            <strong>Approve or wait.</strong> Approve a simulated recovery link,
            advance the observation window, or simulate the original payment
            resolving.
          </li>
          <li>
            <strong>Close the loop.</strong> Record a simulated recovery
            capture. Replay a late original capture to test the
            duplicate-payment warning. Export the audit as JSON.
          </li>
        </ol>
      </section>
      <section>
        <h2>How the app is built.</h2>
        <p>
          <code>Next.js / React</code> renders the landing page and interactive
          dashboard. React Suspense streams the workspace when its API data
          resolves; a local shadcn Skeleton fills the wait.{" "}
          <code>GSAP ScrollTrigger</code> ties the landing workflow to
          scrolling, with a reduced-motion fallback.
        </p>
        <p style={{ marginTop: 16 }}>
          Next.js proxies an allowlisted set of same-origin requests to{" "}
          <code>FastAPI</code>. The studio router scopes cases to a dedicated
          demo merchant and uses a simulated payment provider. The existing
          recovery engine runs the decisions; SQLite stores case snapshots and
          their audit records.
        </p>
      </section>
      <section id="limitations">
        <h2>What this prototype does not prove.</h2>
        <div className="guide-callout">
          <p>
            <strong>No real money moves in this workspace.</strong> Demo
            outcomes are not merchant performance metrics, and a fixed
            observation window cannot guarantee that an original payment will
            never resolve later.
          </p>
        </div>
        <ul>
          <li>
            The original backend has no production authentication or tenant
            authorization. Do not expose it publicly.
          </li>
          <li>
            The demo controls advance time manually. Durable background
            scheduling is not implemented.
          </li>
          <li>
            A process-local lock protects demo actions only within one API
            process. Distributed workers need database transactions and durable
            idempotency.
          </li>
          <li>
            Real recovery-payment correlation, out-of-order webhook handling,
            cancellation reconciliation, and failure recovery need further
            implementation.
          </li>
          <li>
            The optional AI integration is a triage component, not an
            independently deployed multi-agent system. The studio uses
            deterministic decisions.
          </li>
          <li>
            The earlier batch simulator uses simplifying assumptions and must
            not be presented as a causal revenue benchmark.
          </li>
        </ul>
      </section>
      <section>
        <h2>Build it with your eyes open.</h2>
        <p>
          The downloadable guide covers setup, the manual build sequence,
          state-machine design, agent boundaries, testing, and low-level fixes
          for the production gaps. It distinguishes what runs today from the
          architecture you would add next.
        </p>
        <a className="text-link" href="/api/guide">
          Read the complete project guide <ArrowUpRight size={18} />
        </a>
      </section>
    </main>
  );
}
