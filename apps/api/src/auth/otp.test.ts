import { describe, expect, it, spyOn } from "bun:test";
import { sendVerificationOTP } from "./options.js";

describe("sendVerificationOTP", () => {
  it("prints the OTP to the API console outside production", async () => {
    const info = spyOn(console, "info").mockImplementation(() => undefined);
    await sendVerificationOTP({
      email: "owner@example.com",
      otp: "123456",
      type: "sign-in",
    }, { env: { NODE_ENV: "development" } });
    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls[0])).toContain("123456");
    expect(JSON.stringify(info.mock.calls[0])).toContain("owner@example.com");
    info.mockRestore();
  });

  it("prints the OTP in production when no provider is configured", async () => {
    const info = spyOn(console, "info").mockImplementation(() => undefined);
    await sendVerificationOTP({
      email: "owner@example.com",
      otp: "123456",
      type: "sign-in",
    }, { env: { NODE_ENV: "production" } });
    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls[0])).toContain("123456");
    expect(JSON.stringify(info.mock.calls[0])).toContain("owner@example.com");
    info.mockRestore();
  });
});
