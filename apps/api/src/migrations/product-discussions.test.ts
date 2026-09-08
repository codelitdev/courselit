import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";
import { importLegacyLearners } from "./learners.js";
import { importLegacyProductDiscussions } from "./product-discussions.js";
import { importLegacyProducts } from "./products.js";

function doc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  await importLegacyDomains(runtime.db, {
    clock,
    mode: "apply",
    records: [
      {
        _id: "legacy-domain-discussions",
        name: "discussion-school",
        email: world.owner.email,
      },
    ],
  });
  await importLegacyLearners(runtime.db, {
    clock,
    mode: "apply",
    records: [
      {
        _id: "legacy-learner-discussion",
        domain: "legacy-domain-discussions",
        email: "discussion-learner@example.com",
        name: "Discussion Learner",
      },
    ],
  });
  await importLegacyProducts(runtime.db, {
    clock,
    mode: "apply",
    courses: [
      {
        _id: "legacy-course-discussions",
        courseId: "legacy-course-discussions",
        domain: "legacy-domain-discussions",
        title: "Discussion course",
        slug: "discussion-course",
        type: "course",
        creatorId: world.owner.id,
        published: true,
        privacy: "public",
        description: JSON.stringify(doc("A course with discussions")),
        discussions: true,
        groups: [
          {
            _id: "legacy-group-discussions",
            name: "Discussion section",
            rank: 1,
            lessonsOrder: ["legacy-lesson-discussions"],
          },
        ],
        lessons: ["legacy-lesson-discussions"],
      },
    ],
    lessons: [
      {
        lessonId: "legacy-lesson-discussions",
        courseId: "legacy-course-discussions",
        groupId: "legacy-group-discussions",
        title: "Discussion lesson",
        type: "text",
        content: doc("Lesson content"),
        published: true,
      },
    ],
  });
  const school = (
    await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.subdomain, "discussion-school"))
      .limit(1)
  )[0]!;
  return { clock, runtime, world, school };
}

function exportData(adminUserId: string) {
  return {
    comments: [
      {
        commentId: "legacy-discussion-comment-1",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        userId: "legacy-learner-discussion",
        userKind: "learner",
        content: doc("A learner question"),
        likesCount: 1,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
      {
        commentId: "legacy-discussion-comment-deleted",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        userId: "legacy-learner-discussion",
        userKind: "learner",
        deleted: true,
        deletedAt: "2025-01-03T00:00:00.000Z",
        deletedByRole: "author",
        deleteReason: "Removed by the author",
        createdAt: "2025-01-03T00:00:00.000Z",
        updatedAt: "2025-01-03T00:00:00.000Z",
      },
    ],
    // The child is intentionally listed first. The importer must preserve the
    // parent reply FK instead of depending on export order.
    replies: [
      {
        replyId: "legacy-discussion-reply-2",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        commentId: "legacy-discussion-comment-1",
        parentReplyId: "legacy-discussion-reply-1",
        userId: "legacy-learner-discussion",
        userKind: "learner",
        content: doc("A nested answer"),
        createdAt: "2025-01-05T00:00:00.000Z",
        updatedAt: "2025-01-05T00:00:00.000Z",
      },
      {
        replyId: "legacy-discussion-reply-1",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        commentId: "legacy-discussion-comment-1",
        userId: adminUserId,
        userKind: "admin",
        content: doc("The first answer"),
        createdAt: "2025-01-04T00:00:00.000Z",
        updatedAt: "2025-01-04T00:00:00.000Z",
      },
    ],
    likes: [
      {
        likeId: "legacy-discussion-like-1",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        contentType: "comment",
        contentId: "legacy-discussion-comment-1",
        userId: "legacy-learner-discussion",
        userKind: "learner",
        createdAt: "2025-01-06T00:00:00.000Z",
      },
    ],
    summaries: [
      {
        summaryId: "legacy-discussion-summary-1",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        commentsCount: 1,
        repliesCount: 2,
        totalCount: 3,
        activityCountIncludingDeleted: 4,
        lastActivityAt: "2025-01-05T00:00:00.000Z",
        lastCommentId: "legacy-discussion-comment-1",
        lastReplyId: "legacy-discussion-reply-2",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-05T00:00:00.000Z",
      },
    ],
    subscribers: [
      {
        subscriptionId: "legacy-discussion-subscription-1",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        userId: "legacy-learner-discussion",
        userKind: "learner",
        subscription: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ],
    reports: [
      {
        reportId: "legacy-discussion-report-1",
        domain: "legacy-domain-discussions",
        productId: "legacy-course-discussions",
        entityType: "lesson",
        entityId: "legacy-lesson-discussions",
        contentType: "comment",
        contentId: "legacy-discussion-comment-1",
        userId: "legacy-learner-discussion",
        userKind: "learner",
        reason: "Needs moderation",
        status: "pending",
        createdAt: "2025-01-07T00:00:00.000Z",
        updatedAt: "2025-01-07T00:00:00.000Z",
      },
    ],
  } as const;
}

describe.serial("legacy product discussion migration", () => {
  it("dry-runs, applies all discussion records, preserves deletion, and is idempotent", async () => {
    const { clock, runtime, world, school } = await setup();
    const data = exportData(world.owner.id);

    const dryRun = await importLegacyProductDiscussions(runtime.db, {
      clock,
      mode: "dry_run",
      exportData: data,
    });
    expect(dryRun.counts).toMatchObject({
      seen: 8,
      ready: 8,
      imported: 0,
      rejected: 0,
    });
    expect(await runtime.db.select().from(schema.productDiscussionComments)).toHaveLength(0);

    const applied = await importLegacyProductDiscussions(runtime.db, {
      clock,
      mode: "apply",
      exportData: data,
    });
    expect(applied.counts).toMatchObject({
      seen: 8,
      ready: 8,
      imported: 8,
      rejected: 0,
      commentsImported: 2,
      repliesImported: 2,
      likesImported: 1,
      summariesImported: 1,
      subscribersImported: 1,
      reportsImported: 1,
    });

    const comments = await runtime.db
      .select()
      .from(schema.productDiscussionComments)
      .where(eq(schema.productDiscussionComments.schoolId, school.id));
    expect(comments).toHaveLength(2);
    expect(comments.find((item) => item.publicId === "legacy-discussion-comment-deleted"))
      .toMatchObject({ deletedByRole: "author", likesCount: 0 });
    expect(JSON.parse(comments.find((item) => item.publicId === "legacy-discussion-comment-deleted")!.content))
      .toEqual({ type: "doc", content: [] });

    const replies = await runtime.db
      .select()
      .from(schema.productDiscussionReplies)
      .where(eq(schema.productDiscussionReplies.schoolId, school.id));
    const parent = replies.find((item) => item.publicId === "legacy-discussion-reply-1")!;
    const child = replies.find((item) => item.publicId === "legacy-discussion-reply-2")!;
    expect(child.parentReplyId).toBe(parent.id);

    expect(await runtime.db.select().from(schema.productDiscussionLikes)).toHaveLength(1);
    expect(await runtime.db.select().from(schema.productDiscussionSubscribers)).toHaveLength(1);
    expect(await runtime.db.select().from(schema.productDiscussionReports)).toHaveLength(1);
    expect(
      await runtime.db
        .select()
        .from(schema.productDiscussionSummaries)
        .where(eq(schema.productDiscussionSummaries.totalCount, 3)),
    ).toHaveLength(1);

    const second = await importLegacyProductDiscussions(runtime.db, {
      clock,
      mode: "apply",
      exportData: data,
    });
    expect(second.counts).toMatchObject({
      imported: 0,
      alreadyMapped: 8,
      rejected: 0,
    });
    await runtime.close();
  });

  it("rejects unresolved identities and invalid live content without inventing authors", async () => {
    const { clock, runtime, world } = await setup();
    const result = await importLegacyProductDiscussions(runtime.db, {
      clock,
      mode: "apply",
      exportData: {
        comments: [
          {
            commentId: "legacy-discussion-invalid-content",
            productId: "legacy-course-discussions",
            entityType: "lesson",
            entityId: "legacy-lesson-discussions",
            userId: world.owner.id,
            content: { type: "doc", content: [] },
          },
          {
            commentId: "legacy-discussion-unknown-author",
            productId: "legacy-course-discussions",
            entityType: "lesson",
            entityId: "legacy-lesson-discussions",
            userId: "missing-legacy-user",
            content: doc("Cannot resolve this author"),
          },
        ],
        replies: [],
        likes: [],
        summaries: [],
        subscribers: [],
        reports: [],
      },
    });
    expect(result.counts).toMatchObject({ seen: 2, imported: 0, rejected: 2 });
    expect(result.rejectionByCode).toMatchObject({
      invalid_content: 1,
      invalid_identity: 1,
    });
    expect(await runtime.db.select().from(schema.productDiscussionComments)).toHaveLength(0);
    await runtime.close();
  });
});
