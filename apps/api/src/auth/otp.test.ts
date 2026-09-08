import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { sendVerificationOTP } from "./options.js";

describe("sendVerificationOTP", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("prints the OTP to the API console outside production", async () => {
    process.env.NODE_ENV = "development";
    const info = spyOn(console, "info").mockImplementation(() => undefined);
    await sendVerificationOTP({
      email: "owner@example.com",
      otp: "123456",
      type: "sign-in",
    });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]?.[0])).toContain("123456");
    expect(String(info.mock.calls[0]?.[0])).toContain("owner@example.com");
    info.mockRestore();
  });

  it("does not print the OTP in production", async () => {
    process.env.NODE_ENV = "production";
    const info = spyOn(console, "info").mockImplementation(() => undefined);
    const error = spyOn(console, "error").mockImplementation(() => undefined);
    await sendVerificationOTP({
      email: "owner@example.com",
      otp: "123456",
      type: "sign-in",
    });
    expect(info).not.toHaveBeenCalled();
    expect(String(error.mock.calls[0]?.[0] ?? "")).not.toContain("123456");
    error.mockRestore();
    info.mockRestore();
  });
});
