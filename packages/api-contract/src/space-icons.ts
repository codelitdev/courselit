// Kept apart from the contract index so the admin and storefront can import
// the list in the browser without bundling every schema.

/**
 * The icons a community space can show, by lucide-react icon name, with the
 * label a creator sees in the picker. Each app maps the names to its own
 * explicit icon imports, so pages never load the whole icon set.
 */
export const SPACE_ICONS = [
  { name: "MessagesSquare", label: "Discussion" },
  { name: "MessageCircle", label: "Chat" },
  { name: "Megaphone", label: "Announcements" },
  { name: "Hand", label: "Introductions" },
  { name: "MessageCircleQuestionMark", label: "Questions" },
  { name: "Lightbulb", label: "Ideas" },
  { name: "BookOpen", label: "Learning" },
  { name: "GraduationCap", label: "Courses" },
  { name: "Users", label: "Members" },
  { name: "Trophy", label: "Wins" },
  { name: "Heart", label: "Appreciation" },
  { name: "CalendarDays", label: "Events" },
  { name: "Video", label: "Live sessions" },
  { name: "Image", label: "Showcase" },
  { name: "Palette", label: "Creative work" },
  { name: "Code", label: "Code" },
  { name: "Briefcase", label: "Jobs" },
  { name: "Rocket", label: "Launches" },
  { name: "Star", label: "Featured" },
  { name: "Sparkles", label: "What's new" },
  { name: "Coffee", label: "Off-topic" },
  { name: "Music", label: "Music" },
  { name: "Camera", label: "Photos" },
  { name: "PenLine", label: "Writing" },
  { name: "FolderOpen", label: "Resources" },
  { name: "Link", label: "Links" },
  { name: "Globe", label: "Around the world" },
  { name: "Shield", label: "Rules" },
  { name: "Bell", label: "Updates" },
  { name: "Gift", label: "Perks" },
  { name: "Target", label: "Goals" },
  { name: "Flame", label: "Trending" },
] as const;

export type SpaceIconName = (typeof SPACE_ICONS)[number]["name"];

/** The icon a space gets when none is chosen. */
export const DEFAULT_SPACE_ICON: SpaceIconName = "MessagesSquare";

const NAMES: ReadonlySet<string> = new Set(SPACE_ICONS.map((icon) => icon.name));

export function isSpaceIconName(value: unknown): value is SpaceIconName {
  return typeof value === "string" && NAMES.has(value);
}
