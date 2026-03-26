/**
 * @jest-environment node
 */

const captureExceptionMock = jest.fn();
const setupExpressErrorHandlerMock = jest.fn();
const posthogConstructorMock = jest.fn(() => ({
    captureException: captureExceptionMock,
}));

jest.mock("posthog-node", () => ({
    PostHog: posthogConstructorMock,
    setupExpressErrorHandler: setupExpressErrorHandlerMock,
}));

const loadModule = async () => {
    jest.resetModules();
    return await import("../posthog");
};

describe("error tracking wrapper", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.POSTHOG_API_KEY;
        delete process.env.POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE;
        delete process.env.DEPLOY_ENV;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("is no-op when POSTHOG_API_KEY is missing", async () => {
        const module = await loadModule();
        module.captureError({
            error: new Error("boom"),
            source: "worker.mail",
            domainId: "domain-1",
        });

        expect(module.isPosthogEnabled()).toBe(false);
        expect(posthogConstructorMock).not.toHaveBeenCalled();
        expect(captureExceptionMock).not.toHaveBeenCalled();
    });

    it("captures exception when POSTHOG_API_KEY is present", async () => {
        process.env.POSTHOG_API_KEY = "phc_test_key";
        process.env.DEPLOY_ENV = "staging";

        const module = await loadModule();
        module.captureError({
            error: new Error("boom"),
            source: "worker.mail",
            domainId: "domain-1",
            context: {
                queue_name: "mail",
                job_id: "123",
            },
        });

        expect(module.isPosthogEnabled()).toBe(true);
        expect(posthogConstructorMock).toHaveBeenCalledWith(
            "phc_test_key",
            expect.objectContaining({
                enableExceptionAutocapture: true,
            }),
        );
        expect(captureExceptionMock).toHaveBeenCalledWith(
            expect.any(Error),
            "domain-1",
            expect.objectContaining({
                service: "courselit:queue",
                environment: "staging",
                source: "worker.mail",
                domain_id: "domain-1",
            }),
        );
    });

    it("dedupes identical exceptions in the 60s window", async () => {
        process.env.POSTHOG_API_KEY = "phc_test_key";

        const module = await loadModule();
        const error = new Error("same-message");

        module.captureError({
            error,
            source: "processRules.loop",
            domainId: "domain-1",
        });
        module.captureError({
            error,
            source: "processRules.loop",
            domainId: "domain-1",
        });

        expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    });

    it("applies per-source cap from env var", async () => {
        process.env.POSTHOG_API_KEY = "phc_test_key";
        process.env.POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE = "1";

        const module = await loadModule();
        module.captureError({
            error: new Error("first"),
            source: "worker.mail",
            domainId: "domain-1",
        });
        module.captureError({
            error: new Error("second"),
            source: "worker.mail",
            domainId: "domain-1",
        });

        expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    });

    it("handles dedupe cache bound without throwing", async () => {
        process.env.POSTHOG_API_KEY = "phc_test_key";
        process.env.POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE = "20000";

        const module = await loadModule();

        for (let i = 0; i < 10001; i++) {
            module.captureError({
                error: new Error(`err-${i}`),
                source: `worker.mail.${i}`,
                domainId: "domain-1",
            });
        }

        expect(captureExceptionMock).toHaveBeenCalledTimes(10001);
    });

    it("swallows capture pipeline failures", async () => {
        process.env.POSTHOG_API_KEY = "phc_test_key";
        captureExceptionMock.mockImplementation(() => {
            throw new Error("capture failed");
        });

        const module = await loadModule();

        expect(() =>
            module.captureError({
                error: new Error("boom"),
                source: "worker.mail",
                domainId: "domain-1",
            }),
        ).not.toThrow();
    });

    it("wires setupExpressErrorHandler only when enabled", async () => {
        let module = await loadModule();
        module.setupPosthogExpressErrorHandler({} as any);
        expect(setupExpressErrorHandlerMock).not.toHaveBeenCalled();

        process.env.POSTHOG_API_KEY = "phc_test_key";
        module = await loadModule();
        module.setupPosthogExpressErrorHandler({} as any);
        expect(setupExpressErrorHandlerMock).toHaveBeenCalledTimes(1);
    });
});
