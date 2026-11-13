import { describe, expect, it } from "bun:test";
import { isCrossOriginWrite } from "./request-origin";

const headers = (values: Record<string, string>) => new Headers(values);

describe("isCrossOriginWrite", () => {
  it("lets this origin's own pages write", () => {
    expect(
      isCrossOriginWrite(
        "POST",
        headers({
          host: "admin.example",
          origin: "https://admin.example",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(false);
  });

  it("refuses writes from a sibling subdomain, which shares the site's cookies", () => {
    expect(
      isCrossOriginWrite(
        "POST",
        headers({
          host: "admin.example",
          origin: "https://school.example",
          "sec-fetch-site": "same-site",
        }),
      ),
    ).toBe(true);
    expect(
      isCrossOriginWrite(
        "DELETE",
        headers({ host: "admin.example", origin: "https://school.example" }),
      ),
    ).toBe(true);
    expect(
      isCrossOriginWrite(
        "PATCH",
        headers({ host: "admin.example", "sec-fetch-site": "cross-site" }),
      ),
    ).toBe(true);
  });

  it("refuses an opaque origin", () => {
    expect(
      isCrossOriginWrite("POST", headers({ host: "admin.example", origin: "null" })),
    ).toBe(true);
  });

  it("matches the public host a reverse proxy forwards", () => {
    expect(
      isCrossOriginWrite(
        "POST",
        headers({
          host: "127.0.0.1:3200",
          "x-forwarded-host": "admin.example:4443",
          origin: "https://admin.example:4443",
        }),
      ),
    ).toBe(false);
  });

  it("leaves reads and non-browser clients alone", () => {
    expect(
      isCrossOriginWrite(
        "GET",
        headers({ host: "admin.example", "sec-fetch-site": "cross-site" }),
      ),
    ).toBe(false);
    expect(isCrossOriginWrite("POST", headers({ host: "admin.example" }))).toBe(false);
  });
});
