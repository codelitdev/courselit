import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "@codelitdev/platform";
import * as schema from "../db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";
import { importLegacyCommunities } from "./communities.js";
import { importLegacyLearners } from "./learners.js";

describe.serial("legacy community migration", () => {
  it("imports community-owned data, flattens replies, and is idempotent", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const domain = await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [
        {
          _id: "legacy-domain-community",
          name: "community-school",
          email: world.owner.email,
        },
      ],
    });
    expect(domain.counts.imported).toBe(1);
    const school = (
      await runtime.db
        .select({ id: schema.schools.id })
        .from(schema.schools)
        .where(eq(schema.schools.subdomain, "community-school"))
    )[0]!;
    const learnerSourceId = "legacy-learner-community-1";
    await importLegacyLearners(runtime.db, {
      clock,
      mode: "apply",
      records: [
        {
          _id: learnerSourceId,
          domain: "legacy-domain-community",
          email: "learner@example.com",
          name: "Community Learner",
        },
      ],
    });
    const learner = (
      await runtime.db
        .select()
        .from(schema.learners)
        .where(eq(schema.learners.publicId, learnerSourceId))
    )[0]!;
    const learnerId = learner.id;
    const mediaId = uuidv7(clock);
    await runtime.db.insert(schema.media).values({
      id: mediaId,
      publicId: "media-community-1",
      schoolId: school.id,
      mediaLitId: "medialit-community-1",
      canonicalUrl: "https://media.example/community-1.png",
      thumbnailUrl: null,
      fileName: "community-1.png",
      mimeType: "image/png",
      byteSize: 128,
      width: 640,
      height: 360,
      kind: "image",
      altText: "Community attachment",
      caption: "",
      accessPolicy: "public",
      status: "active",
      createdBy: world.owner.id,
      createdByLearnerId: null,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await runtime.db.insert(schema.migrationMappings).values({
      id: uuidv7(clock),
      sourceSystem: "courselit-mongo",
      sourceCollection: "media",
      sourceId: "legacy-media-community-1",
      targetTable: "media",
      targetId: mediaId,
      schoolId: school.id,
      runId: domain.runId,
      createdAt: clock.now(),
    });

    const result = await importLegacyCommunities(runtime.db, {
      clock,
      mode: "apply",
      exportData: {
        communities: [
          {
            communityId: "legacy-community-1",
            domain: "legacy-domain-community",
            name: "Creators",
            slug: "creators",
            description: { type: "doc", content: [] },
            banner: "Welcome",
            categories: ["General", "Questions"],
            enabled: true,
            autoAcceptMembers: false,
            creatorId: world.owner.id,
          },
        ],
        plans: [
          {
            planId: "legacy-community-plan",
            communityId: "legacy-community-1",
            name: "Free access",
            type: "free",
            isDefault: true,
          },
        ],
        memberships: [
          {
            membershipId: "legacy-community-membership",
            communityId: "legacy-community-1",
            userId: learnerSourceId,
            userKind: "learner",
            paymentPlanId: "legacy-community-plan",
            status: "active",
            role: "member",
            joiningReason: "I want to learn with other creators.",
          },
        ],
        posts: [
          {
            postId: "legacy-community-post-1",
            communityId: "legacy-community-1",
            userId: world.owner.id,
            userKind: "admin",
            title: "Welcome",
            content: { type: "doc", content: [] },
            category: "General",
            pinned: true,
            media: [{ mediaId: "legacy-media-community-1" }],
          },
          {
            postId: "legacy-community-post-2",
            communityId: "legacy-community-1",
            userId: learnerSourceId,
            userKind: "learner",
            title: "Question",
            content: "How do I get started?",
            category: "Questions",
          },
        ],
        comments: [
          {
            commentId: "legacy-community-comment-1",
            postId: "legacy-community-post-2",
            userId: world.owner.id,
            userKind: "admin",
            content: "Start with the welcome post.",
            replies: [
              {
                replyId: "legacy-community-reply-1",
                userId: learnerSourceId,
                userKind: "learner",
                content: "Thank you!",
              },
            ],
          },
        ],
        reactions: [
          {
            reactionId: "legacy-community-reaction-1",
            entityType: "post",
            entityId: "legacy-community-post-2",
            userId: learnerSourceId,
            userKind: "learner",
            emoji: "👍",
          },
        ],
        subscribers: [
          {
            subscriptionId: "legacy-community-subscription-1",
            postId: "legacy-community-post-2",
            userId: learnerSourceId,
            userKind: "learner",
          },
        ],
        reports: [
          {
            reportId: "legacy-community-report-1",
            communityId: "legacy-community-1",
            contentType: "post",
            contentId: "legacy-community-post-2",
            userId: learnerSourceId,
            userKind: "learner",
            reason: "Needs review",
          },
        ],
      },
    });

    expect(result.counts).toMatchObject({
      seen: 9,
      ready: 10,
      imported: 10,
      rejected: 0,
      communitiesImported: 1,
      plansImported: 1,
      membershipsImported: 1,
      postsImported: 2,
      commentsImported: 2,
      reactionsImported: 1,
      subscribersImported: 1,
      reportsImported: 1,
    });
    const community = (
      await runtime.db
        .select()
        .from(schema.communities)
        .where(eq(schema.communities.publicId, "legacy-community-1"))
    )[0]!;
    expect(community).toMatchObject({ schoolId: school.id, slug: "creators", enabled: true });
    expect(JSON.parse(community.categories)).toEqual(["General", "Questions"]);
    const comments = await runtime.db
      .select()
      .from(schema.communityComments)
      .where(eq(schema.communityComments.communityId, community.id));
    expect(comments).toHaveLength(2);
    expect(comments.find((comment) => comment.publicId === "legacy-community-reply-1")?.parentCommentId).toBe(
      comments.find((comment) => comment.publicId === "legacy-community-comment-1")?.id,
    );
    expect(
      await runtime.db
        .select()
        .from(schema.communityMemberships)
        .where(eq(schema.communityMemberships.learnerId, learnerId)),
    ).toHaveLength(1);
    expect(
      await runtime.db
        .select()
        .from(schema.mediaReferences)
        .where(
          and(
            eq(schema.mediaReferences.mediaId, mediaId),
            eq(schema.mediaReferences.resourcePublicId, "legacy-community-post-1"),
          ),
        ),
    ).toHaveLength(1);

    const second = await importLegacyCommunities(runtime.db, {
      clock,
      mode: "apply",
      exportData: {
        communities: [{ communityId: "legacy-community-1", domain: "legacy-domain-community", name: "Creators", slug: "creators", creatorId: world.owner.id }],
        plans: [{ planId: "legacy-community-plan", communityId: "legacy-community-1", name: "Free access", type: "free" }],
        memberships: [{ membershipId: "legacy-community-membership", communityId: "legacy-community-1", userId: learnerSourceId, userKind: "learner" }],
        posts: [{ postId: "legacy-community-post-1", communityId: "legacy-community-1", userId: world.owner.id, userKind: "admin" }],
        comments: [{ commentId: "legacy-community-comment-1", postId: "legacy-community-post-2", userId: world.owner.id, userKind: "admin" }],
        reactions: [{ reactionId: "legacy-community-reaction-1", entityType: "post", entityId: "legacy-community-post-2", userId: learnerSourceId, userKind: "learner", emoji: "👍" }],
        subscribers: [{ subscriptionId: "legacy-community-subscription-1", postId: "legacy-community-post-2", userId: learnerSourceId, userKind: "learner" }],
        reports: [{ reportId: "legacy-community-report-1", communityId: "legacy-community-1", contentType: "post", contentId: "legacy-community-post-2", userId: learnerSourceId, userKind: "learner" }],
      },
    });
    expect(second.counts.alreadyMapped).toBe(8);
    expect(second.counts.imported).toBe(0);
    await runtime.close();
  });

  it("rejects media until a MediaLit catalog mapping exists", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [{ _id: "legacy-domain-media-community", name: "media-community", email: world.owner.email }],
    });
    const result = await importLegacyCommunities(runtime.db, {
      clock,
      exportData: {
        communities: [{ communityId: "legacy-community-media", domain: "legacy-domain-media-community", name: "Media", creatorId: world.owner.id }],
        plans: [],
        memberships: [],
        posts: [{ postId: "legacy-post-media", communityId: "legacy-community-media", userId: world.owner.id, userKind: "admin", media: [{ mediaId: "legacy-media-1" }] }],
        comments: [],
        reactions: [],
        subscribers: [],
        reports: [],
      },
      mode: "apply",
    });
    expect(result.rejectionByCode.media_requires_medialit).toBe(1);
    expect(result.counts.imported).toBe(1);
    expect(
      await runtime.db
        .select()
        .from(schema.communityPosts)
        .where(eq(schema.communityPosts.publicId, "legacy-post-media")),
    ).toHaveLength(0);
    await runtime.close();
  });
});
