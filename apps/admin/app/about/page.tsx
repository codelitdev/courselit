import nextPackage from "next/package.json";
import { PageHeader } from "@/components/layout/page-header";
import { apiStatus, shortCommit, versionMismatch } from "@/lib/about";
import adminPackage from "../../package.json";

// Read on every visit: the API's status and the deployment's environment.
export const dynamic = "force-dynamic";

export const metadata = { title: "About" };

/**
 * Technical details about this CourseLit install, like main's
 * /dashboard/courselit. Nothing links here; it's reached by typing /about.
 */
export default async function AboutPage() {
  const api = await apiStatus(process.env.API_URL ?? "http://127.0.0.1:4000");
  const commit = shortCommit(process.env.COURSELIT_BUILD_SHA);
  const rows: Array<[string, string]> = [
    // The installed version is the API's: it's what the school runs on.
    ["Version", api.version ?? "Unknown"],
    ["Admin version", adminPackage.version],
    ["Build", commit ?? "Not recorded"],
    ["Environment", process.env.NODE_ENV ?? "unknown"],
    ["Next.js", nextPackage.version],
    ["API", api.reachable ? "Reachable" : "Not reachable"],
    [
      "Database",
      api.databaseReady === null ? "Unknown" : api.databaseReady ? "Ready" : "Not ready",
    ],
  ];

  return (
    <main className="page-shell">
      <PageHeader title="About" description="Tech stuff about CourseLit." />
      {versionMismatch(adminPackage.version, api.version) ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive"
        >
          The admin ({adminPackage.version}) and the API ({api.version}) are on different
          versions. Finish the deploy so both run the same release.
        </p>
      ) : null}
      <dl className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
