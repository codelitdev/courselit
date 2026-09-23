import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
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

describe.serial("school spaces and included products", () => {
  it("provisions one community and a General space, enforces last-space delete, follow, feed, and included unlock matching", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({
      clock,
      paymentProvider: new MemoryPaymentProvider(),
    });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const communities = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    expect(communities).toHaveLength(1);
    await runtime.db.insert(schema.storefrontPlans).values({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      publicId: "pln_test_community",
      schoolId: world.schoolA.id,
      entityType: "community",
      entityId: communities[0]!.publicId,
      name: "Community access",
      description: "",
      includedProducts: [],
      providerProductId: null,
      kind: "free",
      oneTimeAmount: null,
      emiAmount: null,
      emiTotalInstallments: null,
      subscriptionMonthlyAmount: null,
      subscriptionYearlyAmount: null,
      amountMinor: 0,
      billingInterval: null,
      installmentCount: null,
      status: "active",
      isDefault: true,
      createdBy: world.owner.id,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/spaces",
      headers: adminHeaders,
    });
    expect(listed.status).toBe(200);
    const spaces = (
      listed.body as { items: Array<{ id: string; name: string; follow: boolean }> }
    ).items;
    expect(spaces).toHaveLength(1);
    expect(spaces[0]).toMatchObject({ name: "General", follow: true });
    const generalId = spaces[0]!.id;

    const lastDelete = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/spaces/${generalId}`,
      headers: adminHeaders,
      body: {},
    });
    expect(lastDelete.status).toBe(400);
    expect(lastDelete.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "last_space" },
    });

    const collectionGone = await dispatch(runtime, {
      method: "GET",
      path: "/v1/communities",
      headers: adminHeaders,
    });
    expect(collectionGone.status).toBe(404);

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { kind: "course", title: "Community perk" },
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;

    const publishWithout = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    expect(publishWithout.status).toBe(400);
    expect(publishWithout.body).toMatchObject({
      details: { reason: "payment_plan_required" },
    });

    const published = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: {
        includedWithCommunity: true,
        discussions: true,
        status: "published",
      },
    });
    expect(published.status).toBe(200);
    expect(published.body).toMatchObject({
      includedWithCommunity: true,
      status: "published",
    });

    const productPlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "One-off", kind: "one_time", oneTimeAmount: 2000 },
    });
    expect(productPlan.status).toBe(201);
    const productPlanId = (productPlan.body as { id: string }).id;

    const restricted = await dispatch(runtime, {
      method: "POST",
      path: "/v1/spaces",
      headers: adminHeaders,
      body: {
        name: "Buyers only",
        unlocks: [
          { entityType: "product", entityId: productId, planIds: [productPlanId] },
        ],
      },
    });
    expect(restricted.status).toBe(201);
    const restrictedId = (restricted.body as { id: string }).id;

    const openProductSpace = await dispatch(runtime, {
      method: "POST",
      path: "/v1/spaces",
      headers: adminHeaders,
      body: {
        name: "All product members",
        unlocks: [{ entityType: "product", entityId: productId, planIds: [] }],
      },
    });
    expect(openProductSpace.status).toBe(201);
    const openProductSpaceId = (openProductSpace.body as { id: string }).id;

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "space-learner@example.com",
        password: "learner-password-1",
        name: "Space Learner",
      },
    });
    expect(learner.status).toBe(201);
    const learnerHeaders = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
    };

    const directJoin = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communities[0]!.publicId}/join`,
      headers: learnerHeaders,
      body: { joiningReason: "" },
    });
    expect(directJoin.status).toBe(404);

    const account = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "space-learner@example.com"));
    const community = communities[0]!;
    const joined = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community.publicId}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "space-community-join" },
      body: { planId: "pln_test_community", joiningReason: "" },
    });
    expect(joined.status).toBe(201);
    const [joinedMembership] = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, account[0]!.id));
    expect(joinedMembership).toMatchObject({
      entityType: "community",
      entityId: community.publicId,
      paymentPlanId: "pln_test_community",
      status: "active",
      role: "post",
    });
    await runtime.db.insert(schema.learnerMemberships).values({
      id: "44444444-4444-4444-8444-444444444444",
      publicId: "lrm_test_included",
      schoolId: world.schoolA.id,
      schoolAccountId: account[0]!.id,
      entityType: "product",
      entityId: productId,
      paymentPlanId: "complan_fake",
      status: "active",
      role: null,
      isIncludedInPlan: true,
      parentMembershipId: joinedMembership!.id,
      joiningReason: "",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const learnerProduct = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: learnerHeaders,
    });
    expect(learnerProduct.status).toBe(200);
    expect(learnerProduct.body).toMatchObject({
      discussions: true,
      discussionSpaceId: expect.stringMatching(/^spc_/),
    });

    const learnerSpaces = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/spaces",
      headers: learnerHeaders,
    });
    expect(learnerSpaces.status).toBe(200);
    const learnerSpaceIds = (
      learnerSpaces.body as { items: Array<{ id: string; name: string }> }
    ).items.map((item) => item.id);
    expect(learnerSpaceIds).toContain(generalId);
    expect(learnerSpaceIds).toContain(openProductSpaceId);
    expect(learnerSpaceIds).not.toContain(restrictedId);

    const hiddenFeed = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/feed?spaceId=${restrictedId}`,
      headers: learnerHeaders,
    });
    expect(hiddenFeed.status).toBe(404);

    const follow = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/learner/spaces/${generalId}/follow`,
      headers: learnerHeaders,
    });
    expect(follow.status).toBe(200);
    expect(follow.body).toEqual({ followed: true });
    const followAgain = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/learner/spaces/${generalId}/follow`,
      headers: learnerHeaders,
    });
    expect(followAgain.status).toBe(200);

    const posted = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${generalId}/posts`,
      headers: learnerHeaders,
      body: { title: "Hello space", content: "First post" },
    });
    expect(posted.status).toBe(201);
    const postedId = (posted.body as { id: string }).id;
    const [postedRow] = await runtime.db
      .select({ id: schema.communityPosts.id })
      .from(schema.communityPosts)
      .where(eq(schema.communityPosts.publicId, postedId))
      .limit(1);
    expect(postedRow).toBeDefined();
    await runtime.db.insert(schema.communityComments).values({
      id: "77777777-7777-4777-8777-777777777777",
      publicId: "cmt_space_post",
      schoolId: world.schoolA.id,
      communityId: community.id,
      postId: postedRow!.id,
      parentCommentId: null,
      schoolAccountId: account[0]!.id,
      content: "This comment moves with its post.",
      deletedAt: null,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const mediaId = "55555555-5555-4555-8555-555555555555";
    await runtime.db.insert(schema.media).values({
      id: mediaId,
      publicId: "med_space_post",
      schoolId: world.schoolA.id,
      mediaLitId: "media-lit-space-post",
      canonicalUrl: "https://media.example.com/space-post.jpg",
      fileName: "space-post.jpg",
      mimeType: "image/jpeg",
      byteSize: 1_024,
      kind: "image",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await runtime.db.insert(schema.mediaReferences).values({
      id: "66666666-6666-4666-8666-666666666666",
      schoolId: world.schoolA.id,
      mediaId,
      resourceType: "community_content",
      resourceInternalId: postedRow!.id,
      resourcePublicId: postedId,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const postedAgain = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${generalId}/posts`,
      headers: learnerHeaders,
      body: { title: "Second space", content: "Second post" },
    });
    expect(postedAgain.status).toBe(201);
    const postedAgainId = (postedAgain.body as { id: string }).id;

    await runtime.db
      .update(schema.communities)
      .set({
        banner:
          '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to the school community."}]}]}',
      })
      .where(eq(schema.communities.id, community.id));

    const feed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/feed?limit=1",
      headers: learnerHeaders,
    });
    expect(feed.status).toBe(200);
    const feedBody = feed.body as {
      items: Array<{ id: string; title: string }>;
      nextCursor: string | null;
      banner: string;
    };
    expect(feedBody.items).toHaveLength(1);
    expect(feedBody.nextCursor).toBeTruthy();
    expect(feedBody.banner).toContain("Welcome to the school community.");
    const postDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/spaces/${generalId}/posts/${postedAgainId}`,
      headers: learnerHeaders,
    });
    expect(postDetail.status).toBe(200);
    expect(postDetail.body).toMatchObject({
      id: postedAgainId,
      space: { id: generalId },
    });

    const page2 = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/feed?limit=1&cursor=${encodeURIComponent(feedBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(page2.status).toBe(200);
    const page2Body = page2.body as { items: Array<{ id: string; title: string }> };
    expect(page2Body.items).toHaveLength(1);
    expect(page2Body.items[0]!.id).not.toBe(feedBody.items[0]!.id);
    expect(["Hello space", "Second space"]).toContain(feedBody.items[0]!.title);
    expect(["Hello space", "Second space"]).toContain(page2Body.items[0]!.title);

    const productOnlyLearner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "space-product-only@example.com",
        password: "learner-password-2",
        name: "Product Only Learner",
      },
    });
    expect(productOnlyLearner.status).toBe(201);
    const productOnlyHeaders = {
      cookie: learnerCookie(productOnlyLearner),
      "x-school-id": world.schoolA.publicId,
    };
    const [productOnlyAccount] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "space-product-only@example.com"));
    await runtime.db.insert(schema.learnerMemberships).values({
      id: "88888888-8888-4888-8888-888888888888",
      publicId: "lrm_test_product_only",
      schoolId: world.schoolA.id,
      schoolAccountId: productOnlyAccount!.id,
      entityType: "product",
      entityId: productId,
      paymentPlanId: "complan_fake",
      status: "active",
      role: null,
      isIncludedInPlan: false,
      parentMembershipId: null,
      joiningReason: "",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const productOnlyPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${openProductSpaceId}/posts`,
      headers: productOnlyHeaders,
      body: { title: "Product discussion", content: "A product member can post." },
    });
    expect(productOnlyPost.status).toBe(201);
    const productOnlyPostId = (productOnlyPost.body as { id: string }).id;
    const productOnlyComments = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/community-posts/${productOnlyPostId}/comments`,
      headers: productOnlyHeaders,
    });
    expect(productOnlyComments.status).toBe(200);
    const productOnlyComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${productOnlyPostId}/comments`,
      headers: productOnlyHeaders,
      body: { content: "A product member can comment." },
    });
    expect(productOnlyComment.status).toBe(201);
    const productOnlyReply = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${productOnlyPostId}/comments`,
      headers: productOnlyHeaders,
      body: {
        content: "A product member can reply to a reply.",
        parentCommentId: (productOnlyComment.body as { id: string }).id,
      },
    });
    expect(productOnlyReply.status).toBe(201);

    const reports = await dispatch(runtime, {
      method: "GET",
      path: "/v1/spaces/reports",
      headers: adminHeaders,
    });
    expect(reports.status).toBe(200);
    expect(reports.body).toMatchObject({ items: [] });

    const publicList = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/communities",
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(publicList.status).toBe(404);
    const available = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/communities/available",
      headers: learnerHeaders,
    });
    expect(available.status).toBe(404);

    const deleted = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/spaces/${generalId}`,
      headers: adminHeaders,
      body: { destinationSpaceId: openProductSpaceId },
    });
    expect(deleted.status).toBe(200);
    const [destinationSpace] = await runtime.db
      .select({ id: schema.spaces.id })
      .from(schema.spaces)
      .where(eq(schema.spaces.publicId, openProductSpaceId))
      .limit(1);
    const [movedPost] = await runtime.db
      .select({ spaceId: schema.communityPosts.spaceId })
      .from(schema.communityPosts)
      .where(eq(schema.communityPosts.publicId, postedId))
      .limit(1);
    expect(movedPost?.spaceId).toBe(destinationSpace!.id);
    expect(
      await runtime.db
        .select({ id: schema.communityComments.id })
        .from(schema.communityComments)
        .where(eq(schema.communityComments.postId, postedRow!.id)),
    ).toHaveLength(1);
    expect(
      await runtime.db
        .select({ id: schema.mediaReferences.id })
        .from(schema.mediaReferences)
        .where(eq(schema.mediaReferences.resourceInternalId, postedRow!.id)),
    ).toHaveLength(1);
    expect(
      await runtime.db
        .select({ id: schema.media.id })
        .from(schema.media)
        .where(eq(schema.media.id, mediaId)),
    ).toHaveLength(1);

    await runtime.close();
  });
});
