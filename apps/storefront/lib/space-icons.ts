// The icon each community space shows, by the name the API stores.
// Explicit imports keep the rest of lucide-react out of the bundle.
import {
  DEFAULT_SPACE_ICON,
  isSpaceIconName,
  type SpaceIconName,
} from "@courselit/api-contract/space-icons";
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  Code,
  Coffee,
  Flame,
  FolderOpen,
  Gift,
  Globe,
  GraduationCap,
  Hand,
  Heart,
  Image,
  Lightbulb,
  Link,
  type LucideIcon,
  Megaphone,
  MessageCircle,
  MessageCircleQuestionMark,
  MessagesSquare,
  Music,
  Palette,
  PenLine,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Video,
} from "lucide-react";

/** Every space icon by name; the type makes sure none is missing. */
export const SPACE_ICON_COMPONENTS: Record<SpaceIconName, LucideIcon> = {
  MessagesSquare,
  MessageCircle,
  Megaphone,
  Hand,
  MessageCircleQuestionMark,
  Lightbulb,
  BookOpen,
  GraduationCap,
  Users,
  Trophy,
  Heart,
  CalendarDays,
  Video,
  Image,
  Palette,
  Code,
  Briefcase,
  Rocket,
  Star,
  Sparkles,
  Coffee,
  Music,
  Camera,
  PenLine,
  FolderOpen,
  Link,
  Globe,
  Shield,
  Bell,
  Gift,
  Target,
  Flame,
};

/** The icon to draw for a stored name, falling back to the default. */
export function spaceIconFor(name: string | null | undefined): LucideIcon {
  return SPACE_ICON_COMPONENTS[isSpaceIconName(name) ? name : DEFAULT_SPACE_ICON];
}

