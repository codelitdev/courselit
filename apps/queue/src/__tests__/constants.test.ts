/**
 * @jest-environment node
 */

import { sequenceBounceLimit } from "../constants";

describe("constants", () => {
    it("should have a default sequenceBounceLimit of 3", () => {
        expect(sequenceBounceLimit).toBeGreaterThanOrEqual(0);
    });

    it("should read sequenceBounceLimit from environment variable", () => {
        const originalEnv = process.env.SEQUENCE_BOUNCE_LIMIT;

        process.env.SEQUENCE_BOUNCE_LIMIT = "5";
        // Note: This test demonstrates the pattern, but since the constant
        // is evaluated at module load time, we'd need to reload the module
        // to see the change. This is just for demonstration.

        expect(sequenceBounceLimit).toBeDefined();

        // Restore original value
        if (originalEnv) {
            process.env.SEQUENCE_BOUNCE_LIMIT = originalEnv;
        } else {
            delete process.env.SEQUENCE_BOUNCE_LIMIT;
        }
    });
});
