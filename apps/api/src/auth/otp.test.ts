import { describe, expect, it, spyOn } from "bun:test";
import { sendVerificationOTP } from "./options.js";

describe("sendVerificationOTP", () => {
  it("prints the OTP to the API console outside production", async () => {
    const info = spyOn(console, "info").mockImplementation(() => undefined);
    let delivered: unknown;
    await sendVerificationOTP({
      email: "owner@example.com",
      otp: "123456",
      type: "sign-in",
    }, {
      env: { NODE_ENV: "development" },
      deliver: async (message) => {
        delivered = message;
        return "sendlit";
      },
    });
    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls[0])).toContain("123456");
    expect(JSON.stringify(info.mock.calls[0])).toContain("owner@example.com");
    expect(delivered).toMatchObject({ to: "owner@example.com" });
    info.mockRestore();
  });

  it("never logs the OTP in production, including when delivery fails", async () => {
    const info = spyOn(console, "info").mockImplementation(() => undefined);
    const deliveryError = new Error("SendLit returned 422");

    await expect(
      sendVerificationOTP({
        email: "owner@example.com",
        otp: "123456",
        type: "sign-in",
      }, {
        env: { NODE_ENV: "production" },
        deliver: async () => {
          throw deliveryError;
        },
      }),
    ).rejects.toBe(deliveryError);

    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});
