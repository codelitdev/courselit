import { ContactEditor } from "@/components/contact-editor";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  return <ContactEditor contactId={contactId} />;
}
