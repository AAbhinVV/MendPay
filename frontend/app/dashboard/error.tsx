"use client";
import Link from "next/link";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-page wrap">
      <h1>The workspace couldn’t load.</h1>
      <p>
        Check that the local recovery API is running, then reload this view.
      </p>
      <button className="button button-navy" onClick={reset}>
        Reload workspace
      </button>
      <Link className="text-link" href="/">
        Back to home
      </Link>
    </main>
  );
}
