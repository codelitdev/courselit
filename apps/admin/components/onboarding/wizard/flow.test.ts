import { describe, expect, it } from "bun:test";
import {
  AI_TIMEOUT_MS,
  aiPromptFor,
  aiStatusAfterPoll,
  buildFlow,
  canSubmitSubdomain,
  deriveSiteDomain,
  detectLocaleDefaults,
  ERROR_COPY,
  emptyWizardData,
  formatMailingAddress,
  hasNewConnection,
  hasUploadsInFlight,
  isValidSubdomain,
  nextStep,
  offerSharePath,
  parseDraft,
  previousStep,
  resolveResumeStep,
  resumeRows,
  sanitizeSubdomainInput,
  serializeDraft,
  slugify,
  stepperGroups,
  stepperIndex,
  toServerStep,
  type UploadedFile,
  validateBuild,
  validateEmail,
  validateSchool,
} from "./flow";

const file = (over: Partial<UploadedFile> = {}): UploadedFile => ({
  id: "f1",
  name: "guide.pdf",
  size: 2048,
  mediaId: "m1",
  url: "https://media.example/guide.pdf",
  thumbnailUrl: null,
  mimeType: "application/pdf",
  status: "done",
  pct: 100,
  ...over,
});

describe("step flow", () => {
  it("includes about only on first run and plan only when hosted", () => {
    expect(buildFlow({ firstRun: true, hosted: true, hasOffer: true })).toEqual([
      "about",
      "school",
      "offer",
      "build",
      "brand",
      "email",
      "plan",
      "live",
    ]);
    expect(buildFlow({ firstRun: false, hosted: false, hasOffer: false })).toEqual([
      "school",
      "offer",
      "brand",
      "email",
      "live",
    ]);
  });

  it("moves forward and back, clamping at the ends", () => {
    const flow = buildFlow({ firstRun: false, hosted: false, hasOffer: true });
    expect(nextStep(flow, "offer")).toBe("build");
    expect(nextStep(flow, "live")).toBe("live");
    expect(previousStep(flow, "build")).toBe("offer");
    expect(previousStep(flow, "school")).toBe("school");
  });

  it("groups offer and build in one stepper entry", () => {
    const groups = stepperGroups({ firstRun: true, hosted: true });
    expect(groups.map((group) => group.label)).toEqual([
      "You",
      "School",
      "First offer",
      "Your site",
      "Email",
      "Plan",
      "Live",
    ]);
    expect(stepperIndex(groups, "build")).toBe(stepperIndex(groups, "offer"));
    expect(stepperGroups({ firstRun: false, hosted: false }).map((g) => g.key)).toEqual(
      ["school", "offer", "site", "email", "live"],
    );
  });

  it("never stores the about step and resumes sensibly", () => {
    expect(toServerStep("about")).toBe("school");
    expect(toServerStep("email")).toBe("email");
    expect(resolveResumeStep("build", { hosted: true, hasOffer: false })).toBe("brand");
    expect(resolveResumeStep("plan", { hosted: false, hasOffer: true })).toBe("live");
    expect(resolveResumeStep("school", { hosted: true, hasOffer: true })).toBe("offer");
    expect(resolveResumeStep("brand", { hosted: true, hasOffer: true })).toBe("brand");
  });
});

describe("subdomain rules", () => {
  it("accepts 3 to 63 lowercase letters, digits and single hyphens", () => {
    expect(isValidSubdomain("inkwell-studio")).toBe(true);
    expect(isValidSubdomain("abc")).toBe(true);
    expect(isValidSubdomain("ab")).toBe(false);
    expect(isValidSubdomain("-abc")).toBe(false);
    expect(isValidSubdomain("abc-")).toBe(false);
    expect(isValidSubdomain("a--b")).toBe(false);
    expect(isValidSubdomain("Abc")).toBe(false);
    expect(isValidSubdomain("a".repeat(64))).toBe(false);
    expect(isValidSubdomain("a".repeat(63))).toBe(true);
  });

  it("slugifies school names", () => {
    expect(slugify("Inkwell Studio")).toBe("inkwell-studio");
    expect(slugify("  Café  Münster!! ")).toBe("cafe-munster");
    expect(slugify("---")).toBe("");
    expect(slugify("a".repeat(80)).length).toBe(63);
  });

  it("sanitizes typed subdomains", () => {
    expect(sanitizeSubdomainInput("My School!")).toBe("myschool");
    expect(sanitizeSubdomainInput("a--b")).toBe("a-b");
  });

  it("only submits an available, valid address", () => {
    expect(canSubmitSubdomain("ok", "inkwell")).toBe(true);
    expect(canSubmitSubdomain("checking", "inkwell")).toBe(false);
    expect(canSubmitSubdomain("taken", "inkwell")).toBe(false);
    expect(canSubmitSubdomain("ok", "no")).toBe(false);
  });
});

describe("locale defaults", () => {
  it("prefills currency, language and country from the browser locale", () => {
    expect(detectLocaleDefaults("en-GB")).toEqual({
      currency: "GBP",
      language: "en",
      country: "GB",
    });
    expect(detectLocaleDefaults("de-DE")).toEqual({
      currency: "EUR",
      language: "de",
      country: "DE",
    });
    expect(detectLocaleDefaults("hi-IN").currency).toBe("INR");
  });

  it("falls back for unsupported languages and missing regions", () => {
    expect(detectLocaleDefaults("ja-JP").language).toBe("en");
    expect(detectLocaleDefaults("fr").currency).toBe("USD");
    expect(detectLocaleDefaults(undefined).language).toBe("en");
  });
});

describe("validation", () => {
  it("requires a school name and an available address", () => {
    expect(validateSchool({ school: "", subdomain: "abc" }, "ok").school).toBeDefined();
    expect(
      validateSchool({ school: "A", subdomain: "ab" }, "ok").subdomain,
    ).toBeDefined();
    expect(
      validateSchool({ school: "A", subdomain: "abc" }, "taken").subdomain,
    ).toBeDefined();
    expect(validateSchool({ school: "A", subdomain: "abc" }, "ok")).toEqual({});
    expect(
      validateSchool({ school: "paypal.com support", subdomain: "abc" }, "ok").school,
    ).toBe(ERROR_COPY.schoolLink);
    expect(validateSchool({ school: "x".repeat(81), subdomain: "abc" }, "ok").school).toBe(
      ERROR_COPY.schoolLong,
    );
    expect(validateSchool({ school: "St. Mary's Guitar School", subdomain: "abc" }, "ok")).toEqual({});
  });

  it("validates each offer form", () => {
    const course = emptyWizardData();
    course.offer = "course";
    expect(validateBuild(course).title).toBeDefined();
    course.course.title = "Watercolour Basics";
    expect(validateBuild(course)).toEqual({});

    const community = emptyWizardData();
    community.offer = "community";
    community.community.name = "Circle";
    community.community.join = "request";
    community.community.question = " ";
    expect(validateBuild(community).question).toBeDefined();

    const download = emptyWizardData();
    download.offer = "download";
    download.download.title = "Guide";
    expect(validateBuild(download).files).toBeDefined();
    download.download.files = [file({ status: "uploading", mediaId: null })];
    expect(validateBuild(download).files).toBeDefined();
    download.download.files = [file()];
    expect(validateBuild(download)).toEqual({});
  });

  it("requires a street address and postal code for email", () => {
    const data = emptyWizardData();
    expect(Object.keys(validateEmail(data.email)).sort()).toEqual([
      "address",
      "postal",
    ]);
    data.email.line1 = "18 Harbour Lane";
    data.email.postal = "BS1 4RN";
    expect(validateEmail(data.email)).toEqual({});
  });

  it("detects uploads in flight", () => {
    const data = emptyWizardData();
    expect(hasUploadsInFlight(data)).toBe(false);
    data.course.cover = file({ status: "uploading" });
    expect(hasUploadsInFlight(data)).toBe(true);
  });
});

describe("draft serialization", () => {
  it("round-trips finished data and drops in-flight uploads", () => {
    const data = emptyWizardData({ currency: "GBP", language: "en", country: "GB" });
    data.school = "Inkwell Studio";
    data.subdomain = "inkwell-studio";
    data.offer = "download";
    data.price = "paid";
    data.download.title = "Guide";
    data.download.files = [
      file(),
      file({ id: "f2", status: "uploading", mediaId: null }),
    ];
    data.course.cover = file({ id: "c", status: "uploading", mediaId: null });
    data.brand.tagline = "Painting lessons";
    data.email.line1 = "18 Harbour Lane";
    data.refs = { productId: "p1", fileLessons: { f1: "l1" }, emailSaved: true };

    const restored = parseDraft(JSON.parse(JSON.stringify(serializeDraft(data))));
    expect(restored.school).toBe("Inkwell Studio");
    expect(restored.offer).toBe("download");
    expect(restored.price).toBe("paid");
    expect(restored.download.files).toHaveLength(1);
    expect(restored.download.files[0]?.status).toBe("done");
    expect(restored.course.cover).toBeNull();
    expect(restored.brand.tagline).toBe("Painting lessons");
    expect(restored.refs.productId).toBe("p1");
    expect(restored.refs.fileLessons).toEqual({ f1: "l1" });
    expect(restored.refs.emailSaved).toBe(true);
  });

  it("tolerates empty and malformed drafts", () => {
    expect(parseDraft({}).offer).toBeNull();
    expect(parseDraft(null).brand.themeId).toBe("classic");
    const weird = parseDraft({
      offer: "banana",
      price: 4,
      course: "nope",
      download: { files: [{ id: 1 }, "x"] },
      brand: { tagline: "x".repeat(200) },
    });
    expect(weird.offer).toBeNull();
    expect(weird.price).toBe("free");
    expect(weird.download.files).toEqual([]);
    expect(weird.brand.tagline.length).toBe(90);
  });
});

describe("copy helpers", () => {
  it("builds share paths", () => {
    const data = emptyWizardData();
    data.offer = "community";
    expect(offerSharePath(data)).toBe("/join");
    data.offer = "course";
    data.course.title = "Watercolour Basics";
    expect(offerSharePath(data)).toBe("/p/watercolour-basics");
    data.refs.productSlug = "wc-basics";
    expect(offerSharePath(data)).toBe("/p/wc-basics");
    data.offer = null;
    expect(offerSharePath(data)).toBe("");
  });

  it("tailors the AI prompt to the offer", () => {
    expect(aiPromptFor("course", "Inkwell", "Watercolour")).toContain("Watercolour");
    expect(aiPromptFor("community", "Inkwell", "")).toContain("Inkwell community");
    expect(aiPromptFor("download", "Inkwell", "")).toContain("[your guide]");
    expect(aiPromptFor(null, "", "")).toContain("your school");
  });

  it("formats the mailing address", () => {
    const data = emptyWizardData();
    data.email = {
      ...data.email,
      line1: "18 Harbour Lane",
      city: "Bristol",
      postal: "BS1 4RN",
      country: "GB",
    };
    expect(formatMailingAddress(data.email)).toBe(
      "18 Harbour Lane\nBristol, BS1 4RN\nUnited Kingdom",
    );
  });
});

describe("assistant connection polling", () => {
  it("moves to connected, detected and timed out", () => {
    const base = {
      newConnection: false,
      newProduct: false,
      waitingSince: 0,
      now: 1000,
    };
    expect(aiStatusAfterPoll({ ...base, current: "waiting" })).toBe("waiting");
    expect(
      aiStatusAfterPoll({ ...base, current: "waiting", newConnection: true }),
    ).toBe("connected");
    expect(aiStatusAfterPoll({ ...base, current: "connected", newProduct: true })).toBe(
      "detected",
    );
    expect(
      aiStatusAfterPoll({ ...base, current: "waiting", now: AI_TIMEOUT_MS + 1 }),
    ).toBe("failed");
    expect(
      aiStatusAfterPoll({ ...base, current: "connected", now: AI_TIMEOUT_MS + 1 }),
    ).toBe("connected");
  });

  it("notices new or newly used connections", () => {
    const baseline = [{ id: "a", lastUsedAt: null }];
    expect(hasNewConnection(baseline, [{ id: "a", lastUsedAt: null }], 0)).toBe(false);
    expect(
      hasNewConnection(baseline, [...baseline, { id: "b", lastUsedAt: null }], 0),
    ).toBe(true);
    expect(
      hasNewConnection(
        baseline,
        [{ id: "a", lastUsedAt: new Date(5000).toISOString() }],
        1000,
      ),
    ).toBe(true);
  });
});

describe("site domain", () => {
  it("learns the domain from an existing school", () => {
    expect(
      deriveSiteDomain(
        [{ subdomain: "inkwell", storefrontHost: "inkwell.courselit.app" }],
        "x",
      ),
    ).toBe("courselit.app");
  });

  it("falls back to the admin hostname", () => {
    expect(deriveSiteDomain([], "admin.courselit.app")).toBe("courselit.app");
    expect(deriveSiteDomain([], "localhost")).toBe("localhost");
    expect(
      deriveSiteDomain([{ subdomain: "a", storefrontHost: null }], "courselit.app"),
    ).toBe("courselit.app");
  });
});

describe("resume summary", () => {
  const env = { firstRun: false, hosted: true };
  const plan = (trialEndsAt: string | null) =>
    resumeRows("offer", env, emptyWizardData(), "Owner", trialEndsAt).find(
      (row) => row.key === "plan",
    )?.desc;

  it("asks for a plan when the school has none", () => {
    expect(plan(null)).toBe("Choose a CourseLit plan to go live");
  });

  it("names the end of a running trial instead", () => {
    expect(plan("2026-11-28T12:00:00.000Z")).toStartWith("Free trial until");
  });
});
