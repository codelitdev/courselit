import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./test-learner-auth.js";
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
        schoolId: world.schoolA.publicId,
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
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, community.id));
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
      path: `/v1/public/${world.schoolA.publicId}/products/${productId}`,
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
        schoolId: world.schoolA.publicId,
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
      path: `/v1/public/${world.schoolA.publicId}/communities`,
      headers: {},
    });
    expect(publicList.status).toBe(404);

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
  it("shows spaces only while their community or course discussions are on, and keeps course spaces with the course", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-02T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({
      clock,
      paymentProvider: new MemoryPaymentProvider(),
    });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    expect(community?.enabled).toBe(false);

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { kind: "course", title: "Watercolours" },
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "One-off", kind: "one_time", oneTimeAmount: 2000 },
    });
    expect(plan.status).toBe(201);
    const published = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { discussions: true, status: "published" },
    });
    expect(published.status).toBe(200);

    const adminSpaces = async () => {
      const listed = await dispatch(runtime, {
        method: "GET",
        path: "/v1/spaces",
        headers: adminHeaders,
      });
      expect(listed.status).toBe(200);
      return (listed.body as { items: Array<{ id: string; name: string }> }).items;
    };
    // The Spaces screen lists only the community's spaces.
    const spaces = await adminSpaces();
    expect(spaces.map((space) => space.name)).toEqual(["General"]);
    const general = spaces[0]!;
    const [courseRow] = await runtime.db
      .select({ publicId: schema.spaces.publicId, name: schema.spaces.name })
      .from(schema.spaces)
      .innerJoin(schema.products, eq(schema.products.discussionSpaceId, schema.spaces.id))
      .where(eq(schema.products.publicId, productId));
    expect(courseRow?.name).toBe("Watercolours");
    const course = { id: courseRow!.publicId };

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "course-buyer@example.com",
        password: "learner-password-1",
        name: "Course Buyer",
      },
    });
    expect(learner.status).toBe(201);
    const learnerHeaders = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
    };
    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "course-buyer@example.com"));
    for (const [id, entityType, entityId] of [
      ["55555555-5555-4555-8555-555555555551", "product", productId],
      ["55555555-5555-4555-8555-555555555552", "community", community!.publicId],
    ] as const) {
      await runtime.db.insert(schema.learnerMemberships).values({
        id,
        publicId: `lrm_${id.slice(-4)}`,
        schoolId: world.schoolA.id,
        schoolAccountId: account!.id,
        entityType,
        entityId,
        paymentPlanId: null,
        status: "active",
        role: entityType === "community" ? "post" : null,
        isIncludedInPlan: false,
        parentMembershipId: null,
        joiningReason: "",
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
    }
    const learnerSpaceIds = async () => {
      const listed = await dispatch(runtime, {
        method: "GET",
        path: "/v1/learner/spaces",
        headers: learnerHeaders,
      });
      expect(listed.status).toBe(200);
      return (listed.body as { items: Array<{ id: string }> }).items.map((item) => item.id);
    };

    // The community is not launched, so its General space stays hidden even
    // from a member; the course's discussions are on.
    expect(await learnerSpaceIds()).toEqual([course.id]);

    const discussionsOff = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { discussions: false },
    });
    expect(discussionsOff.status).toBe(200);
    expect(await learnerSpaceIds()).toEqual([]);
    const hiddenFeed = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/feed?spaceId=${course.id}`,
      headers: learnerHeaders,
    });
    expect(hiddenFeed.status).toBe(404);

    // Turning discussions back on brings back the same space.
    const discussionsOn = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { discussions: true },
    });
    expect(discussionsOn.status).toBe(200);
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, community!.id));
    expect((await learnerSpaceIds()).sort()).toEqual([course.id, general.id].sort());

    // The course's space is not the Spaces screen's to read, edit or delete.
    for (const request of [
      { method: "GET" as const, body: undefined },
      { method: "PATCH" as const, body: { whoCanPost: "admin" } },
      { method: "DELETE" as const, body: {} },
    ]) {
      const response = await dispatch(runtime, {
        ...request,
        path: `/v1/spaces/${course.id}`,
        headers: adminHeaders,
      });
      expect(response.status).toBe(404);
    }

    // Its name follows the course title.
    const renamed = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { title: "Watercolour basics" },
    });
    expect(renamed.status).toBe(200);
    const [renamedSpace] = await runtime.db
      .select({ name: schema.spaces.name })
      .from(schema.spaces)
      .where(eq(schema.spaces.publicId, course.id));
    expect(renamedSpace?.name).toBe("Watercolour basics");

    // A community space with posts can only hand them to another community space.
    const extra = await dispatch(runtime, {
      method: "POST",
      path: "/v1/spaces",
      headers: adminHeaders,
      body: { name: "Show and tell", unlocks: [{ entityType: "community", planIds: [] }] },
    });
    expect(extra.status).toBe(201);
    const extraId = (extra.body as { id: string }).id;
    const posted = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${extraId}/posts`,
      headers: learnerHeaders,
      body: { title: "My first painting", content: "Feedback welcome" },
    });
    expect(posted.status).toBe(201);
    const intoCourse = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/spaces/${extraId}`,
      headers: adminHeaders,
      body: { destinationSpaceId: course.id },
    });
    expect(intoCourse.status).toBe(404);
    const intoGeneral = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/spaces/${extraId}`,
      headers: adminHeaders,
      body: { destinationSpaceId: general.id },
    });
    expect(intoGeneral.status).toBe(200);

    // General is now the only community space, so it cannot go either.
    const lastCommunitySpace = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/spaces/${general.id}`,
      headers: adminHeaders,
      body: {},
    });
    expect(lastCommunitySpace.status).toBe(400);
    expect(lastCommunitySpace.body).toMatchObject({ details: { reason: "last_space" } });
  });

  it("opens course discussions to product managers and community spaces to moderators on the team", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-02T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({
      clock,
      paymentProvider: new MemoryPaymentProvider(),
    });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { kind: "course", title: "Watercolours" },
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;
    const enabled = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { discussions: true },
    });
    expect(enabled.status).toBe(200);
    const [courseRow] = await runtime.db
      .select({ publicId: schema.spaces.publicId })
      .from(schema.spaces)
      .innerJoin(schema.products, eq(schema.products.discussionSpaceId, schema.spaces.id))
      .where(eq(schema.products.publicId, productId));

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "team-moderator@example.com",
        password: "learner-password-1",
        name: "Team Moderator",
      },
    });
    expect(signedUp.status).toBe(201);
    const headers = {
      cookie: learnerCookie(signedUp),
      "x-school-id": world.schoolA.publicId,
    };
    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "team-moderator@example.com"));
    const spaceIds = async () => {
      const listed = await dispatch(runtime, {
        method: "GET",
        path: "/v1/learner/spaces",
        headers,
      });
      expect(listed.status).toBe(200);
      return (listed.body as { items: Array<{ id: string }> }).items.map((item) => item.id);
    };
    expect(await spaceIds()).toEqual([]);

    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const [general] = await runtime.db
      .select({ publicId: schema.spaces.publicId })
      .from(schema.spaces)
      .where(and(eq(schema.spaces.schoolId, world.schoolA.id), eq(schema.spaces.name, "General")));
    expect(await spaceIds()).toEqual([]);

    const grant = async (permissions: string[]) => {
      await runtime.db.delete(schema.memberships).where(eq(schema.memberships.schoolAccountId, account!.id));
      await runtime.db.insert(schema.memberships).values({
        id: "66666666-6666-4666-8666-666666666661",
        publicId: "mem_team_member",
        schoolId: world.schoolA.id,
        schoolAccountId: account!.id,
        isOwner: false,
        permissions,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
    };
    // Managing products opens their discussions, not the community.
    await grant(["products:write"]);
    expect(await spaceIds()).toEqual([courseRow!.publicId]);
    const posted = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${courseRow!.publicId}/posts`,
      headers,
      body: { title: "Welcome", content: "Ask anything here." },
    });
    expect(posted.status).toBe(201);
    const welcomeId = (posted.body as { id: string }).id;

    // A buyer posts in the course and reports the team member's post.
    const buyerSignUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "course-buyer@example.com",
        password: "learner-password-1",
        name: "Course Buyer",
      },
    });
    expect(buyerSignUp.status).toBe(201);
    const buyerHeaders = {
      cookie: learnerCookie(buyerSignUp),
      "x-school-id": world.schoolA.publicId,
    };
    const [buyer] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "course-buyer@example.com"));
    await runtime.db.insert(schema.learnerMemberships).values({
      id: "55555555-5555-4555-8555-555555555561",
      publicId: "lrm_buyer",
      schoolId: world.schoolA.id,
      schoolAccountId: buyer!.id,
      entityType: "product",
      entityId: productId,
      paymentPlanId: null,
      status: "active",
      role: null,
      isIncludedInPlan: false,
      parentMembershipId: null,
      joiningReason: "",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const buyerPost = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${courseRow!.publicId}/posts`,
      headers: buyerHeaders,
      body: { title: "Spam", content: "Buy my thing." },
    });
    expect(buyerPost.status).toBe(201);
    const spamId = (buyerPost.body as { id: string }).id;
    const reported = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${courseRow!.publicId}/reports`,
      headers: buyerHeaders,
      body: { contentType: "post", contentId: welcomeId, reason: "Off topic" },
    });
    expect(reported.status).toBe(201);

    // The report is handled from the course, not from the community.
    const courseReports = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/discussion-reports`,
      headers: adminHeaders,
    });
    expect(courseReports.status).toBe(200);
    expect((courseReports.body as { items: unknown[] }).items).toHaveLength(1);
    const [communityRow] = await runtime.db
      .select({ publicId: schema.communities.publicId })
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const communityReports = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${communityRow!.publicId}/reports`,
      headers: adminHeaders,
    });
    expect(communityReports.status).toBe(200);
    expect((communityReports.body as { items: unknown[] }).items).toHaveLength(0);

    // The product manager may remove the buyer's post; the buyer may not moderate.
    const canModerate = async (requestHeaders: Record<string, string>) => {
      const post = await dispatch(runtime, {
        method: "GET",
        path: `/v1/learner/spaces/${courseRow!.publicId}/posts/${spamId}`,
        headers: requestHeaders,
      });
      expect(post.status).toBe(200);
      return (post.body as { canModerate?: boolean }).canModerate;
    };
    expect(await canModerate(buyerHeaders)).toBe(false);
    expect(await canModerate(headers)).toBe(true);

    // Authors edit their posts; only moderators pin them, as on main.
    const editPost = (requestHeaders: Record<string, string>, body: object) =>
      dispatch(runtime, {
        method: "PATCH",
        path: `/v1/learner/community-posts/${spamId}`,
        headers: requestHeaders,
        body,
      });
    expect((await editPost(buyerHeaders, { pinned: true })).status).toBe(403);
    const edited = await editPost(buyerHeaders, { title: "Spam, edited" });
    expect(edited.status).toBe(200);
    // Back-date the post so a pin that touched the date would show.
    const editedAt = "2026-01-01T00:00:00.000Z";
    await runtime.db
      .update(schema.communityPosts)
      .set({ updatedAt: new Date(editedAt) })
      .where(eq(schema.communityPosts.publicId, spamId));
    expect((await editPost(headers, { title: "Not yours" })).status).toBe(403);
    expect(
      (await editPost(headers, { title: "Not yours", pinned: true })).status,
    ).toBe(403);
    const pinned = await editPost(headers, { pinned: true });
    expect(pinned.status).toBe(200);
    expect(pinned.body).toMatchObject({ pinned: true, title: "Spam, edited" });
    // Pinning isn't an edit, so the post keeps its date.
    expect((pinned.body as { updatedAt: string }).updatedAt).toBe(editedAt);
    expect((await editPost(headers, { pinned: false })).body).toMatchObject({
      pinned: false,
    });

    // A comment's author edits it; nobody else can, moderators included.
    const commentContent = (text: string) =>
      JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });
    const commented = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/community-posts/${spamId}/comments`,
      headers: buyerHeaders,
      body: { content: commentContent("First take") },
    });
    expect(commented.status).toBe(201);
    const commentId = (commented.body as { id: string }).id;
    const editComment = (requestHeaders: Record<string, string>, text: string) =>
      dispatch(runtime, {
        method: "PATCH",
        path: `/v1/learner/community-comments/${commentId}`,
        headers: requestHeaders,
        body: { content: commentContent(text) },
      });
    const editedComment = await editComment(buyerHeaders, "Second take");
    expect(editedComment.status).toBe(200);
    expect((editedComment.body as { content: string }).content).toContain("Second take");
    expect((await editComment(headers, "Not yours")).status).toBe(403);

    const removed = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/learner/community-posts/${spamId}`,
      headers,
    });
    expect(removed.status).toBe(200);

    // Moderating the community opens its spaces, not the courses'.
    await grant(["communities:moderate"]);
    expect(await spaceIds()).toEqual([general!.publicId]);
    expect(posted.status).toBe(201);
  });
});
