import {
  createFooterBlock,
  type SendLitEmailRenderContext,
} from "@sendlit/email-blocks/footer";
import type { EditorVariable } from "@sendlit/email-editor";
import { Image, Link, Separator, Text } from "@sendlit/email-editor/blocks";

/** The managed footer every marketing email carries: the school's mailing
 * address and an unsubscribe link, both filled in at send time. */
const FOOTER_BLOCK = createFooterBlock({
  labels: {
    displayName: "Footer",
    description: "Required mailing address and unsubscribe footer",
    unsubscribe: "Unsubscribe",
    viewInBrowser: "View in browser",
    alignment: "Alignment",
    alignmentLeft: "Left",
    alignmentCenter: "Center",
    alignmentRight: "Right",
    foregroundColor: "Text color",
    backgroundColor: "Background color",
    fontSize: "Font size",
    paddingTop: "Top padding",
    paddingBottom: "Bottom padding",
    paddingX: "Horizontal padding",
  },
});

/** Blocks for broadcasts, sequence emails and marketing templates. */
export const MARKETING_EMAIL_BLOCKS = [Text, Separator, Image, Link, FOOTER_BLOCK];

/** What the footer shows in editors and previews. */
export const MARKETING_PREVIEW_CONTEXT: SendLitEmailRenderContext = {
  footer: {
    mailingAddress: "Your mailing address",
    unsubscribeUrl: "#unsubscribe-preview",
    viewInBrowserUrl: "#view-in-browser-preview",
  },
};

/** Merge tags offered while writing a marketing email (type `{{`). */
export const MARKETING_VARIABLES: EditorVariable[] = [
  { tag: "{{ subscriber.email }}", description: "Subscriber's email address" },
  { tag: "{{ subscriber.name }}", description: "Subscriber's name" },
  { tag: "{{ subscriber.tags }}", description: "Subscriber's assigned tags" },
  { tag: "{{ address }}", description: "Your school's mailing address" },
  { tag: "{{ unsubscribe_link }}", description: "Mandatory unsubscribe link" },
];
