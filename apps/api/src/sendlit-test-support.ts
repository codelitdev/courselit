/** SendLit answers JSON with `content-type: application/json`, and the SDK
 * only parses bodies that say so. Test fakes of SendLit use this. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** SendLit objects as its contract returns them (`@sendlit/api-contract`). */
export const sendLitContact = (over: Record<string, unknown> = {}) => ({
  contactId: "c_1",
  email: "learner@test.com",
  name: null,
  subscribed: true,
  customFields: {},
  tags: [],
  unsubscribeToken: "tok_1",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

export const sendLitSegment = (over: Record<string, unknown> = {}) => ({
  segmentId: "seg_1",
  name: "VIP Segment",
  filter: { aggregator: "and", filters: [] },
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

export const sendLitSequence = (over: Record<string, unknown> = {}) => ({
  sequenceId: "seq_1",
  type: "sequence",
  title: "Welcome Sequence",
  status: "draft",
  deliverySource: null,
  emailsOrder: [],
  entrants: [],
  report: {},
  viewInBrowser: false,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  emails: [],
  ...over,
});

export const sendLitTemplate = (over: Record<string, unknown> = {}) => ({
  templateId: "tmpl_1",
  title: "Welcome Template",
  purpose: "marketing",
  content: { style: {}, meta: {}, content: [] },
  requiredVariables: [],
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

export const sendLitEmail = (over: Record<string, unknown> = {}) => ({
  emailId: "em_1",
  subject: "Welcome",
  content: { style: {}, meta: {}, content: [] },
  delayInMillis: 24 * 60 * 60 * 1000,
  published: false,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});
