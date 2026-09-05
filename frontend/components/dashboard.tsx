"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Fingerprint,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Brand } from "./brand";
import {
  humanize,
  money,
  RecoveryCase,
  statusInfo,
  Workspace,
} from "@/lib/types";
import { WorkspaceSkeleton } from "./workspace-skeleton";

type View = "overview" | "queue" | "audit" | "guardrails";
const viewTitles: Record<View, string> = {
  overview: "A little less chasing.",
  queue: "Every case. A considered next step.",
  audit: "Nothing behind the curtain.",
  guardrails: "Care, written into the rules.",
};
const filters = [
  "All cases",
  "Needs approval",
  "Observing",
  "Recovered",
  "Review",
];
const dateTime = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
export function Status({ item }: { item: RecoveryCase }) {
  const info = statusInfo[item.state];
  return (
    <span className={`pill ${info.tone}`}>
      <span className="status-dot" />
      {info.label}
    </span>
  );
}

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-frame">
      <div className="dashboard-loading-brand">
        <Brand />
      </div>
      <main id="main" className="loading-main">
        <p className="overline">SIMULATED WORKSPACE</p>
        <h1>Getting your workspace ready.</h1>
        {children}
      </main>
    </div>
  );
}

export function Dashboard({ initial }: { initial: Workspace }) {
  const [data, setData] = useState(initial);
  const [view, setView] = useState<View>("overview");
  const [filter, setFilter] = useState("All cases");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(initial.error || "");
  const dialog = useRef<HTMLDialogElement>(null);
  const actionLock = useRef(false);
  const cases = data.cases;
  const selected = cases.find((c) => c.case_id === selectedId);
  const recovered = cases.filter(
    (c) =>
      c.state === "recovery_paid" && c.recovery_payment_state === "captured",
  );
  const originals = cases.filter(
    (c) =>
      c.state === "original_recovered" &&
      c.original_payment_state === "captured",
  );
  const approval = cases.filter((c) => c.state === "awaiting_approval");
  const observing = cases.filter((c) => c.state === "observing");
  const review = cases.filter((c) =>
    ["manual_review", "duplicate_payment_detected"].includes(c.state),
  );
  const nextCase = approval[0] || observing[0] || review[0] || cases[0];
  const sum = (items: RecoveryCase[]) =>
    items.reduce((total, c) => total + c.amount, 0);

  const request = useCallback(async (path: string, method = "POST") => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(path || "refresh");
    setError("");
    try {
      const response = await fetch(`/api/studio${path}`, { method });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "The action was rejected. Refresh this case before retrying.",
        );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The workspace could not update. Check your connection and refresh.",
      );
    } finally {
      setBusy("");
      actionLock.current = false;
    }
  }, []);

  useEffect(() => {
    if (selectedId && !dialog.current?.open) dialog.current?.showModal();
  }, [selectedId]);

  const close = () => {
    dialog.current?.close();
    setSelectedId(null);
  };
  const openCase = (item: RecoveryCase) => {
    setError("");
    setSelectedId(item.case_id);
  };
  const changeView = (next: View) => {
    setView(next);
    setFilter("All cases");
    setQuery("");
  };
  const filtered = cases.filter((c) => {
    const matches =
      `${c.order_id} ${c.case_id} ${c.decision?.reason_codes.join(" ")} ${statusInfo[c.state].label}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const group =
      filter === "All cases" ||
      (filter === "Needs approval" && c.state === "awaiting_approval") ||
      (filter === "Observing" && c.state === "observing") ||
      (filter === "Recovered" &&
        ["recovery_paid", "original_recovered"].includes(c.state)) ||
      (filter === "Review" &&
        ["manual_review", "duplicate_payment_detected"].includes(c.state));
    return matches && group;
  });
  const exportAudit = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            mode: "simulation",
            exported_at: new Date().toISOString(),
            cases: cases.map((c) => ({
              case_id: c.case_id,
              order_id: c.order_id,
              state: c.state,
              audit: c.audit,
            })),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "saferecover-demo-audit.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Brand />
        <div className="merchant-switch">
          <span className="merchant-avatar">D</span>
          <span>
            <strong>Demo merchant</strong>
            <small>MendPay sandbox</small>
          </span>
          <LockKeyhole size={14} />
        </div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav aria-label="Workspace">
          {(
            [
              ["overview", "Overview", LayoutDashboard],
              ["queue", "Recovery queue", ListFilter],
              ["audit", "Audit trail", Activity],
              ["guardrails", "Guardrails", ShieldCheck],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              className={`side-link ${view === key ? "active" : ""}`}
              onClick={() => changeView(key)}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "queue" && cases.length > 0 && (
                <span className="nav-count">{cases.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-note">
            <span className="tiny-sun" aria-hidden="true" />
            <strong>A safe place to try.</strong>
            <p>All payments and outcomes in this workspace are simulated.</p>
            <Link href="/guide">
              Read the field guide <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="side-link" href="/">
            <ArrowUpRight size={18} />
            Back to the big picture
          </Link>
        </div>
      </aside>
      <div className="dashboard-body">
        <header className="dashboard-topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "queue" ? "Recovery queue" : humanize(view)}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="simulation-badge">
              <span />
              Simulation mode
            </span>
            <Link
              className="icon-button"
              href="/guide"
              aria-label="Open project guide"
            >
              <CircleHelp size={20} />
            </Link>
            <span
              className="profile-avatar"
              title="Demo workspace, not a signed-in account"
            >
              D
            </span>
          </div>
        </header>
        <main className="dashboard-main" id="main">
          <div className="dashboard-heading">
            <div>
              <p className="dashboard-kicker">YOUR RECOVERY WORKSPACE</p>
              <h1>{viewTitles[view]}</h1>
              <p>
                {view === "overview"
                  ? "Keep the revenue moving. Keep the customer in mind."
                  : "Simulated cases, visible decisions, and a complete local audit trail."}
              </p>
            </div>
            <div className="dashboard-actions">
              <button
                className="icon-button bordered"
                aria-label="Refresh workspace"
                disabled={!!busy}
                onClick={() => request("", "GET")}
              >
                <RefreshCw
                  size={18}
                  className={busy === "refresh" ? "spin" : ""}
                />
              </button>
              <button
                className="button button-navy small"
                disabled={!!busy}
                onClick={() => request("/seed")}
              >
                <Zap size={16} />
                {busy === "/seed"
                  ? "Loading samples…"
                  : cases.length
                    ? "Load missing samples"
                    : "Load sample cases"}
              </button>
            </div>
          </div>
          <div className="demo-notice">
            <ShieldCheck size={16} />
            <span>
              A hands-on prototype. Amounts below represent simulated payments,
              not actual money recovered.
            </span>
            <Link href="/guide#limitations">
              Know the limits <ArrowUpRight size={14} />
            </Link>
          </div>
          {error && !selected && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() => request("", "GET")}
              >
                Refresh
              </button>
            </div>
          )}
          {busy === "/seed" && cases.length === 0 ? (
            <WorkspaceSkeleton />
          ) : (
            <>
              {view === "overview" && (
                <>
                  <section
                    className="metric-grid"
                    aria-label="Simulated outcomes"
                  >
                    <article className="metric metric-highlight">
                      <div className="metric-label">
                        Recovery payments <ArrowUpRight size={18} />
                      </div>
                      <strong>{money(sum(recovered))}</strong>
                      <p>{recovered.length} captured via recovery links</p>
                      <span className="metric-decoration" aria-hidden="true">
                        ↗
                      </span>
                    </article>
                    <article className="metric">
                      <div className="metric-label">
                        Originals resolved <CheckCheck size={18} />
                      </div>
                      <strong>{money(sum(originals))}</strong>
                      <p>
                        {originals.length} captured without a second payment
                      </p>
                    </article>
                    <article className="metric">
                      <div className="metric-label">
                        Awaiting your approval <Fingerprint size={18} />
                      </div>
                      <strong>
                        {approval.length.toString().padStart(2, "0")}
                      </strong>
                      <p>{money(sum(approval))} in recovery candidates</p>
                    </article>
                    <article className="metric">
                      <div className="metric-label">
                        Under observation <Clock3 size={18} />
                      </div>
                      <strong>
                        {observing.length.toString().padStart(2, "0")}
                      </strong>
                      <p>Waiting on the original payment</p>
                    </article>
                  </section>
                  <div className="overview-panels">
                    <section className="distribution">
                      <div className="panel-title">
                        <h2>A pulse on your queue.</h2>
                        <span className="subtle-label">
                          {cases.length} sample cases
                        </span>
                      </div>
                      <div
                        className="distribution-bar"
                        role="img"
                        aria-label={`Case distribution: ${recovered.length + originals.length} resolved, ${approval.length} awaiting approval, ${observing.length} observing, ${review.length} for review, ${cases.filter((c) => c.state === "link_issued").length} links ready`}
                      >
                        {[
                          {
                            n: recovered.length + originals.length,
                            cls: "bar-blue",
                          },
                          { n: approval.length, cls: "bar-yellow" },
                          { n: observing.length, cls: "bar-orange" },
                          { n: review.length, cls: "bar-pink" },
                          {
                            n: cases.filter((c) => c.state === "link_issued")
                              .length,
                            cls: "bar-purple",
                          },
                        ]
                          .filter((s) => s.n > 0)
                          .map((s) => (
                            <div
                              key={s.cls}
                              className={s.cls}
                              style={{ flex: s.n }}
                            />
                          ))}
                      </div>
                      <div className="distribution-key">
                        {[
                          [
                            "blue",
                            "Resolved",
                            recovered.length + originals.length,
                          ],
                          ["yellow", "Approval", approval.length],
                          ["orange", "Observing", observing.length],
                          ["pink", "Review", review.length],
                          [
                            "purple",
                            "Link ready",
                            cases.filter((c) => c.state === "link_issued")
                              .length,
                          ],
                        ].map(([tone, label, count]) => (
                          <span key={tone}>
                            <i
                              aria-hidden="true"
                              className={`key-dot ${tone}`}
                            />
                            {label}
                            <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    </section>
                    <section className="next-move">
                      <span className="next-move-icon">
                        <ArrowUpRight size={22} />
                      </span>
                      <div>
                        <h2>
                          {approval.length
                            ? `${approval.length} ${approval.length === 1 ? "decision" : "decisions"}. Your call.`
                            : nextCase ? "Follow the evidence." : "Start with a sample."}
                        </h2>
                        <p>
                          {approval.length
                            ? "Review the reason before you release a recovery link."
                            : nextCase ? "Inspect the next observation or outcome in your queue." : "Load the workspace and follow a payment from failure to outcome."}
                        </p>
                        <button
                          className="text-link"
                          disabled={!!busy}
                          onClick={() =>
                            nextCase
                              ? openCase(nextCase)
                              : request("/seed")
                          }
                        >
                          {nextCase
                            ? "Review a case"
                            : "Load sample cases"}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {(view === "overview" || view === "queue") && (
                <section className="queue-section">
                  <div className="panel-title">
                    <div>
                      <h2>
                        {view === "overview"
                          ? "The recovery queue"
                          : "All recovery cases"}
                      </h2>
                      <p>Different failures. Different next steps.</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={exportAudit}
                      disabled={!cases.length}
                    >
                      <ArrowDownToLine size={16} />
                      Export audit
                    </button>
                  </div>
                  <div className="queue-toolbar">
                    <div
                      className="filter-list"
                      aria-label="Filter recovery cases"
                    >
                      {filters.map((label) => (
                        <button
                          key={label}
                          aria-pressed={filter === label}
                          className={filter === label ? "selected" : ""}
                          onClick={() => setFilter(label)}
                        >
                          {label}
                          {label === "Needs approval" &&
                            approval.length > 0 && (
                              <span>{approval.length}</span>
                            )}
                        </button>
                      ))}
                    </div>
                    <label className="search-field">
                      <span className="sr-only">
                        Search orders or failure reasons
                      </span>
                      <Search size={17} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search orders…"
                      />
                      {query && (
                        <button
                          className="search-clear"
                          aria-label="Clear search"
                          onClick={() => setQuery("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                  </div>
                  {cases.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">
                        <ListFilter size={28} />
                      </span>
                      <h3>A fresh start for your revenue.</h3>
                      <p>
                        Load 12 sample cases to explore approvals, late
                        payments, and recovery outcomes.
                      </p>
                      <button
                        className="button button-navy"
                        disabled={!!busy}
                        onClick={() => request("/seed")}
                      >
                        Load sample cases <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="empty-state">
                      <Search size={28} />
                      <h3>No cases match this view.</h3>
                      <p>Try another order number or clear the filters.</p>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setQuery("");
                          setFilter("All cases");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="case-table">
                      <div className="table-head">
                        <span>Order / failure reason</span>
                        <span>Amount</span>
                        <span>Status</span>
                        <span>Next step</span>
                      </div>
                      {filtered.map((item) => (
                        <button
                          className="case-row"
                          key={item.case_id}
                          onClick={() => openCase(item)}
                          aria-label={`Open order ${item.order_id.replace("order_demo_", "")} — ${statusInfo[item.state].label}`}
                        >
                          <div className="order-cell">
                            <span
                              className={`order-icon ${statusInfo[item.state].tone}`}
                            >
                              {item.state === "observing" ? (
                                <Clock3 size={18} />
                              ) : item.state.includes("paid") ||
                                item.state === "original_recovered" ? (
                                <Check size={18} />
                              ) : item.state === "awaiting_approval" ? (
                                <Fingerprint size={18} />
                              ) : (
                                <Activity size={18} />
                              )}
                            </span>
                            <div>
                              <strong>
                                #{item.order_id.replace("order_demo_", "")}
                              </strong>
                              <small>
                                {humanize(
                                  item.decision?.reason_codes[0] ||
                                    item.failure_class ||
                                    "Payment failure",
                                )}
                              </small>
                            </div>
                          </div>
                          <strong className="amount-cell">
                            {money(item.amount, item.currency)}
                          </strong>
                          <div>
                            <Status item={item} />
                          </div>
                          <span className="row-action">
                            {item.state === "awaiting_approval"
                              ? "Review & approve"
                              : item.state === "observing"
                                ? "View observation"
                                : "View case"}
                            <ArrowUpRight size={16} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="queue-footer">
                    <span aria-live="polite">
                      Showing {filtered.length} of {cases.length} cases
                    </span>
                    <span>Stored locally · Refresh to sync</span>
                  </div>
                </section>
              )}
              {view === "audit" && (
                <section className="audit-page">
                  <div className="panel-title">
                    <h2>Decision history</h2>
                    <button
                      className="button button-outline small"
                      disabled={!cases.length}
                      onClick={exportAudit}
                    >
                      <ArrowDownToLine size={16} />
                      Export JSON
                    </button>
                  </div>
                  <p>
                    Each event comes from the backend. Times shown in IST. Seed
                    events are created when the samples are loaded.
                  </p>
                  {cases.length === 0 ? (
                    <div className="empty-state">
                      <Activity />
                      <h3>No events yet.</h3>
                      <p>
                        Load sample cases to see how decisions are recorded.
                      </p>
                    </div>
                  ) : (
                    cases
                      .flatMap((c) =>
                        c.audit.map((a, index) => ({
                          ...a,
                          caseItem: c,
                          index,
                        })),
                      )
                      .sort((a, b) => b.at.localeCompare(a.at))
                      .map((a, i) => (
                        <div
                          className="global-audit-row"
                          key={`${a.caseItem.case_id}-${a.index}`}
                        >
                          <span
                            className={`audit-node ${i === 0 ? "purple" : ""}`}
                          >
                            <Activity size={14} />
                          </span>
                          <div>
                            <strong>{humanize(a.action)}</strong>
                            <p>
                              {humanize(a.actor)} · {dateTime(a.at)} IST
                            </p>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => openCase(a.caseItem)}
                          >
                            #{a.caseItem.order_id.replace("order_demo_", "")}
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      ))
                  )}
                </section>
              )}
              {view === "guardrails" && (
                <section className="guardrails-page">
                  <div className="guardrails-intro">
                    <ShieldCheck size={40} />
                    <h2>Rules before recovery.</h2>
                    <p>
                      These controls describe the current prototype. They are
                      read-only here; changing a payment policy should be a
                      reviewed backend change.
                    </p>
                  </div>
                  {[
                    [
                      "Merchant approval",
                      "Required",
                      "Only cases awaiting approval can issue a simulated recovery link.",
                    ],
                    [
                      "Observation window",
                      "15 minutes",
                      "Ambiguous bank failures are observed. In this demo, you explicitly advance time; there is no background scheduler.",
                    ],
                    [
                      "Contact cap",
                      "2 maximum",
                      "The engine checks a contact cap. The demo issues one simulated link; it does not send messages or demonstrate a second contact.",
                    ],
                    [
                      "Uncertain evidence",
                      "Manual review",
                      "Unknown failures in this workspace stay with a person. No AI decision overrides a policy check.",
                    ],
                    [
                      "Original payment resolves",
                      "Stop recovery",
                      "A successful original payment stops recovery; a simulated outstanding link is cancelled.",
                    ],
                    [
                      "Double capture",
                      "Flag, don’t refund",
                      "A duplicate-payment event is surfaced for review. No automatic refund is implemented.",
                    ],
                  ].map(([title, value, body]) => (
                    <article className="policy-row" key={title}>
                      <span className="policy-check">
                        <LockKeyhole size={18} />
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </div>
                      <span className="pill neutral">{value}</span>
                    </article>
                  ))}
                  <Link className="text-link" href="/guide#limitations">
                    Read production gaps <ArrowRight size={16} />
                  </Link>
                </section>
              )}
            </>
          )}
          <footer className="dashboard-footer">
            <span>
              <ShieldCheck size={14} />
              Considered recovery, by design.
            </span>
            <span>MendPay · Local prototype</span>
          </footer>
        </main>
      </div>
      <dialog
        className="case-drawer"
        ref={dialog}
        onClose={() => setSelectedId(null)}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        aria-labelledby="case-title"
      >
        {selected && (
          <div className="drawer-content">
            <div className="drawer-header">
              <div>
                <span className="overline">RECOVERY CASE</span>
                <h2 id="case-title">
                  Order #{selected.order_id.replace("order_demo_", "")}
                </h2>
              </div>
              <button
                className="icon-button bordered"
                aria-label="Close case"
                onClick={close}
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-summary">
              <strong>{money(selected.amount, selected.currency)}</strong>
              <Status item={selected} />
            </div>
            <p className="drawer-id">{selected.case_id} · Simulated payment</p>
            <section className="decision-explanation">
              <span className="decision-label">
                <Fingerprint size={18} />
                Why this next step?
              </span>
              <p>
                {selected.decision?.explanation || "No decision recorded yet."}
              </p>
              <div>
                {selected.decision?.reason_codes.map((reason) => (
                  <code key={reason}>{reason}</code>
                ))}
              </div>
              <small>
                Original classification shown. Current state reflects subsequent
                events.
              </small>
            </section>
            <dl className="case-facts">
              <div>
                <dt>Original payment</dt>
                <dd>{humanize(selected.original_payment_state)}</dd>
              </div>
              <div>
                <dt>Recovery payment</dt>
                <dd>{humanize(selected.recovery_payment_state)}</dd>
              </div>
              <div>
                <dt>Merchant approval</dt>
                <dd>{selected.approved ? "Recorded" : "Not yet given"}</dd>
              </div>
              <div>
                <dt>Customer messages</dt>
                <dd>None · simulated workspace</dd>
              </div>
            </dl>
            {error && (
              <div className="error-banner" role="alert">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}
            <section className="case-actions">
              <h3>
                {selected.state === "awaiting_approval"
                  ? "You make the next move."
                  : "Explore this moment."}
              </h3>
              <p className="action-helper">
                Demo controls only. No customer is contacted and no money moves.
              </p>
              {selected.state === "awaiting_approval" && (
                <>
                  <button
                    autoFocus
                    className="button button-navy"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/approve`)
                    }
                  >
                    {busy
                      ? "Updating case…"
                      : `Approve ${money(selected.amount)} demo link`}
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="button button-outline"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/original-paid`)
                    }
                  >
                    Simulate original captured <CheckCheck size={16} />
                  </button>
                </>
              )}
              {selected.state === "observing" && (
                <>
                  <button
                    className="button button-navy"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/original-paid`)
                    }
                  >
                    Simulate original captured <CheckCheck size={16} />
                  </button>
                  <button
                    className="button button-outline"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/observe`)
                    }
                  >
                    Advance observation window <Clock3 size={16} />
                  </button>
                </>
              )}
              {selected.state === "link_issued" && (
                <>
                  <div className="demo-link">
                    <LockKeyhole size={16} />
                    <span>
                      {selected.recovery_link_id}
                      <small>
                        Simulated link · deliberately not a real checkout URL
                      </small>
                    </span>
                  </div>
                  <button
                    className="button button-navy"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/recovery-paid`)
                    }
                  >
                    Simulate recovery captured <Check size={16} />
                  </button>
                  <button
                    className="button button-outline"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/original-paid`)
                    }
                  >
                    Simulate late original payment
                  </button>
                </>
              )}
              {selected.state === "recovery_paid" && (
                <>
                  <p className="resolved-message">
                    <CheckCheck size={20} />
                    Recovery capture recorded in this simulation.
                  </p>
                  <button
                    className="button button-outline danger"
                    disabled={!!busy}
                    onClick={() =>
                      request(`/cases/${selected.case_id}/duplicate`)
                    }
                  >
                    Test a duplicate-payment event
                  </button>
                </>
              )}
              {selected.state === "original_recovered" && (
                <p className="resolved-message">
                  <ShieldCheck size={20} />
                  The original payment resolved. Recovery is stopped.
                </p>
              )}
              {selected.state === "manual_review" && (
                <p className="review-message">
                  <AlertTriangle size={20} />
                  Evidence is uncertain. A merchant must investigate; automated
                  recovery is blocked.
                </p>
              )}
              {selected.state === "duplicate_payment_detected" && (
                <p className="review-message">
                  <AlertTriangle size={20} />
                  Both payments were captured in this simulation. Investigate
                  and reconcile; no refund is performed.
                </p>
              )}
              <span className="sr-only" role="status">
                {busy ? "Updating the simulated case" : ""}
              </span>
            </section>
            <section className="case-audit">
              <h3>
                The decision trail <span>{selected.audit.length} events</span>
              </h3>
              <ol>
                {selected.audit.map((event, i) => (
                  <li key={`${event.at}-${i}`}>
                    <span className="audit-node">
                      <Check size={12} />
                    </span>
                    <div>
                      <strong>{humanize(event.action)}</strong>
                      <p>
                        {humanize(event.actor)} · {dateTime(event.at)} IST
                      </p>
                      {Object.keys(event.detail).length > 0 && (
                        <details>
                          <summary>Event details</summary>
                          <pre>{JSON.stringify(event.detail, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </dialog>
    </div>
  );
}
