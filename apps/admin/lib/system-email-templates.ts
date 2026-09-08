import type { Email } from "@sendlit/email-editor";
import type { SystemTemplateSummary } from "@sendlit/email-blocks";
import announcementData from "@/data/system-emails/announcement.json";
import blankData from "@/data/system-emails/blank.json";
import welcomeData from "@/data/system-emails/new-user-welcome.json";
import newsletterData from "@/data/system-emails/newsletter.json";
import upsellData from "@/data/system-emails/upsell-products.json";

export const BUILTIN_SYSTEM_TEMPLATES: SystemTemplateSummary[] = [
  {
    templateId: "system:blank",
    title: "Blank",
    description: "Start with a clean slate for your message.",
    content: blankData.content as unknown as Email,
  },
  {
    templateId: "system:announcement",
    title: "Announcement",
    description: "Share exciting news, product launches, or important school updates.",
    content: announcementData.content as unknown as Email,
  },
  {
    templateId: "system:newsletter",
    title: "Newsletter",
    description: "Engage your audience with curated stories, updates, and featured content.",
    content: newsletterData.content as unknown as Email,
  },
  {
    templateId: "system:welcome",
    title: "New user welcome",
    description: "Welcome new learners and orient them to your school.",
    content: welcomeData.content as unknown as Email,
  },
  {
    templateId: "system:upsell",
    title: "Upsell products",
    description: "Promote your courses, memberships, and digital downloads.",
    content: upsellData.content as unknown as Email,
  },
];
