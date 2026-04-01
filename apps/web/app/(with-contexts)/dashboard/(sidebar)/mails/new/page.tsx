import DashboardContent from "@components/admin/dashboard-content";
import { Button } from "@/components/ui/button";
import NewMailPageClient from "./new-mail-page-client";
import Link from "next/link";
import {
    BROADCASTS,
    BUTTON_CANCEL_TEXT,
    PAGE_HEADER_CHOOSE_TEMPLATE,
    PAGE_HEADER_EDIT_SEQUENCE,
    SEQUENCES,
    TEMPLATES,
} from "@ui-config/strings";

const MAIL_KIND_BROADCAST = "broadcast";
const MAIL_KIND_SEQUENCE = "sequence";
const MAIL_KIND_TEMPLATE = "template";
const NEW_MAIL_MODE_ADD_TO_SEQUENCE = "add-to-sequence";
const NEW_MAIL_SOURCE_BROADCASTS = "broadcasts";
const NEW_MAIL_SOURCE_SEQUENCES = "sequences";
const NEW_MAIL_SOURCE_TEMPLATES = "templates";

type MailKind =
    | typeof MAIL_KIND_BROADCAST
    | typeof MAIL_KIND_SEQUENCE
    | typeof MAIL_KIND_TEMPLATE;
type NewMailMode = typeof NEW_MAIL_MODE_ADD_TO_SEQUENCE;
type NewMailSource =
    | typeof NEW_MAIL_SOURCE_BROADCASTS
    | typeof NEW_MAIL_SOURCE_SEQUENCES
    | typeof NEW_MAIL_SOURCE_TEMPLATES;

export default async function NewMailPage({
    searchParams,
}: {
    searchParams: Promise<{
        type?: MailKind;
        mode?: NewMailMode;
        sequenceId?: string;
        source?: NewMailSource;
    }>;
}) {
    const { type, mode, sequenceId, source } = await searchParams;
    const isAddingToSequence =
        mode === NEW_MAIL_MODE_ADD_TO_SEQUENCE && !!sequenceId;

    const breadcrumbs = [
        {
            label:
                type === MAIL_KIND_TEMPLATE
                    ? TEMPLATES
                    : type === MAIL_KIND_SEQUENCE
                      ? SEQUENCES
                      : BROADCASTS,
            href:
                type === MAIL_KIND_TEMPLATE
                    ? `/dashboard/mails?tab=${TEMPLATES}`
                    : `/dashboard/mails?tab=${type === MAIL_KIND_SEQUENCE ? SEQUENCES : BROADCASTS}`,
        },
        ...(isAddingToSequence
            ? [
                  {
                      label: PAGE_HEADER_EDIT_SEQUENCE,
                      href: `/dashboard/mails/sequence/${sequenceId}`,
                  },
              ]
            : []),
        {
            label: PAGE_HEADER_CHOOSE_TEMPLATE,
            href: "#",
        },
    ];

    const cancelHref = isAddingToSequence
        ? `/dashboard/mails/sequence/${sequenceId}`
        : source === NEW_MAIL_SOURCE_TEMPLATES
          ? `/dashboard/mails?tab=${TEMPLATES}`
          : source === NEW_MAIL_SOURCE_SEQUENCES || type === MAIL_KIND_SEQUENCE
            ? `/dashboard/mails?tab=${SEQUENCES}`
            : `/dashboard/mails?tab=${BROADCASTS}`;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <h1 className="text-4xl font-semibold">
                        {PAGE_HEADER_CHOOSE_TEMPLATE}
                    </h1>
                    <Link href={cancelHref}>
                        <Button variant="outline">{BUTTON_CANCEL_TEXT}</Button>
                    </Link>
                </div>
                <NewMailPageClient />
            </div>
        </DashboardContent>
    );
}
