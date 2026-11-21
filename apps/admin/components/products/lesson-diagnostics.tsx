import { diagnosticLocation, type LessonDiagnostic } from "@/lib/lesson-page";

/** Why a lesson save or publish was refused, block by block. */
export function LessonDiagnostics({
  title,
  diagnostics,
}: {
  title: string;
  diagnostics: LessonDiagnostic[];
}) {
  if (!diagnostics.length) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
    >
      <p className="font-semibold text-destructive">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5">
        {diagnostics.map((item, index) => {
          const location = diagnosticLocation(item);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: diagnostics have no ID
            <li key={index}>
              {location ? <span className="font-medium">{location}: </span> : null}
              {item.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
