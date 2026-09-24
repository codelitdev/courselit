"use client";

import type { ThemeStyle } from "@frontlit/page-builder/models";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Caption,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Header1,
  Header2,
  Header3,
  Header4,
  Input,
  Label,
  Link,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardImage,
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Preheader,
  RadioGroup,
  RadioGroupItem,
  Section,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Separator,
  Subheader1,
  Subheader2,
  Switch,
  Text1,
  Text2,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@frontlit/page-builder/primitives";
import type { ComponentProps, ReactNode } from "react";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";
import { cn } from "@/lib/utils";

type WithoutTheme<T> = Omit<T, "theme">;
type ThemedInputProps = WithoutTheme<ComponentProps<typeof Input>> & {
  theme?: ThemeStyle;
};
type ThemedLabelProps = WithoutTheme<ComponentProps<typeof Label>> & {
  theme?: ThemeStyle;
};
type ThemedCardImageProps = WithoutTheme<ComponentProps<typeof PageCardImage>> & {
  theme?: ThemeStyle;
};
type ThemedSurfaceProps = ComponentProps<"div"> & {
  theme?: ThemeStyle;
};

const BASE_INPUT_CLASSES =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

function inputThemeClasses(theme: ThemeStyle, includeTypography = true) {
  const inputStyles = theme.interactives?.input;
  const typographyStyles = theme.typography?.input;
  return [
    includeTypography ? typographyStyles?.fontFamily : null,
    includeTypography ? typographyStyles?.fontSize : null,
    includeTypography ? typographyStyles?.fontWeight : null,
    includeTypography ? typographyStyles?.lineHeight : null,
    includeTypography ? typographyStyles?.letterSpacing : null,
    includeTypography ? typographyStyles?.textTransform : null,
    includeTypography ? typographyStyles?.textDecoration : null,
    includeTypography ? typographyStyles?.textOverflow : null,
    inputStyles?.padding?.x,
    inputStyles?.padding?.y,
    inputStyles?.border?.width,
    inputStyles?.border?.style,
    inputStyles?.border?.radius ?? inputStyles?.borderRadius,
    inputStyles?.shadow,
    inputStyles?.custom,
  ];
}

export function LearnerButton(props: WithoutTheme<ComponentProps<typeof Button>>) {
  return <Button {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerPreheader(
  props: WithoutTheme<ComponentProps<typeof Preheader>>,
) {
  return <Preheader {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerInput({
  className,
  error,
  theme: providedTheme,
  ...props
}: ThemedInputProps) {
  const contextTheme = useSchoolThemeStyle();
  const theme = providedTheme ?? contextTheme;
  const inputStyles = theme.interactives?.input;
  return (
    <Input
      {...props}
      className={cn(
        BASE_INPUT_CLASSES,
        ...inputThemeClasses(theme),
        props.disabled && inputStyles?.disabled?.opacity,
        props.disabled && inputStyles?.disabled?.cursor,
        props.disabled && inputStyles?.disabled?.color,
        props.disabled && inputStyles?.disabled?.background,
        props.disabled && inputStyles?.disabled?.border,
        error && "border-red-300 focus:border-red-500 focus:ring-red-500",
        className,
      )}
    />
  );
}

export function LearnerCheckbox(props: WithoutTheme<ComponentProps<typeof Checkbox>>) {
  return <Checkbox {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerRadioGroup(
  props: WithoutTheme<ComponentProps<typeof RadioGroup>>,
) {
  return <RadioGroup {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerRadioGroupItem(
  props: WithoutTheme<ComponentProps<typeof RadioGroupItem>>,
) {
  return <RadioGroupItem {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerSelect(props: WithoutTheme<ComponentProps<typeof Select>>) {
  return <Select {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerSelectTrigger(
  props: WithoutTheme<ComponentProps<typeof SelectTrigger>>,
) {
  return <SelectTrigger {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerSelectContent(
  props: WithoutTheme<ComponentProps<typeof SelectContent>>,
) {
  return <SelectContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerSelectItem(
  props: WithoutTheme<ComponentProps<typeof SelectItem>>,
) {
  return <SelectItem {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerSelectValue = SelectValue;
export const LearnerSelectGroup = SelectGroup;
export const LearnerSelectLabel = SelectLabel;
export const LearnerSelectSeparator = SelectSeparator;

export function LearnerTextarea(props: WithoutTheme<ComponentProps<typeof Textarea>>) {
  return <Textarea {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerLabel({ theme: providedTheme, ...props }: ThemedLabelProps) {
  const contextTheme = useSchoolThemeStyle();
  return <Label {...props} theme={providedTheme ?? contextTheme} />;
}

/** A themed label surface for selectable cards such as checkout plans. */
export function LearnerOptionLabel({
  className,
  theme: providedTheme,
  ...props
}: ThemedLabelProps) {
  const contextTheme = useSchoolThemeStyle();
  const theme = providedTheme ?? contextTheme;
  return (
    <Label
      {...props}
      theme={theme}
      className={cn(...inputThemeClasses(theme, false), className)}
    />
  );
}

/** Themed container for compound controls such as an email capture field. */
export function LearnerInputShell({
  className,
  theme: providedTheme,
  ...props
}: ThemedSurfaceProps) {
  const contextTheme = useSchoolThemeStyle();
  const theme = providedTheme ?? contextTheme;
  return (
    <div
      {...props}
      className={cn("flex items-center", ...inputThemeClasses(theme, false), className)}
    />
  );
}

export function LearnerSwitch(props: WithoutTheme<ComponentProps<typeof Switch>>) {
  return <Switch {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerHeader1(props: WithoutTheme<ComponentProps<typeof Header1>>) {
  return <Header1 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerHeader2(props: WithoutTheme<ComponentProps<typeof Header2>>) {
  return <Header2 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerHeader3(props: WithoutTheme<ComponentProps<typeof Header3>>) {
  return <Header3 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerHeader4(props: WithoutTheme<ComponentProps<typeof Header4>>) {
  return <Header4 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerSubheader1(
  props: WithoutTheme<ComponentProps<typeof Subheader1>>,
) {
  return <Subheader1 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerSubheader2(
  props: WithoutTheme<ComponentProps<typeof Subheader2>>,
) {
  return <Subheader2 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerText1(props: WithoutTheme<ComponentProps<typeof Text1>>) {
  return <Text1 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerText2(props: WithoutTheme<ComponentProps<typeof Text2>>) {
  return <Text2 {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerCaption(props: WithoutTheme<ComponentProps<typeof Caption>>) {
  return <Caption {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerLink(props: WithoutTheme<ComponentProps<typeof Link>>) {
  return <Link {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerBadge(props: WithoutTheme<ComponentProps<typeof Badge>>) {
  return <Badge {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerCard(props: WithoutTheme<ComponentProps<typeof PageCard>>) {
  return <PageCard {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerCardContent(
  props: WithoutTheme<ComponentProps<typeof PageCardContent>>,
) {
  return <PageCardContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerCardHeader(
  props: WithoutTheme<ComponentProps<typeof PageCardHeader>>,
) {
  return <PageCardHeader {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerCardImage({
  className,
  theme: providedTheme,
  ...props
}: ThemedCardImageProps) {
  const contextTheme = useSchoolThemeStyle();
  const theme = providedTheme ?? contextTheme;
  return (
    <PageCardImage
      {...props}
      theme={theme}
      className={cn(className, theme.interactives?.card?.border?.radius)}
    />
  );
}

export function LearnerSection(props: WithoutTheme<ComponentProps<typeof Section>>) {
  return <Section {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerInset({
  className,
  ...props
}: WithoutTheme<ComponentProps<typeof PageCard>>) {
  const theme = useSchoolThemeStyle();

  // This is a static inset rather than an interactive card, so retain the
  // theme's surface treatment while omitting the card's hover animation.
  const staticSurfaceTheme: ThemeStyle = {
    ...theme,
    interactives: {
      ...theme.interactives,
      card: {
        ...theme.interactives.card,
        custom: "",
      },
    },
  };

  return (
    <PageCard {...props} theme={staticSurfaceTheme} className={cn("p-4", className)} />
  );
}

export function LearnerDrawer(props: WithoutTheme<ComponentProps<typeof Drawer>>) {
  return <Drawer {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDialog(props: WithoutTheme<ComponentProps<typeof Dialog>>) {
  return <Dialog {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerDialogTrigger = DialogTrigger;
export const LearnerDialogClose = DialogClose;

export function LearnerDialogContent(
  props: WithoutTheme<ComponentProps<typeof DialogContent>>,
) {
  return <DialogContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDialogTitle(
  props: WithoutTheme<ComponentProps<typeof DialogTitle>>,
) {
  return <DialogTitle {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDialogDescription(
  props: WithoutTheme<ComponentProps<typeof DialogDescription>>,
) {
  return <DialogDescription {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerDialogHeader = DialogHeader;
export const LearnerDialogFooter = DialogFooter;

export function LearnerAlertDialog(
  props: WithoutTheme<ComponentProps<typeof AlertDialog>>,
) {
  return <AlertDialog {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerAlertDialogTrigger = AlertDialogTrigger;
export const LearnerAlertDialogCancel = AlertDialogCancel;
export const LearnerAlertDialogAction = AlertDialogAction;

export function LearnerAlertDialogContent(
  props: WithoutTheme<ComponentProps<typeof AlertDialogContent>>,
) {
  return <AlertDialogContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerAlertDialogTitle(
  props: WithoutTheme<ComponentProps<typeof AlertDialogTitle>>,
) {
  return <AlertDialogTitle {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerAlertDialogDescription(
  props: WithoutTheme<ComponentProps<typeof AlertDialogDescription>>,
) {
  return <AlertDialogDescription {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerAlertDialogHeader = AlertDialogHeader;
export const LearnerAlertDialogFooter = AlertDialogFooter;

export function LearnerPopover(props: WithoutTheme<ComponentProps<typeof Popover>>) {
  return <Popover {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerPopoverTrigger = PopoverTrigger;
export const LearnerPopoverAnchor = PopoverAnchor;
export const LearnerPopoverClose = PopoverClose;

export function LearnerPopoverContent(
  props: WithoutTheme<ComponentProps<typeof PopoverContent>>,
) {
  return <PopoverContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerAvatar({
  className,
  ...props
}: WithoutTheme<ComponentProps<typeof Avatar>>) {
  const theme = useSchoolThemeStyle();
  const avatarSurface = theme.interactives.card;

  return (
    <Avatar
      {...props}
      theme={theme}
      className={cn(
        "border border-border",
        avatarSurface.border?.width,
        avatarSurface.border?.style,
        avatarSurface.border?.radius,
        avatarSurface.shadow,
        className,
      )}
    />
  );
}

export const LearnerAvatarImage = AvatarImage;
export const LearnerAvatarFallback = AvatarFallback;

export function LearnerSeparator(
  props: WithoutTheme<ComponentProps<typeof Separator>>,
) {
  return <Separator {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerTooltipProvider(
  props: WithoutTheme<ComponentProps<typeof TooltipProvider>>,
) {
  return <TooltipProvider {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerTooltip(props: WithoutTheme<ComponentProps<typeof Tooltip>>) {
  return <Tooltip {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerTooltipTrigger = TooltipTrigger;

export function LearnerTooltipContent(
  props: WithoutTheme<ComponentProps<typeof TooltipContent>>,
) {
  return <TooltipContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDropdownMenu(
  props: WithoutTheme<ComponentProps<typeof DropdownMenu>>,
) {
  return <DropdownMenu {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDropdownMenuTrigger(
  props: ComponentProps<typeof DropdownMenuTrigger>,
) {
  return <DropdownMenuTrigger {...props} />;
}

export function LearnerDropdownMenuContent(
  props: WithoutTheme<ComponentProps<typeof DropdownMenuContent>>,
) {
  return <DropdownMenuContent {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDropdownMenuItem(
  props: WithoutTheme<ComponentProps<typeof DropdownMenuItem>>,
) {
  return <DropdownMenuItem {...props} theme={useSchoolThemeStyle()} />;
}

export function LearnerDropdownMenuLabel(
  props: WithoutTheme<ComponentProps<typeof DropdownMenuLabel>>,
) {
  return <DropdownMenuLabel {...props} theme={useSchoolThemeStyle()} />;
}

export const LearnerDropdownMenuSeparator = DropdownMenuSeparator;

type LearnerReactionPickerProps = {
  emojis: readonly string[];
  onReact: (emoji: string) => void;
  children: ReactNode;
  triggerLabel?: string;
};

/**
 * A compact, theme-aware reaction picker for interactive learner surfaces.
 */
export function LearnerReactionPicker({
  emojis,
  onReact,
  children,
  triggerLabel = "Add reaction",
}: LearnerReactionPickerProps) {
  return (
    <LearnerPopover>
      <LearnerPopoverTrigger asChild>
        <LearnerButton
          type="button"
          variant="outline"
          size="sm"
          aria-label={triggerLabel}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </LearnerButton>
      </LearnerPopoverTrigger>
      <LearnerPopoverContent
        className="w-auto p-2"
        side="top"
        align="start"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-1">
          {emojis.map((emoji) => (
            <LearnerButton
              key={emoji}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`React ${emoji}`}
              onClick={(event) => {
                event.stopPropagation();
                onReact(emoji);
              }}
            >
              {emoji}
            </LearnerButton>
          ))}
        </div>
      </LearnerPopoverContent>
    </LearnerPopover>
  );
}

type LearnerActionMenuProps = {
  children: ReactNode;
  menu: ReactNode;
  label: string;
};

/** A theme-aware overflow menu for learner content actions. */
export function LearnerActionMenu({ children, menu, label }: LearnerActionMenuProps) {
  return (
    <LearnerDropdownMenu>
      <LearnerDropdownMenuTrigger asChild>
        <LearnerButton
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </LearnerButton>
      </LearnerDropdownMenuTrigger>
      <LearnerDropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        {menu}
      </LearnerDropdownMenuContent>
    </LearnerDropdownMenu>
  );
}
