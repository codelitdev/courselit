"use client";

import type { ThemeStyle, WidgetProps } from "@frontlit/page-builder/models";
import {
  Button,
  Header1,
  Input,
  Label,
  Section,
  Subheader1,
  Text2,
} from "@frontlit/page-builder/primitives";
import { type FormEvent, useId, useState } from "react";
import {
  DEFAULT_NEWSLETTER_BUTTON,
  DEFAULT_NEWSLETTER_FAILURE,
  DEFAULT_NEWSLETTER_SUBTITLE,
  DEFAULT_NEWSLETTER_SUCCESS,
  DEFAULT_NEWSLETTER_TITLE,
} from "./constants";
import type { NewsletterSignupSettings } from "./settings";

function sectionTheme(theme: ThemeStyle, settings: NewsletterSignupSettings) {
  const resolved: ThemeStyle = JSON.parse(JSON.stringify(theme));
  resolved.structure.page.width = settings.maxWidth || theme.structure.page.width;
  resolved.structure.section.padding.y =
    settings.verticalPadding || theme.structure.section.padding.y;
  return resolved;
}

export default function NewsletterSignupWidget({
  settings,
  state: { theme },
  editing,
  nextTheme,
}: WidgetProps<NewsletterSignupSettings>) {
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const inputId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const alignment = settings.alignment ?? "left";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing || submitting) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!response.ok) throw new Error("newsletter_signup_failed");
      setSubmitted(true);
      setName("");
      setEmail("");
    } catch {
      setMessage(settings.failureMessage || DEFAULT_NEWSLETTER_FAILURE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section
      theme={resolvedTheme}
      id={settings.cssId}
      background={settings.background}
      nextTheme={nextTheme}
    >
      <form
        onSubmit={(event) => void submit(event)}
        className={`flex w-full flex-col gap-4 ${
          alignment === "center"
            ? "items-center text-center"
            : alignment === "right"
              ? "items-end text-right"
              : "items-start text-left"
        }`}
      >
        <div className="flex flex-col gap-2">
          <Header1 theme={resolvedTheme}>
            {settings.title || DEFAULT_NEWSLETTER_TITLE}
          </Header1>
          <Subheader1 theme={resolvedTheme} component="span">
            {settings.subtitle || DEFAULT_NEWSLETTER_SUBTITLE}
          </Subheader1>
        </div>
        {submitted ? (
          <Text2 theme={resolvedTheme} role="status" aria-live="polite">
            {settings.successMessage || DEFAULT_NEWSLETTER_SUCCESS}
          </Text2>
        ) : (
          <div className="newsletter-signup-fields grid w-full max-w-2xl items-end gap-3">
            <div className="flex flex-col items-start gap-1">
              <Label theme={resolvedTheme} htmlFor={`${inputId}-name`}>
                Name
              </Label>
              <Input
                theme={resolvedTheme}
                id={`${inputId}-name`}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="flex flex-col items-start gap-1">
              <Label theme={resolvedTheme} htmlFor={`${inputId}-email`}>
                Email
              </Label>
              <Input
                theme={resolvedTheme}
                id={`${inputId}-email`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <Button
              theme={resolvedTheme}
              type="submit"
              disabled={!editing && (submitting || !name.trim() || !email.trim())}
              className="justify-self-start"
            >
              {submitting
                ? "Subscribing…"
                : settings.btnText || DEFAULT_NEWSLETTER_BUTTON}
            </Button>
          </div>
        )}
        {message ? (
          <Text2 theme={resolvedTheme} role="alert">
            {message}
          </Text2>
        ) : null}
      </form>
    </Section>
  );
}
