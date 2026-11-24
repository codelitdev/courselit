"use client";

import {
  DEFAULT_SPACE_ICON,
  isSpaceIconName,
  SPACE_ICONS,
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
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/codelit/popover";
import { cn } from "@/lib/utils";

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

/** A button showing the space's icon; it opens a grid of icons to choose from. */
export function SpaceIconPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (name: SpaceIconName) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = isSpaceIconName(value) ? value : DEFAULT_SPACE_ICON;
  const Selected = SPACE_ICON_COMPONENTS[selected];
  const selectedLabel = SPACE_ICONS.find((icon) => icon.name === selected)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className="justify-start gap-2"
          aria-label={`Icon: ${selectedLabel}. Change icon`}
        >
          <Selected className="size-4" aria-hidden />
          <span>{selectedLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div
          role="radiogroup"
          aria-label="Space icon"
          className="grid grid-cols-8 gap-1"
        >
          {SPACE_ICONS.map(({ name, label }) => {
            const Icon = SPACE_ICON_COMPONENTS[name];
            const checked = name === selected;
            return (
              <label
                key={name}
                title={label}
                className={cn(
                  "grid size-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ring",
                  checked && "bg-[var(--primary-soft)] text-primary",
                )}
              >
                <input
                  type="radio"
                  name={`${id ?? "space"}-icon`}
                  value={name}
                  checked={checked}
                  aria-label={label}
                  className="sr-only"
                  onChange={() => onChange(name)}
                  // Arrow keys move the choice; a pointer click or Enter
                  // confirms it and closes the picker.
                  onClick={(event) => {
                    if (event.detail > 0) setOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setOpen(false);
                    }
                  }}
                />
                <Icon className="size-4" aria-hidden />
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
