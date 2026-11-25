import { describe, expect, it } from "bun:test";
import type { CaptureClient } from "@codelitdev/observability";
import { createCourseLitObservability, telemetrySinkFrom } from "./telemetry.js";

function fakeClient() {
  const events: unknown[] = [];
  const exceptions: unknown[] = [];
  const client: CaptureClient = {
    capture: (input) => events.push(input),
    captureException: (error, distinctId, properties) =>
      exceptions.push({ error, distinctId, properties }),
    shutdown: async () => {},
  };
  return { client, events, exceptions };
}

const env = { POSTHOG_API_KEY: "phc_test", LOG_LEVEL: "silent", DEPLOY_ENV: "qa" };

describe("createCourseLitObservability", () => {
  it("is a no-op without POSTHOG_API_KEY", () => {
    const obs = createCourseLitObservability("courselit-api", { LOG_LEVEL: "silent" });
    expect(obs.enabled).toBe(false);
  });

  it("keeps every product event, even in a burst from one source", () => {
    const { client, events } = fakeClient();
    const obs = createCourseLitObservability("courselit-api", env, {
      client,
      purpose: "events",
    });
    for (let i = 0; i < 150; i++) {
      obs.captureEvent({
        event: "learner_purchased",
        source: "product",
        subjectId: "school_sch_1",
      });
    }
    expect(events).toHaveLength(150);
    expect(
      (events[0] as { properties: { environment: string } }).properties.environment,
    ).toBe("qa");
  });

  it("dedupes repeated errors on the errors instance", () => {
    const { client, exceptions } = fakeClient();
    const obs = createCourseLitObservability("courselit-api", env, { client });
    for (let i = 0; i < 3; i++) {
      obs.captureException({
        error: new Error("boom"),
        source: "worker.integration_job",
      });
    }
    expect(exceptions).toHaveLength(1);
  });

  it("routes errors and events to their own instances", () => {
    const errors = fakeClient();
    const events = fakeClient();
    const sink = telemetrySinkFrom(
      createCourseLitObservability("courselit-api", env, { client: errors.client }),
      createCourseLitObservability("courselit-api", env, {
        client: events.client,
        purpose: "events",
      }),
    );
    sink.captureException({ error: new Error("boom"), source: "test" });
    sink.captureEvent({ event: "school_created", source: "product", subjectId: "u1" });
    sink.identifyGroup({ groupType: "school", groupKey: "sch_1", source: "product" });
    expect(errors.exceptions).toHaveLength(1);
    expect(errors.events).toHaveLength(0);
    expect(events.events).toHaveLength(2);
    expect(events.exceptions).toHaveLength(0);
  });
});
