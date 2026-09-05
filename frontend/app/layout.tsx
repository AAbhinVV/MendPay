import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MendPay — A second chance. Not a second charge.",
    template: "%s · MendPay",
  },
  description:
    "A payment recovery workspace that knows when to wait, when to ask, and when to stop. Explore the MendPay prototype.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
