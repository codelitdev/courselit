"use client";

import { Button } from "@codelitdev/design-system";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";

type School = { id: string; name: string; selected?: boolean };
type Template = {
  id: string;
  name: string;
  template: Record<string, string>;
  createdAt: string;
};

export default function CertificatesPage() {
  const [school, setSchool] = useState<School | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function headers() {
    return {
      "content-type": "application/json",
      ...(school ? { "x-school-id": school.id } : {}),
    };
  }

  async function load(selected: School) {
    const response = await fetch("/api/v1/certificate-templates", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": selected.id },
    });
    if (!response.ok) throw new Error("Unable to load certificate templates.");
    const body = (await response.json()) as { items?: Template[] };
    setTemplates(body.items ?? []);
  }

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected =
          body.items?.find((item) => item.selected) ?? body.items?.[0] ?? null;
        setSchool(selected);
        if (selected) await load(selected);
      })
      .catch(() => setError("Unable to load certificate templates."));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school || busy) return;
    const form = new FormData(event.currentTarget);
    let template: Record<string, string>;
    try {
      template = JSON.parse(String(form.get("template") ?? "{}")) as Record<
        string,
        string
      >;
    } catch {
      setError("Template JSON must be valid.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/certificate-templates", {
        method: "POST",
        credentials: "include",
        headers: headers(),
        body: JSON.stringify({ name: form.get("name"), template }),
      });
      if (!response.ok) throw new Error("Unable to create the certificate template.");
      const created = (await response.json()) as Template;
      setTemplates((current) => [created, ...current]);
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create template.");
    } finally {
      setBusy(false);
    }
  }

  async function update(template: Template) {
    if (!school) return;
    const name = window.prompt("Template name", template.name);
    if (name === null) return;
    const response = await fetch(`/api/v1/certificate-templates/${template.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: headers(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      setError("Unable to update the certificate template.");
      return;
    }
    const updated = (await response.json()) as Template;
    setTemplates((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
  }

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Certificates"
          description="Manage the templates used when learners complete courses."
        />
        <section className="card stack">
          <h2>Create a certificate template</h2>
          <form onSubmit={(event) => void create(event)} className="stack">
            <label className="field">
              Name
              <input name="name" required maxLength={200} />
            </label>
            <label className="field">
              Template data (JSON)
              <textarea
                name="template"
                defaultValue={'{"title":"Certificate of completion"}'}
              />
            </label>
            <Button type="submit" disabled={!school || busy}>
              {busy ? "Creating…" : "Create template"}
            </Button>
          </form>
          {error ? <p role="alert">{error}</p> : null}
        </section>
        <section className="card stack">
          <h2>Templates</h2>
          {templates.length === 0 ? (
            <p className="muted">No certificate templates yet.</p>
          ) : (
            <ul className="product-list">
              {templates.map((template) => (
                <li className="product-item" key={template.id}>
                  <strong>{template.name}</strong>
                  <span className="muted">
                    Created {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                  <Button type="button" onClick={() => void update(template)}>
                    Rename
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AuthGate>
  );
}
