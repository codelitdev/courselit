import { describe, expect, it } from "bun:test";
import { communityCommentSchema } from "@courselit/api-contract";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

describe.serial("communities", () => {
  it("lists empty community collections for a new learner", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, paymentProvider: new MemoryPaymentProvider() });
    const world = await seedWorld(runtime, clock);
    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "new-community-learner@example.com",
        password: "learner-password-1",
        name: "New Community Learner",
      },
    });
    expect(learner.status).toBe(201);
    const headers = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
    };

    const [joined, available] = await Promise.all([
      dispatch(runtime, {
        method: "GET",
        path: "/v1/learner/communities",
        headers,
      }),
      dispatch(runtime, {
        method: "GET",
        path: "/v1/learner/communities/available",
        headers,
      }),
    ]);

    expect(joined).toMatchObject({ status: 200, body: { items: [] } });
    expect(available).toMatchObject({ status: 200, body: { items: [] } });
    await runtime.close();
  });

  it("lists only enabled communities for an uncredentialed school host", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const visible = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Public learner community",
        description: "Ask questions and share progress.",
        categories: ["General", "Questions"],
        enabled: false,
        autoAcceptMembers: true,
      },
    });
    expect(visible.status).toBe(201);
    const visibleCommunityId = (visible.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${visibleCommunityId}/plans`,
      headers: adminHeaders,
      body: { name: "Free access", type: "free", kind: "free" },
    });
    expect(plan.status).toBe(201);
    const enabled = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${visibleCommunityId}`,
      headers: adminHeaders,
      body: { enabled: true },
    });
    expect(enabled.status).toBe(200);

    const hidden = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Private learner community",
        categories: ["General"],
        enabled: false,
        autoAcceptMembers: true,
      },
    });
    expect(hidden.status).toBe(201);

    const publicCatalog = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/communities?limit=50",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicCatalog.status).toBe(200);
    expect(publicCatalog.body).toMatchObject({
      items: [
        {
          id: visibleCommunityId,
          name: "Public learner community",
          enabled: true,
          membership: null,
        },
      ],
      nextCursor: null,
    });

    const publicDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/communities/${visibleCommunityId}`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body).toMatchObject({
      id: visibleCommunityId,
      name: "Public learner community",
      membership: null,
    });
    const publicPlans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/communities/${visibleCommunityId}/plans`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicPlans.status).toBe(200);
    expect(publicPlans.body).toMatchObject({
      items: [{ name: "Free access", type: "free", status: "active" }],
    });

    const hiddenDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/communities/${(hidden.body as { id: string }).id}`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(hiddenDetail.status).toBe(404);
    const hiddenPlans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/communities/${(hidden.body as { id: string }).id}/plans`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(hiddenPlans.status).toBe(404);

    await runtime.close();
  });

  it("keeps community membership, discussions, reactions, reports, and tenancy scoped", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, paymentProvider: new MemoryPaymentProvider() });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Course creators",
        description: "A private creator community",
        banner:
          '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to the community."}]}]}',
        categories: ["General", "Questions"],
        enabled: false,
        autoAcceptMembers: true,
      },
    });
    expect(created.status).toBe(201);
    const community = created.body as {
      id: string;
      schoolId: string;
      membership: { communityId: string; role: string };
    };
    expect(community.schoolId).toBe(world.schoolA.publicId);
    expect(community.membership).toMatchObject({
      communityId: community.id,
      role: "owner",
    });
    expect(created.body).toMatchObject({
      categories: ["General", "Questions"],
      description: "A private creator community",
      banner:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to the community."}]}]}',
      membersCount: 1,
      enabled: false,
    });

    const enabledOnCreate = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Published without a plan",
        categories: ["General"],
        enabled: true,
      },
    });
    expect(enabledOnCreate.status).toBe(409);
    expect(enabledOnCreate.body).toMatchObject({
      details: { reason: "community_requires_default_payment_plan" },
    });

    const enabledWithoutPlan = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${community.id}`,
      headers: adminHeaders,
      body: { enabled: true },
    });
    expect(enabledWithoutPlan.status).toBe(409);
    expect(enabledWithoutPlan.body).toMatchObject({
      details: { reason: "community_requires_default_payment_plan" },
    });

    const updatedBanner = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${community.id}`,
      headers: adminHeaders,
      body: {
        banner:
          '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated announcement."}]}]}',
      },
    });
    expect(updatedBanner.status).toBe(200);
    expect(updatedBanner.body).toMatchObject({
      banner:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated announcement."}]}]}',
    });

    const featuredAuthorization = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media/upload-authorizations",
      headers: adminHeaders,
      body: {
        fileName: "community-cover.png",
        mimeType: "image/png",
        byteSize: 2048,
        purpose: "community_artwork",
        accessPolicy: "public",
      },
    });
    expect(featuredAuthorization.status).toBe(201);
    const featuredMedia = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media",
      headers: adminHeaders,
      body: {
        uploadId: (featuredAuthorization.body as { uploadId: string }).uploadId,
        altText: "Community cover",
        accessPolicy: "public",
      },
    });
    expect(featuredMedia.status).toBe(201);
    const featuredMediaId = (featuredMedia.body as { id: string }).id;
    const featuredCommunity = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${community.id}`,
      headers: adminHeaders,
      body: { featuredMediaId },
    });
    expect(featuredCommunity.status).toBe(200);
    expect(featuredCommunity.body).toMatchObject({
      featuredMedia: { id: featuredMediaId, fileName: "community-cover.png" },
    });

    const addedCategory = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.id}/categories`,
      headers: adminHeaders,
      body: { category: "Announcements" },
    });
    expect(addedCategory.status).toBe(200);
    expect(addedCategory.body).toMatchObject({
      categories: ["General", "Questions", "Announcements"],
      featuredMedia: { id: featuredMediaId },
    });
    const listedCommunities = await dispatch(runtime, {
      method: "GET",
      path: "/v1/communities",
      headers: adminHeaders,
    });
    expect(listedCommunities.body).toMatchObject({
      items: [{ id: community.id, featuredMedia: { id: featuredMediaId } }],
    });
    const duplicateCategory = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.id}/categories`,
      headers: adminHeaders,
      body: { category: "Announcements" },
    });
    expect(duplicateCategory.status).toBe(409);

    const freePlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.id}/plans`,
      headers: adminHeaders,
      body: { name: "Community access", type: "free", kind: "free" },
    });
    expect(freePlan.status).toBe(201);
    expect(freePlan.body).toMatchObject({
      communityId: community.id,
      currency: "USD",
      isDefault: true,
      kind: "free",
    });
    const enabledWithPlan = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${community.id}`,
      headers: adminHeaders,
      body: { enabled: true },
    });
    expect(enabledWithPlan.status).toBe(200);
    expect(enabledWithPlan.body).toMatchObject({
      id: community.id,
      enabled: true,
    });
    const plans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/plans`,
      headers: adminHeaders,
    });
    expect(plans.status).toBe(200);
    expect(plans.body).toMatchObject({ items: [{ communityId: community.id }] });
    const paidPlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.id}/plans`,
      headers: adminHeaders,
      body: {
        name: "Creator plus",
        description: "Paid community access",
        type: "onetime",
        kind: "one_time",
        oneTimeAmount: 10,
        amountMinor: 1000,
      },
    });
    expect(paidPlan.status).toBe(201);
    const paidPlanId = (paidPlan.body as { id: string }).id;
    const editedPaidPlan = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-plans/${paidPlanId}`,
      headers: adminHeaders,
      body: { description: "Updated paid access", providerProductId: "provider-1" },
    });
    expect(editedPaidPlan.status).toBe(200);
    expect(editedPaidPlan.body).toMatchObject({
      description: "Updated paid access",
      providerProductId: "provider-1",
      currency: "USD",
    });
    const paidPlanDefault = await dispatch(runtime, {
      method: "POST",
      path: `/v1/community-plans/${paidPlanId}/default`,
      headers: adminHeaders,
      body: {},
    });
    expect(paidPlanDefault.status).toBe(200);
    expect(paidPlanDefault.body).toMatchObject({ isDefault: true });
    const defaultArchive = await dispatch(runtime, {
      method: "POST",
      path: `/v1/community-plans/${paidPlanId}/archive`,
      headers: adminHeaders,
      body: {},
    });
    expect(defaultArchive.status).toBe(409);

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "community-learner@example.com",
        password: "learner-password-1",
        name: "Community Learner",
      },
    });
    expect(learner.status).toBe(201);
    const learnerHeaders = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
    };
    const secondLearner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "community-commenter@example.com",
        password: "learner-password-2",
        name: "Community Commenter",
      },
    });
    expect(secondLearner.status).toBe(201);
    const secondLearnerHeaders = {
      cookie: learnerCookie(secondLearner),
      "x-school-id": world.schoolA.publicId,
    };

    const beforeJoin = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities",
      headers: learnerHeaders,
    });
    expect(beforeJoin.status).toBe(200);
    expect(beforeJoin.body).toMatchObject({ items: [] });

    const available = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities/available",
      headers: learnerHeaders,
    });
    expect(available.status).toBe(200);
    expect(available.body).toMatchObject({
      items: [
        {
          id: community.id,
          membership: null,
          featuredMedia: { id: featuredMediaId },
        },
      ],
    });

    const learnerPlans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/plans`,
      headers: learnerHeaders,
    });
    expect(learnerPlans.status).toBe(200);
    expect(learnerPlans.body).toMatchObject({
      items: [
        { id: (freePlan.body as { id: string }).id, kind: "free" },
        { id: paidPlanId, kind: "one_time", currency: "USD" },
      ],
    });

    const freeCheckout = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/checkout`,
      headers: {
        ...secondLearnerHeaders,
        "idempotency-key": "community-free-1",
      },
      body: { planId: (freePlan.body as { id: string }).id },
    });
    expect(freeCheckout.status).toBe(201);
    expect(freeCheckout.body).toMatchObject({
      communityId: community.id,
      provider: "free",
      status: "paid",
      amountMinor: 0,
      checkoutUrl: null,
    });

    const paidCheckout = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "community-purchase-1" },
      body: { planId: paidPlanId },
    });
    expect(paidCheckout.status).toBe(201);
    expect(paidCheckout.body).toMatchObject({
      communityId: community.id,
      planId: paidPlanId,
      provider: "stripe",
      status: "pending",
      amountMinor: 1000,
      checkoutUrl: "https://checkout.test/stripe_checkout_1",
    });
    const paidCheckoutId = (paidCheckout.body as { id: string }).id;
    const paidWebhook = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "webhook-id": "community-payment-1" },
      rawBody: JSON.stringify({
        type: "payment.succeeded",
        data: {
          payment_id: "community-pay-1",
          amount: 1000,
          currency: "USD",
          metadata: { courselit_community_checkout_id: paidCheckoutId },
        },
      }),
    });
    expect(paidWebhook.status).toBe(200);
    const paidCommunityCheckout = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-checkouts/${paidCheckoutId}`,
      headers: learnerHeaders,
    });
    expect(paidCommunityCheckout.body).toMatchObject({ status: "paid" });

    const joined = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/join`,
      headers: learnerHeaders,
      body: { joiningReason: "I want to learn with other creators." },
    });
    expect(joined.status).toBe(200);
    const membership = joined.body as {
      id: string;
      communityId: string;
      status: string;
    };
    expect(membership).toMatchObject({ communityId: community.id, status: "active" });

    const learnerMediaAuthorization = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/community-media/upload-authorizations",
      headers: learnerHeaders,
      body: {
        fileName: "community-image.png",
        mimeType: "image/png",
        byteSize: 12,
        accessPolicy: "private",
      },
    });
    expect(learnerMediaAuthorization.status).toBe(201);
    const learnerMediaResponse = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/community-media",
      headers: learnerHeaders,
      body: {
        uploadId: (learnerMediaAuthorization.body as { uploadId: string }).uploadId,
        altText: "A community image",
        caption: "Community image",
        accessPolicy: "private",
      },
    });
    expect(learnerMediaResponse.status).toBe(201);
    const learnerMedia = learnerMediaResponse.body as {
      id: string;
      canonicalUrl: string;
    };
    const learnerMediaId = learnerMedia.id;
    const learnerMediaLibrary = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/community-media",
      headers: learnerHeaders,
    });
    expect(learnerMediaLibrary.status).toBe(200);
    expect(learnerMediaLibrary.body).toMatchObject({
      items: [{ id: learnerMediaId, kind: "image" }],
    });

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities",
      headers: learnerHeaders,
    });
    expect(listed.body).toMatchObject({
      items: [{ id: community.id, schoolId: world.schoolA.publicId }],
    });

    const post = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "How do I structure my course?",
        content: "I would love some feedback.",
        category: "Questions",
        mediaIds: [learnerMediaId],
      },
    });
    expect(post.status).toBe(201);
    const postBody = post.body as {
      id: string;
      communityId: string;
      authorId: string;
      author: { kind: string; name: string; email: string | null };
      media: Array<{ id: string; type: string; title: string }>;
      commentsCount: number;
    };
    expect(postBody.communityId).toBe(community.id);
    expect(postBody.media).toEqual([
      expect.objectContaining({
        id: learnerMediaId,
        type: "image",
        title: "Community image",
      }),
    ]);
    expect(postBody).toMatchObject({
      reactions: [],
      commentsCount: 0,
      subscribed: true,
      author: {
        kind: "learner",
        name: "Community Learner",
        email: "community-learner@example.com",
      },
    });

    const feed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/feed?limit=20",
      headers: learnerHeaders,
    });
    expect(feed.status).toBe(200);
    expect(feed.body).toMatchObject({
      items: [
        {
          id: postBody.id,
          community: { id: community.id, name: "Course creators" },
        },
      ],
    });

    const unfollowedPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/subscription`,
      headers: learnerHeaders,
      body: { subscribed: false },
    });
    expect(unfollowedPost.status).toBe(200);
    expect(unfollowedPost.body).toEqual({ subscribed: false });

    const followedPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/subscription`,
      headers: learnerHeaders,
      body: { subscribed: true },
    });
    expect(followedPost.status).toBe(200);
    expect(followedPost.body).toEqual({ subscribed: true });

    const persistedSubscription = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
    });
    expect(persistedSubscription.body).toMatchObject({
      items: [{ id: postBody.id, subscribed: true }],
    });

    const linkedPost = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${postBody.id}`,
      headers: learnerHeaders,
    });
    expect(linkedPost.status).toBe(200);
    expect(linkedPost.body).toMatchObject({
      id: postBody.id,
      communityId: community.id,
      media: [{ id: learnerMediaId }],
    });

    const pinnedPost = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-posts/${postBody.id}`,
      headers: adminHeaders,
      body: { pinned: true },
    });
    expect(pinnedPost.status).toBe(200);
    expect(pinnedPost.body).toMatchObject({ id: postBody.id, pinned: true });

    const removedPostMedia = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-posts/${postBody.id}`,
      headers: learnerHeaders,
      body: {
        mediaIds: [],
      },
    });
    expect(removedPostMedia.status).toBe(200);
    expect(removedPostMedia.body).toMatchObject({ media: [] });
    const restoredPostMedia = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-posts/${postBody.id}`,
      headers: learnerHeaders,
      body: {
        mediaIds: [learnerMediaId],
      },
    });
    expect(restoredPostMedia.status).toBe(200);

    const richPost = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-posts/${postBody.id}`,
      headers: learnerHeaders,
      body: {
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "A rich discussion post." },
                {
                  type: "image",
                  attrs: { src: learnerMedia.canonicalUrl, alt: "Community image" },
                },
              ],
            },
          ],
        }),
      },
    });
    expect(richPost.status).toBe(200);
    expect(richPost.body).toMatchObject({
      media: [{ id: learnerMediaId }],
    });

    const comment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/comments`,
      headers: learnerHeaders,
      body: { content: "Start with the learner outcome.", mediaIds: [learnerMediaId] },
    });
    expect(comment.status).toBe(201);
    const commentBody = comment.body as {
      id: string;
      parentCommentId: string | null;
      author: { kind: string; name: string };
      media: Array<{ id: string; type: string }>;
    };
    expect(commentBody.parentCommentId).toBeNull();
    expect(commentBody.media).toEqual([
      expect.objectContaining({ id: learnerMediaId, type: "image" }),
    ]);
    expect(commentBody).toMatchObject({
      reactions: [],
      author: { kind: "learner", name: "Community Learner" },
    });

    const richComment = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-comments/${commentBody.id}`,
      headers: learnerHeaders,
      body: {
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "A rich comment." }],
            },
          ],
        }),
      },
    });
    expect(richComment.status).toBe(200);
    expect(richComment.body).toMatchObject({
      media: [{ id: learnerMediaId }],
    });

    const emptyRichComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/comments`,
      headers: learnerHeaders,
      body: { content: JSON.stringify({ type: "doc", content: [] }) },
    });
    expect(emptyRichComment.status).toBe(400);

    const reply = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/comments`,
      headers: learnerHeaders,
      body: { content: "That is helpful, thank you.", parentCommentId: commentBody.id },
    });
    expect(reply.status).toBe(201);
    expect(reply.body).toMatchObject({ parentCommentId: commentBody.id });
    const replyBody = reply.body as { id: string };

    const commentReaction = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: learnerHeaders,
      body: { entityType: "comment", entityId: commentBody.id, emoji: "❤️" },
    });
    expect(commentReaction.body).toMatchObject({
      active: true,
      entityId: commentBody.id,
    });
    const commentsWithReaction = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${postBody.id}/comments`,
      headers: learnerHeaders,
    });
    const commentsWithReactionItems = z
      .object({ items: z.array(communityCommentSchema) })
      .parse(commentsWithReaction.body).items;
    const listedComment = commentsWithReactionItems.find(
      (item) => item.id === commentBody.id,
    );
    expect(listedComment).toMatchObject({
      id: commentBody.id,
      reactions: [{ emoji: "❤️", count: 1, active: true }],
    });
    const commentReactionRemoved = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: learnerHeaders,
      body: { entityType: "comment", entityId: commentBody.id, emoji: "❤️" },
    });
    expect(commentReactionRemoved.body).toMatchObject({ active: false });

    const adminComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/community-posts/${postBody.id}/comments`,
      headers: adminHeaders,
      body: { content: "An admin joined the conversation." },
    });
    expect(adminComment.status).toBe(403);
    const secondLearnerJoined = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/join`,
      headers: secondLearnerHeaders,
      body: { joiningReason: "I want to learn with other creators." },
    });
    expect(secondLearnerJoined.status).toBe(200);
    const listedMembers = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/members`,
      headers: adminHeaders,
    });
    expect(listedMembers.status).toBe(200);
    const listedMemberItems = (
      listedMembers.body as {
        items: Array<{ member: { kind: string; name: string } | null }>;
      }
    ).items;
    expect(
      listedMemberItems.some(
        ({ member }) =>
          member?.kind === "learner" && member.name === "Community Learner",
      ),
    ).toBe(true);
    expect(
      listedMemberItems.some(
        ({ member }) =>
          member?.kind === "learner" && member.name === "Community Commenter",
      ),
    ).toBe(true);
    const activeMembers = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/members?status=active`,
      headers: adminHeaders,
    });
    expect(activeMembers.status).toBe(200);
    expect(
      (activeMembers.body as { items: Array<{ status: string }> }).items.every(
        ({ status }) => status === "active",
      ),
    ).toBe(true);
    const secondLearnerPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: secondLearnerHeaders,
      body: {
        title: "A post from another learner",
        content: "This should notify the original member.",
        category: "Questions",
      },
    });
    expect(secondLearnerPost.status).toBe(201);
    const secondLearnerPostReaction = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: secondLearnerHeaders,
      body: { entityType: "post", entityId: postBody.id, emoji: "👍" },
    });
    expect(secondLearnerPostReaction.status).toBe(200);
    const secondLearnerCommentReaction = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: secondLearnerHeaders,
      body: { entityType: "comment", entityId: commentBody.id, emoji: "👍" },
    });
    expect(secondLearnerCommentReaction.status).toBe(200);
    const secondLearnerReplyReaction = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: secondLearnerHeaders,
      body: { entityType: "reply", entityId: replyBody.id, emoji: "👍" },
    });
    expect(secondLearnerReplyReaction.status).toBe(200);
    const learnerComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/comments`,
      headers: secondLearnerHeaders,
      body: { content: "An actual learner joined the conversation." },
    });
    expect(learnerComment.status).toBe(201);
    const firstPostForSubscription = (
      await runtime.db
        .select({ id: schema.communityPosts.id })
        .from(schema.communityPosts)
        .where(eq(schema.communityPosts.publicId, postBody.id))
        .limit(1)
    )[0];
    const secondLearnerRow = (
      await runtime.db
        .select({ id: schema.learners.id })
        .from(schema.learners)
        .where(eq(schema.learners.email, "community-commenter@example.com"))
        .limit(1)
    )[0];
    expect(firstPostForSubscription).toBeDefined();
    expect(secondLearnerRow).toBeDefined();
    const secondLearnerSubscription = await runtime.db
      .select()
      .from(schema.communityPostSubscribers)
      .where(eq(schema.communityPostSubscribers.postId, firstPostForSubscription!.id));
    expect(secondLearnerSubscription).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ learnerId: secondLearnerRow!.id }),
      ]),
    );
    const secondLearnerComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${postBody.id}/comments`,
      headers: secondLearnerHeaders,
      body: { content: "One more thought for the discussion." },
    });
    expect(secondLearnerComment.status).toBe(201);
    const firstCommentPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${postBody.id}/comments?limit=3`,
      headers: learnerHeaders,
    });
    const firstCommentPageBody = firstCommentPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstCommentPage.status).toBe(200);
    expect(firstCommentPageBody.items).toHaveLength(3);
    expect(firstCommentPageBody.nextCursor).not.toBeNull();
    const secondCommentPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${postBody.id}/comments?limit=3&cursor=${encodeURIComponent(firstCommentPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    const secondCommentPageBody = secondCommentPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(secondCommentPage.status).toBe(200);
    expect(secondCommentPageBody.items).toHaveLength(1);
    expect(secondCommentPageBody.nextCursor).toBeNull();
    const freePlanArchive = await dispatch(runtime, {
      method: "POST",
      path: `/v1/community-plans/${(freePlan.body as { id: string }).id}/archive`,
      headers: adminHeaders,
      body: {},
    });
    expect(freePlanArchive.status).toBe(200);
    expect(freePlanArchive.body).toMatchObject({ status: "archived" });
    const notifications = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications",
      headers: learnerHeaders,
    });
    expect(notifications.status).toBe(200);
    const notificationItems = (
      notifications.body as { items: Array<{ type: string; href: string }> }
    ).items;
    expect(
      notificationItems.some(
        (item) =>
          item.type === "community_comment" &&
          item.href ===
            `/dashboard/community/${community.id}/${postBody.id}#${(secondLearnerComment.body as { id: string }).id}`,
      ),
    ).toBe(true);
    expect(
      notificationItems.some((item) => item.type === "community_post_created"),
    ).toBe(true);
    expect(notificationItems.some((item) => item.type === "community_post_liked")).toBe(
      true,
    );
    expect(
      notificationItems.some((item) => item.type === "community_comment_liked"),
    ).toBe(true);
    expect(
      notificationItems.some((item) => item.type === "community_reply_liked"),
    ).toBe(true);
    const firstNotificationPage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications?limit=1",
      headers: learnerHeaders,
    });
    const firstNotificationPageBody = firstNotificationPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstNotificationPage.status).toBe(200);
    expect(firstNotificationPageBody.items).toHaveLength(1);
    expect(firstNotificationPageBody.nextCursor).not.toBeNull();
    const secondNotificationPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/notifications?limit=1&cursor=${encodeURIComponent(firstNotificationPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(secondNotificationPage.status).toBe(200);
    expect(
      (secondNotificationPage.body as { items: Array<{ id: string }> }).items,
    ).toHaveLength(1);

    const reaction = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: learnerHeaders,
      body: { entityType: "post", entityId: postBody.id, emoji: "❤️" },
    });
    expect(reaction.body).toMatchObject({ active: true, entityId: postBody.id });
    const reactedPosts = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
    });
    const reactedPost = (
      reactedPosts.body as { items: Array<Record<string, unknown>> }
    ).items.find((item) => item.id === postBody.id);
    expect(reactedPost).toMatchObject({
      id: postBody.id,
      commentsCount: 4,
      reactions: [
        { emoji: "👍", count: 1, active: false },
        { emoji: "❤️", count: 1, active: true },
      ],
    });
    const reactionRemoved = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reactions`,
      headers: learnerHeaders,
      body: { entityType: "post", entityId: postBody.id, emoji: "❤️" },
    });
    expect(reactionRemoved.body).toMatchObject({ active: false });

    const report = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/reports`,
      headers: learnerHeaders,
      body: { contentType: "post", contentId: postBody.id, reason: "Needs review" },
    });
    expect(report.status).toBe(201);
    expect(report.body).toMatchObject({
      communityId: community.id,
      contentId: postBody.id,
      status: "pending",
    });

    const reports = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/reports`,
      headers: adminHeaders,
    });
    expect(reports.status).toBe(200);
    const reportBody = reports.body as {
      items: Array<{
        id: string;
        content: {
          id: string;
          content: string;
          media: Array<{ id: string; type: string }>;
        } | null;
      }>;
    };
    expect(reportBody.items).toHaveLength(1);
    expect(reportBody.items[0]?.content).toMatchObject({
      id: postBody.id,
      content: expect.stringContaining("A rich discussion post."),
      media: [{ id: learnerMediaId, type: "image" }],
    });
    const pendingReports = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/reports?status=pending`,
      headers: adminHeaders,
    });
    expect(pendingReports.status).toBe(200);
    expect(
      (pendingReports.body as { items: Array<{ status: string }> }).items.every(
        ({ status }) => status === "pending",
      ),
    ).toBe(true);

    const reportRejectedWithoutReason = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-reports/${reportBody.items[0]!.id}`,
      headers: adminHeaders,
      body: { status: "rejected" },
    });
    expect(reportRejectedWithoutReason.status).toBe(409);
    expect(reportRejectedWithoutReason.body).toMatchObject({
      details: { reason: "report_rejection_reason_required" },
    });

    const accepted = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-reports/${reportBody.items[0]!.id}`,
      headers: adminHeaders,
      body: { status: "accepted" },
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ content: null });
    const acceptedReports = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/reports?status=accepted`,
      headers: adminHeaders,
    });
    expect(acceptedReports.status).toBe(200);
    expect(
      (acceptedReports.body as { items: Array<{ content: unknown }> }).items,
    ).toMatchObject([{ content: null }]);
    const hidden = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
    });
    const hiddenCommunity = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}`,
      headers: learnerHeaders,
    });
    expect(hiddenCommunity.body).toMatchObject({ postsCount: 1 });
    expect(
      (hidden.body as { items: Array<{ id: string }> }).items.some(
        (item) => item.id === postBody.id,
      ),
    ).toBe(false);
    const rejected = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-reports/${reportBody.items[0]!.id}`,
      headers: adminHeaders,
      body: { status: "rejected", rejectionReason: "Reviewed and allowed." },
    });
    expect(rejected.status).toBe(200);
    const restored = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
    });
    const restoredCommunity = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}`,
      headers: learnerHeaders,
    });
    expect(restoredCommunity.body).toMatchObject({ postsCount: 2 });
    expect(
      (restored.body as { items: Array<{ id: string }> }).items.some(
        (item) => item.id === postBody.id,
      ),
    ).toBe(true);

    const secondPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "A second community discussion",
        content: "This post makes cursor pagination observable.",
        category: "Questions",
      },
    });
    expect(secondPost.status).toBe(201);

    const pinnedFirstPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts?limit=1`,
      headers: learnerHeaders,
    });
    const pinnedFirstPageBody = pinnedFirstPage.body as {
      items: Array<{ id: string; pinned: boolean }>;
      nextCursor: string | null;
    };
    expect(pinnedFirstPage.status).toBe(200);
    expect(pinnedFirstPageBody.items).toEqual([
      expect.objectContaining({ id: postBody.id, pinned: true }),
    ]);
    expect(pinnedFirstPageBody.nextCursor).not.toBeNull();

    const pinnedSecondPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts?limit=1&cursor=${encodeURIComponent(pinnedFirstPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(pinnedSecondPage.status).toBe(200);
    expect(
      (pinnedSecondPage.body as { items: Array<{ id: string; pinned: boolean }> })
        .items[0],
    ).toMatchObject({ pinned: false });

    const postRows = await runtime.db
      .select()
      .from(schema.communityPosts)
      .where(eq(schema.communityPosts.schoolId, world.schoolA.id));
    const firstPostRow = postRows.find((row) => row.publicId === postBody.id);
    const secondPostRow = postRows.find(
      (row) => row.publicId === (secondPost.body as { id: string }).id,
    );
    expect(firstPostRow).toBeDefined();
    expect(secondPostRow).toBeDefined();
    await runtime.db
      .update(schema.communityPosts)
      .set({ updatedAt: new Date("2026-03-01T00:00:02.000Z") })
      .where(eq(schema.communityPosts.id, firstPostRow!.id));
    await runtime.db
      .update(schema.communityPosts)
      .set({ updatedAt: new Date("2026-03-01T00:00:01.000Z") })
      .where(eq(schema.communityPosts.id, secondPostRow!.id));

    const firstFeedPage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/feed?limit=1",
      headers: learnerHeaders,
    });
    const firstFeedPageBody = firstFeedPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstFeedPage.status).toBe(200);
    expect(firstFeedPageBody.items).toEqual([
      expect.objectContaining({ id: postBody.id }),
    ]);
    expect(firstFeedPageBody.nextCursor).not.toBeNull();
    const secondFeedPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/feed?limit=1&cursor=${encodeURIComponent(firstFeedPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(secondFeedPage.status).toBe(200);
    expect(
      (secondFeedPage.body as { items: Array<{ id: string }> }).items[0]?.id,
    ).toBe((secondPost.body as { id: string }).id);

    const categoryFilteredPosts = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts?category=Questions`,
      headers: learnerHeaders,
    });
    expect(categoryFilteredPosts.status).toBe(200);
    expect(categoryFilteredPosts.body).toMatchObject({ nextCursor: null });
    expect(
      (categoryFilteredPosts.body as { items: Array<Record<string, unknown>> }).items,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: (secondPost.body as { id: string }).id,
          category: "Questions",
        }),
      ]),
    );
    const categoryPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "An announcement",
        content: "This category is going away.",
        category: "Announcements",
      },
    });
    expect(categoryPost.status).toBe(201);
    const invalidCategoryPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "Invalid category post",
        content: "This category does not exist.",
        category: "Missing",
      },
    });
    expect(invalidCategoryPost.status).toBe(400);
    const invalidCategoryUpdate = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-posts/${postBody.id}`,
      headers: learnerHeaders,
      body: { category: "Missing" },
    });
    expect(invalidCategoryUpdate.status).toBe(400);
    const categoryDeleteWithoutMigration = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/communities/${community.id}/categories/Announcements`,
      headers: adminHeaders,
      body: {},
    });
    expect(categoryDeleteWithoutMigration.status).toBe(400);
    const categoryDelete = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/communities/${community.id}/categories/Announcements`,
      headers: adminHeaders,
      body: { migrateToCategory: "General" },
    });
    expect(categoryDelete.status).toBe(200);
    expect(categoryDelete.body).toMatchObject({
      categories: ["General", "Questions"],
    });
    const migratedCategoryPosts = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts?category=Announcements`,
      headers: learnerHeaders,
    });
    expect(migratedCategoryPosts.body).toMatchObject({ items: [], nextCursor: null });
    const firstPostPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts?limit=1`,
      headers: learnerHeaders,
    });
    const firstPostPageBody = firstPostPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstPostPage.status).toBe(200);
    expect(firstPostPageBody.items).toHaveLength(1);
    expect(firstPostPageBody.nextCursor).not.toBeNull();
    expect([
      postBody.id,
      (secondLearnerPost.body as { id: string }).id,
      (secondPost.body as { id: string }).id,
      (categoryPost.body as { id: string }).id,
    ]).toContain(firstPostPageBody.items[0]?.id);
    const secondPostPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities/${community.id}/posts?limit=1&cursor=${encodeURIComponent(firstPostPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    const secondPostPageBody = secondPostPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(secondPostPage.status).toBe(200);
    expect(secondPostPageBody.items).toHaveLength(1);
    expect(secondPostPageBody.items[0]?.id).not.toBe(firstPostPageBody.items[0]?.id);

    const firstAdminPostPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/posts?limit=1`,
      headers: adminHeaders,
    });
    const firstAdminPostPageBody = firstAdminPostPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstAdminPostPage.status).toBe(200);
    expect(firstAdminPostPageBody.items).toHaveLength(1);
    expect([
      postBody.id,
      (secondLearnerPost.body as { id: string }).id,
      (secondPost.body as { id: string }).id,
      (categoryPost.body as { id: string }).id,
    ]).toContain(firstAdminPostPageBody.items[0]?.id);
    expect(firstAdminPostPageBody.nextCursor).not.toBeNull();
    const secondAdminPostPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}/posts?limit=1&cursor=${encodeURIComponent(firstAdminPostPageBody.nextCursor!)}`,
      headers: adminHeaders,
    });
    expect(secondAdminPostPage.status).toBe(200);
    expect(
      (secondAdminPostPage.body as { items: Array<{ id: string }> }).items[0]?.id,
    ).not.toBe(firstAdminPostPageBody.items[0]?.id);

    const moderated = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Moderated community",
        description: "Requires an approval before posting",
        categories: ["General"],
        enabled: false,
        autoAcceptMembers: false,
      },
    });
    expect(moderated.status).toBe(201);
    const moderatedCommunity = moderated.body as { id: string };
    const moderatedPlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${moderatedCommunity.id}/plans`,
      headers: adminHeaders,
      body: { name: "Moderated community access", type: "free", kind: "free" },
    });
    expect(moderatedPlan.status).toBe(201);
    const enabledModeratedCommunity = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${moderatedCommunity.id}`,
      headers: adminHeaders,
      body: { enabled: true },
    });
    expect(enabledModeratedCommunity.status).toBe(200);
    const firstCommunityPage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/communities?limit=1",
      headers: adminHeaders,
    });
    expect(firstCommunityPage.status).toBe(200);
    const firstCommunityPageBody = firstCommunityPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstCommunityPageBody.items).toHaveLength(1);
    expect(firstCommunityPageBody.nextCursor).toBeString();
    const secondCommunityPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities?limit=1&cursor=${encodeURIComponent(firstCommunityPageBody.nextCursor!)}`,
      headers: adminHeaders,
    });
    expect(secondCommunityPage.status).toBe(200);
    expect(
      (secondCommunityPage.body as { items: Array<{ id: string }> }).items[0]?.id,
    ).not.toBe(firstCommunityPageBody.items[0]?.id);
    const missingJoiningReason = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/join`,
      headers: learnerHeaders,
      body: { joiningReason: "   " },
    });
    expect(missingJoiningReason.status).toBe(400);
    expect(missingJoiningReason.body).toMatchObject({
      details: { reason: "joining_reason_required" },
    });
    const missingCheckoutReason = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/checkout`,
      headers: {
        ...secondLearnerHeaders,
        "idempotency-key": "moderated-missing-joining-reason",
      },
      body: { planId: (moderatedPlan.body as { id: string }).id },
    });
    expect(missingCheckoutReason.status).toBe(400);
    expect(missingCheckoutReason.body).toMatchObject({
      details: { reason: "joining_reason_required" },
    });
    const pendingJoin = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/join`,
      headers: learnerHeaders,
      body: { joiningReason: "Please let me in." },
    });
    expect(pendingJoin.status).toBe(200);
    expect(pendingJoin.body).toMatchObject({ status: "pending" });
    const firstLearnerCommunityPage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities?limit=1",
      headers: learnerHeaders,
    });
    expect(firstLearnerCommunityPage.status).toBe(200);
    const firstLearnerCommunityPageBody = firstLearnerCommunityPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstLearnerCommunityPageBody.items).toHaveLength(1);
    expect(firstLearnerCommunityPageBody.nextCursor).toBeString();
    const secondLearnerCommunityPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/communities?limit=1&cursor=${encodeURIComponent(firstLearnerCommunityPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(secondLearnerCommunityPage.status).toBe(200);
    expect(
      (secondLearnerCommunityPage.body as { items: Array<{ id: string }> }).items[0]
        ?.id,
    ).not.toBe(firstLearnerCommunityPageBody.items[0]?.id);
    const firstAvailableCommunityPage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities/available?limit=1",
      headers: learnerHeaders,
    });
    expect(firstAvailableCommunityPage.status).toBe(200);
    const firstAvailableCommunityPageBody = firstAvailableCommunityPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstAvailableCommunityPageBody.items).toHaveLength(1);
    expect(firstAvailableCommunityPageBody.nextCursor).toBeString();
    const blockedPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "Should be blocked",
        content: "Pending members cannot post.",
        category: "General",
      },
    });
    expect(blockedPost.status).toBe(403);
    const moderatedMembers = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${moderatedCommunity.id}/members`,
      headers: adminHeaders,
    });
    expect(moderatedMembers.status).toBe(200);
    const pendingMembership = (
      moderatedMembers.body as { items: Array<{ id: string; status: string }> }
    ).items.find((item) => item.status === "pending");
    expect(pendingMembership).toBeDefined();
    const ownerMembership = (
      moderatedMembers.body as {
        items: Array<{ id: string; status: string; adminUserId: string | null }>;
      }
    ).items.find((item) => item.adminUserId === world.owner.id);
    expect(ownerMembership).toBeDefined();
    const selfUpdate = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-memberships/${ownerMembership!.id}`,
      headers: adminHeaders,
      body: { role: "member" },
    });
    expect(selfUpdate.status).toBe(409);
    expect(selfUpdate.body).toMatchObject({
      details: { reason: "cannot_change_own_membership" },
    });
    const rejectedWithoutReason = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-memberships/${pendingMembership!.id}`,
      headers: adminHeaders,
      body: { status: "rejected" },
    });
    expect(rejectedWithoutReason.status).toBe(409);
    expect(rejectedWithoutReason.body).toMatchObject({
      details: { reason: "membership_rejection_reason_required" },
    });
    const roleChangeWhilePending = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-memberships/${pendingMembership!.id}`,
      headers: adminHeaders,
      body: { role: "moderator" },
    });
    expect(roleChangeWhilePending.status).toBe(409);
    expect(roleChangeWhilePending.body).toMatchObject({
      details: { reason: "cannot_change_role_inactive_member" },
    });
    const approved = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-memberships/${pendingMembership!.id}`,
      headers: adminHeaders,
      body: { status: "active", role: "moderator" },
    });
    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({ status: "active", role: "moderator" });
    const membershipAuditEvents = await runtime.db.select().from(schema.auditEvents);
    expect(
      membershipAuditEvents.filter(
        (event) =>
          event.action === "community.membership_updated" &&
          event.resourceId === pendingMembership!.id,
      ),
    ).toHaveLength(1);
    const demoteLastModerator = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-memberships/${pendingMembership!.id}`,
      headers: adminHeaders,
      body: { role: "member" },
    });
    expect(demoteLastModerator.status).toBe(409);
    const membershipNotifications = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications",
      headers: learnerHeaders,
    });
    expect(
      (
        membershipNotifications.body as { items: Array<{ type: string; href: string }> }
      ).items.some(
        (item) =>
          item.type === "community_membership_granted" &&
          item.href === `/dashboard/community/${moderatedCommunity.id}`,
      ),
    ).toBe(true);
    const allowedPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "Now I can post",
        content: "The moderator approved my membership.",
        category: "General",
      },
    });
    expect(allowedPost.status).toBe(201);

    const secondModeratedJoin = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/join`,
      headers: secondLearnerHeaders,
      body: { joiningReason: "I would like to join this community too." },
    });
    expect(secondModeratedJoin.status).toBe(200);
    expect(secondModeratedJoin.body).toMatchObject({ status: "pending" });
    const secondModeratedMembershipId = (secondModeratedJoin.body as { id: string }).id;
    const secondApprovedModerator = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-memberships/${secondModeratedMembershipId}`,
      headers: adminHeaders,
      body: { status: "active", role: "moderator" },
    });
    expect(secondApprovedModerator.status).toBe(200);

    const moderatedComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${(allowedPost.body as { id: string }).id}/comments`,
      headers: learnerHeaders,
      body: { content: "A moderator should be able to remove this comment." },
    });
    expect(moderatedComment.status).toBe(201);
    const moderatorDeleteComment = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/learner/community-comments/${(moderatedComment.body as { id: string }).id}`,
      headers: secondLearnerHeaders,
    });
    expect(moderatorDeleteComment.status).toBe(200);
    const deletedCommentList = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${(allowedPost.body as { id: string }).id}/comments`,
      headers: learnerHeaders,
    });
    expect(deletedCommentList.status).toBe(200);
    expect(deletedCommentList.body).toMatchObject({
      items: [
        {
          id: (moderatedComment.body as { id: string }).id,
          content: "Deleted",
          deletedAt: expect.any(String),
        },
      ],
    });
    expect(JSON.stringify(deletedCommentList.body)).not.toContain(
      "A moderator should be able to remove this comment.",
    );

    const moderatedPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/posts`,
      headers: learnerHeaders,
      body: {
        title: "A post for moderator removal",
        content: "A community moderator should be able to remove this post.",
        category: "General",
      },
    });
    expect(moderatedPost.status).toBe(201);
    const moderatedPostComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${(moderatedPost.body as { id: string }).id}/comments`,
      headers: learnerHeaders,
      body: { content: "This comment should follow the deleted post." },
    });
    expect(moderatedPostComment.status).toBe(201);
    const moderatorDeletePost = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/learner/community-posts/${(moderatedPost.body as { id: string }).id}`,
      headers: secondLearnerHeaders,
    });
    expect(moderatorDeletePost.status).toBe(200);
    const deletedPostComments = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${(moderatedPost.body as { id: string }).id}/comments`,
      headers: learnerHeaders,
    });
    expect(deletedPostComments.status).toBe(404);
    const deletedPostCommentRow = await runtime.db
      .select({ deletedAt: schema.communityComments.deletedAt })
      .from(schema.communityComments)
      .where(
        eq(
          schema.communityComments.publicId,
          (moderatedPostComment.body as { id: string }).id,
        ),
      );
    expect(deletedPostCommentRow[0]?.deletedAt).toBeInstanceOf(Date);

    const firstMemberPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${moderatedCommunity.id}/members?limit=1`,
      headers: adminHeaders,
    });
    expect(firstMemberPage.status).toBe(200);
    const firstMemberBody = firstMemberPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstMemberBody.items).toHaveLength(1);
    expect(firstMemberBody.nextCursor).toBeString();
    const secondMemberPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${moderatedCommunity.id}/members?limit=1&cursor=${encodeURIComponent(firstMemberBody.nextCursor!)}`,
      headers: adminHeaders,
    });
    expect(secondMemberPage.status).toBe(200);
    const secondMemberBody = secondMemberPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(secondMemberBody.items).toHaveLength(1);
    expect(secondMemberBody.items[0]!.id).not.toBe(firstMemberBody.items[0]!.id);
    expect(secondMemberBody.nextCursor).toBeString();
    const thirdMemberPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${moderatedCommunity.id}/members?limit=1&cursor=${encodeURIComponent(secondMemberBody.nextCursor!)}`,
      headers: adminHeaders,
    });
    expect(thirdMemberPage.status).toBe(200);
    const thirdMemberBody = thirdMemberPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(thirdMemberBody.items).toHaveLength(1);
    expect(thirdMemberBody.items[0]!.id).not.toBe(firstMemberBody.items[0]!.id);
    expect(thirdMemberBody.items[0]!.id).not.toBe(secondMemberBody.items[0]!.id);
    expect(thirdMemberBody.nextCursor).toBeNull();

    const moderatorLeave = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${moderatedCommunity.id}/leave`,
      headers: learnerHeaders,
    });
    expect(moderatorLeave.status).toBe(200);

    const wrongSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.id}`,
      headers: { ...adminHeaders, "x-school-id": world.schoolB.publicId },
    });
    expect(wrongSchool.status).toBe(404);
    await runtime.close();
  });

  it("tracks recurring community access and revokes it on payment failure or refund", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, paymentProvider: new MemoryPaymentProvider() });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const communityResponse = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Subscription community",
        description: "Recurring access",
        categories: ["General"],
        enabled: false,
        autoAcceptMembers: true,
      },
    });
    expect(communityResponse.status).toBe(201);
    const communityId = (communityResponse.body as { id: string }).id;
    const planResponse = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${communityId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Monthly access",
        type: "subscription",
        kind: "subscription",
        subscriptionMonthlyAmount: 12,
        billingInterval: "month",
        providerProductId: "community-monthly-provider",
      },
    });
    expect(planResponse.status).toBe(201);
    const enabledSubscriptionCommunity = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${communityId}`,
      headers: adminHeaders,
      body: { enabled: true },
    });
    expect(enabledSubscriptionCommunity.status).toBe(200);
    const planId = (planResponse.body as { id: string }).id;
    const learnerResponse = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "recurring-community-learner@example.com",
        password: "learner-password-3",
        name: "Recurring Community Learner",
      },
    });
    expect(learnerResponse.status).toBe(201);
    const learnerHeaders = {
      cookie: learnerCookie(learnerResponse),
      "x-school-id": world.schoolA.publicId,
    };
    const checkout = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "community-sub-1" },
      body: { planId },
    });
    expect(checkout.status).toBe(201);
    const checkoutId = (checkout.body as { id: string }).id;
    const succeeded = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "webhook-id": "community-sub-payment-1" },
      rawBody: JSON.stringify({
        type: "payment.succeeded",
        data: {
          payment_id: "community-sub-payment-1",
          subscription_id: "community-subscription-1",
          amount: 1200,
          currency: "USD",
          metadata: { courselit_community_checkout_id: checkoutId },
        },
      }),
    });
    expect(succeeded.status).toBe(200);
    const active = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities",
      headers: learnerHeaders,
    });
    expect(active.body).toMatchObject({
      items: [{ id: communityId, membership: { status: "active" } }],
    });

    const pastDue = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "webhook-id": "community-sub-past-due-1" },
      rawBody: JSON.stringify({
        type: "subscription.past_due",
        data: { subscription_id: "community-subscription-1" },
      }),
    });
    expect(pastDue.status).toBe(200);
    const unavailable = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities/available",
      headers: learnerHeaders,
    });
    expect(unavailable.body).toMatchObject({
      items: [{ id: communityId, membership: { status: "payment_failed" } }],
    });

    const restored = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "webhook-id": "community-sub-active-1" },
      rawBody: JSON.stringify({
        type: "subscription.active",
        data: { subscription_id: "community-subscription-1" },
      }),
    });
    expect(restored.status).toBe(200);

    const refunded = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "webhook-id": "community-sub-refund-1" },
      rawBody: JSON.stringify({
        type: "payment.refunded",
        data: { payment_id: "community-sub-payment-1" },
      }),
    });
    expect(refunded.status).toBe(200);
    const afterRefund = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities/available",
      headers: learnerHeaders,
    });
    expect(afterRefund.body).toMatchObject({
      items: [{ id: communityId, membership: { status: "expired" } }],
    });
    await runtime.close();
  });

  it("lets learners leave and cancels an active community subscription", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const provider = new MemoryPaymentProvider();
    const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const community = await dispatch(runtime, {
      method: "POST",
      path: "/v1/communities",
      headers: adminHeaders,
      body: {
        name: "Leaveable community",
        description: "Learners can leave this community.",
        categories: ["General"],
        enabled: false,
        autoAcceptMembers: true,
      },
    });
    expect(community.status).toBe(201);
    const communityId = (community.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${communityId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Monthly access",
        type: "subscription",
        kind: "subscription",
        subscriptionMonthlyAmount: 12,
        billingInterval: "month",
        providerProductId: "community-leave-provider",
      },
    });
    expect(plan.status).toBe(201);
    const enabledLeaveableCommunity = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${(community.body as { id: string }).id}`,
      headers: adminHeaders,
      body: { enabled: true },
    });
    expect(enabledLeaveableCommunity.status).toBe(200);
    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "community-leave-learner@example.com",
        password: "learner-password-4",
        name: "Leave Learner",
      },
    });
    expect(learner.status).toBe(201);
    const learnerHeaders = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
    };
    const checkout = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "community-leave-1" },
      body: { planId: (plan.body as { id: string }).id },
    });
    expect(checkout.status).toBe(201);
    const checkoutId = (checkout.body as { id: string }).id;
    const paid = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "webhook-id": "community-leave-payment-1" },
      rawBody: JSON.stringify({
        type: "payment.succeeded",
        data: {
          payment_id: "community-leave-payment-1",
          subscription_id: "community-leave-subscription-1",
          amount: 1200,
          currency: "USD",
          metadata: { courselit_community_checkout_id: checkoutId },
        },
      }),
    });
    expect(paid.status).toBe(200);

    const left = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/leave`,
      headers: learnerHeaders,
      body: {},
    });
    expect(left.status).toBe(200);
    expect(left.body).toEqual({ left: true });
    expect(provider.cancelledSubscriptions).toEqual(["community-leave-subscription-1"]);

    const memberships = await runtime.db.select().from(schema.communityMemberships);
    expect(memberships.filter((item) => item.learnerId)).toHaveLength(0);
    const subscriptions = await runtime.db.select().from(schema.communitySubscriptions);
    expect(subscriptions).toMatchObject([{ status: "cancelled" }]);

    const leftAgain = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/leave`,
      headers: learnerHeaders,
      body: {},
    });
    expect(leftAgain.status).toBe(200);
    expect(leftAgain.body).toEqual({ left: true });
    const auditEvents = await runtime.db.select().from(schema.auditEvents);
    expect(
      auditEvents.filter(
        (event) =>
          event.action === "community.membership_left" &&
          event.resourceId === communityId,
      ),
    ).toHaveLength(1);
    await runtime.close();
  });
});
