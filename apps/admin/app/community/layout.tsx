import { CommunityAdmin } from "@/components/communities/community-admin";

/**
 * The community screen lives in the layout so switching between Details,
 * Members and Reports keeps it mounted; the pages only select the section.
 */
export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommunityAdmin />
      {children}
    </>
  );
}
