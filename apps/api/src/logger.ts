import pinoModule, { type Logger } from "pino";

// Pino 9.6 exposes its callable default through a namespace-shaped ESM type,
// while newer Pino releases use `export =`.  Keep the runtime default import
// and normalize the type so generated products compile against either pin.
const createPino = pinoModule as unknown as (options: {
  level: string;
  redact: { paths: string[]; remove: boolean };
}) => Logger;

export function createLogger(options: { level?: string } = {}): Logger {
  return createPino({
    level: options.level ?? "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["x-api-key"]',
        "digest",
        "pepper",
        "secret",
      ],
      remove: true,
    },
  });
}
