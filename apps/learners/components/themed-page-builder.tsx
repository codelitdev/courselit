"use client";

import type { ThemeStyle } from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Caption,
  Drawer,
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
  Preheader,
  Section,
  Subheader1,
  Subheader2,
  Switch,
  Text1,
  Text2,
  Textarea,
} from "@frontlit/page-builder/primitives";
import type { ComponentProps, SelectHTMLAttributes } from "react";
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

/** A compact native radio control that does not inherit field shadows/radii. */
export function LearnerRadio({ className, style, ...props }: ThemedInputProps) {
  return (
    <LearnerInput
      {...props}
      type="radio"
      className={cn(
        "mt-1 size-4 min-h-4 min-w-4 shrink-0 rounded-full shadow-none accent-[var(--primary)]",
        className,
      )}
      style={{
        ...style,
        width: "16px",
        minWidth: "16px",
        height: "16px",
        minHeight: "16px",
        padding: 0,
        borderRadius: "9999px",
        boxShadow: "none",
      }}
    />
  );
}

/**
 * The page-builder package intentionally keeps its primitive set small and
 * does not ship a select yet. Keep native select semantics while applying the
 * same themed input contract as the page-builder Input primitive.
 */
export function LearnerSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const theme = useSchoolThemeStyle();
  return (
    <select
      {...props}
      className={cn(BASE_INPUT_CLASSES, ...inputThemeClasses(theme), className)}
    />
  );
}

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

export function LearnerDrawer(props: WithoutTheme<ComponentProps<typeof Drawer>>) {
  return <Drawer {...props} theme={useSchoolThemeStyle()} />;
}
