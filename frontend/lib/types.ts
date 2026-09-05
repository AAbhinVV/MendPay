export type CaseState =
  | "failed_detected"
  | "triaged"
  | "observing"
  | "awaiting_approval"
  | "link_issued"
  | "recovery_paid"
  | "original_recovered"
  | "stopped"
  | "expired"
  | "manual_review"
  | "duplicate_payment_detected";
export type RecoveryCase = {
  case_id: string;
  merchant_id: string;
  order_id: string;
  original_payment_id: string;
  amount: number;
  currency: string;
  state: CaseState;
  original_payment_state: string;
  recovery_payment_state: string;
  failure_class: string | null;
  observation_deadline: string | null;
  recovery_link_id: string | null;
  contacts_sent: number;
  customer_opted_out: boolean;
  approved: boolean;
  created_at: string;
  updated_at: string;
  decision: {
    explanation: string;
    reason_codes: string[];
    confidence: number;
    action: string;
  } | null;
  audit: {
    at: string;
    actor: string;
    action: string;
    detail: Record<string, unknown>;
  }[];
};
export type Workspace = {
  cases: RecoveryCase[];
  mode: "simulation";
  error?: string;
};
export const statusInfo: Record<CaseState, { label: string; tone: string }> = {
  failed_detected: { label: "Detected", tone: "red" },
  triaged: { label: "Triaged", tone: "purple" },
  observing: { label: "Observing", tone: "orange" },
  awaiting_approval: { label: "Needs approval", tone: "yellow" },
  link_issued: { label: "Link ready", tone: "purple" },
  recovery_paid: { label: "Recovery paid", tone: "blue" },
  original_recovered: { label: "Original resolved", tone: "blue" },
  stopped: { label: "Stopped", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
  manual_review: { label: "Manual review", tone: "pink" },
  duplicate_payment_detected: { label: "Duplicate detected", tone: "red" },
};
export const money = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
export const humanize = (value: string) => value.replaceAll("_", " ");
