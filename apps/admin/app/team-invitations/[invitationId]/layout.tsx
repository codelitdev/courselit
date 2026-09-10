import type { ReactNode } from "react";

export const metadata = {
  referrer: "no-referrer",
};

export default function TeamInvitationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <meta name="referrer" content="no-referrer" />
      {children}
    </>
  );
}
