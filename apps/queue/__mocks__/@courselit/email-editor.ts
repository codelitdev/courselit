// Re-export only renderEmailToHtml and types to avoid loading EmailEditor and its dependencies
// This allows us to test the real renderEmailToHtml without loading React UI components
export type {
    Email,
    EmailBlock,
    EmailMeta,
    EmailStyle,
} from "../../../../packages/email-editor/src/types/email-editor";
export type {
    BlockComponent,
    BlockRegistry,
} from "../../../../packages/email-editor/src/types/block-registry";
export { renderEmailToHtml } from "../../../../packages/email-editor/src/lib/email-renderer";
export { defaultEmail } from "../../../../packages/email-editor/src/lib/default-email";
