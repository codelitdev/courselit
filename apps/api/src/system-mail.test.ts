import { describe, expect, it, spyOn } from "bun:test";
import { sendSystemMail } from "./system-mail.js";

const message = {
  to: "teammate@example.com",
  subject: "Welcome",
  text: "Your invitation is ready.",
  html: "<p>Your invitation is ready.</p>",
};

describe("system mail delivery", () => {
  it("uses SendLit when the platform team key is configured", async () => {
    let request: { url: string; init: RequestInit } | null = null;
    const result = await sendSystemMail(message, {
      env: {
        NODE_ENV: "production",
        SENDLIT_SERVER: "https://sendlit.example.test",
        SENDLIT_PLATFORM_TEAM_API_KEY: "sl_platform_key",
        EMAIL_HOST: "smtp.example.test",
      },
      fetcher: async (input, init) => {
        request = { url: String(input), init: init as RequestInit };
        return new Response(JSON.stringify({ txeId: "txe_123", status: "queued" }), {
          status: 202,
          headers: { "content-type": "application/json" },
        });
      },
      transportFactory: () => {
        throw new Error("SMTP must not be selected when SendLit is configured");
      },
    });

    expect(result).toBe("sendlit");
    expect(request).not.toBeNull();
    const capturedRequest = request as unknown as { url: string; init: RequestInit };
    expect(capturedRequest.url).toBe("https://sendlit.example.test/emails");
    expect((capturedRequest.init.headers as Record<string, string>)["x-sendlit-apikey"]).toBe(
      "sl_platform_key",
    );
    expect(JSON.parse(capturedRequest.init.body as string)).toMatchObject({
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  });

  it("falls back to SMTP when SendLit is not configured", async () => {
    let transportOptions: unknown;
    let sentMessage: unknown;
    const result = await sendSystemMail(message, {
      env: {
        NODE_ENV: "production",
        EMAIL_HOST: "smtp.example.test",
        EMAIL_PORT: "2525",
        EMAIL_USER: "mailer",
        EMAIL_PASS: "secret",
        EMAIL_FROM: "CourseLit <noreply@example.test>",
      },
      transportFactory: (options) => {
        transportOptions = options;
        return {
          sendMail: async (input) => {
            sentMessage = input;
          },
        };
      },
    });

    expect(result).toBe("smtp");
    expect(transportOptions).toEqual({
      host: "smtp.example.test",
      port: 2525,
      auth: { user: "mailer", pass: "secret" },
    });
    expect(sentMessage).toMatchObject({
      from: "CourseLit <noreply@example.test>",
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  });

  it("dumps mail to the console when neither provider is configured", async () => {
    const info = spyOn(console, "info").mockImplementation(() => undefined);

    const result = await sendSystemMail(message, {
      env: { NODE_ENV: "production" },
    });

    expect(result).toBe("console");
    expect(info).toHaveBeenCalledWith("[CourseLit] System email", message);
    info.mockRestore();
  });
});
