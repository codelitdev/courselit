import { ContactEditor } from "@/components/contact-editor";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ contactId: string }>;
  searchParams: Promise<{ learnerId?: string | string[] }>;
}) {
  const { contactId } = await params;
  const { learnerId } = await searchParams;
  return (
    <ContactEditor
      contactId={contactId}
      learnerId={Array.isArray(learnerId) ? learnerId[0] : learnerId}
    />
  );
}
