import Link from "next/link";
import { MoveUpRight } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="MendPay home">
      <span className="brand-mark">
        <MoveUpRight aria-hidden="true" size={22} />
      </span>
      {!compact && (
        <span>
          safe<span className="brand-light">recover</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
