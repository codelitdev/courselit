import { describe, expect, it } from "bun:test";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { textDoc } from "./test-content.js";

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

function doc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe.serial("course discussions", () => {
  it("ports lesson discussions with enrollment access, flat replies, likes, and moderation", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { kind: "course", title: "Discussion course", description: "Learn" },
    });
    const productId = (created.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published", discussions: true },
    });
    const lessonCreated = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: adminHeaders,
      body: { title: "Discuss this lesson", content: textDoc("Lesson") },
    });
    const lessonId = (lessonCreated.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "discussion-learner@example.com",
        password: "learner-password-1",
        name: "Discussion Learner",
      },
    });
    const learnerHeaders = {
      cookie: learnerCookie(signedUp),
      "x-school-id": world.schoolA.publicId,
    };

    const beforeEnrollment = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
    });
    expect(beforeEnrollment.status).toBe(403);

    const enrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: learnerHeaders,
      body: { productId },
    });
    expect(enrolled.status).toBe(201);

    const empty = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
    });
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({
      items: [],
      summary: { productId, entityType: "lesson", entityId: lessonId, totalCount: 0 },
    });

    const emptyIndex = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/discussions`,
      headers: learnerHeaders,
    });
    expect(emptyIndex.status).toBe(200);
    expect(emptyIndex.body).toMatchObject({ items: [], hasMore: false });

    const secondSignedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "discussion-learner-two@example.com",
        password: "learner-password-1",
        name: "Discussion Learner Two",
      },
    });
    const secondLearnerHeaders = {
      cookie: learnerCookie(secondSignedUp),
      "x-school-id": world.schoolA.publicId,
    };
    const secondEnrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: secondLearnerHeaders,
      body: { productId },
    });
    expect(secondEnrolled.status).toBe(201);
    const secondSubscribed = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/subscription`,
      headers: secondLearnerHeaders,
      body: { subscription: true },
    });
    expect(secondSubscribed.body).toEqual({ active: true });

    const comment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
      body: { content: doc("What should I focus on first?") },
    });
    expect(comment.status).toBe(201);
    const commentBody = comment.body as {
      id: string;
      authorId: string;
      replyCount: number;
    };
    expect(commentBody.authorId).not.toMatch(/^[0-9a-f-]{36}$/);
    expect(commentBody.replyCount).toBe(0);

    const secondNotificationsAfterComment = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications",
      headers: secondLearnerHeaders,
    });
    expect(secondNotificationsAfterComment.body).toMatchObject({
      items: [
        {
          type: "course_discussion_comment_created",
          title: "New discussion comment",
          href: expect.stringContaining(`#discussion-comment-${commentBody.id}`),
        },
      ],
    });

    const duplicateComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
      body: { content: doc("What should I focus on first?") },
    });
    expect(duplicateComment.status).toBe(429);

    const reply = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/comments/${commentBody.id}/replies`,
      headers: learnerHeaders,
      body: { content: doc("Start with the first exercise.") },
    });
    expect(reply.status).toBe(201);
    const replyBody = reply.body as { id: string };
    const secondNotificationsAfterReply = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications",
      headers: secondLearnerHeaders,
    });
    const secondNotificationTitles = (
      secondNotificationsAfterReply.body as {
        items: Array<{ title: string; href: string | null }>;
      }
    ).items.map((item) => item.title);
    expect(secondNotificationTitles).toHaveLength(2);
    expect(secondNotificationTitles).toContain("New discussion comment");
    expect(secondNotificationTitles).toContain("New discussion reply");
    expect(
      (
        secondNotificationsAfterReply.body as {
          items: Array<{ href: string | null }>;
        }
      ).items.map((item) => item.href),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`#discussion-reply-${replyBody.id}`),
      ]),
    );
    const nestedReply = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/comments/${commentBody.id}/replies`,
      headers: learnerHeaders,
      body: { content: doc("That makes sense."), parentReplyId: replyBody.id },
    });
    expect(nestedReply.status).toBe(201);
    expect(nestedReply.body).toMatchObject({
      parentReplyId: replyBody.id,
      commentId: commentBody.id,
    });

    const previewGrant = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/preview`,
      headers: adminHeaders,
      body: { ttlSeconds: 900 },
    });
    expect(previewGrant.status).toBe(201);
    const previewToken = (previewGrant.body as { token: string }).token;
    const previewRead = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}/lessons/${lessonId}/discussions`,
      headers: { "x-preview-token": previewToken },
    });
    expect(previewRead.status).toBe(200);
    expect(previewRead.body).toMatchObject({
      items: [{ id: commentBody.id, replyCount: 2 }],
    });
    const previewIndex = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}/discussions`,
      headers: { "x-preview-token": previewToken },
    });
    expect(previewIndex.status).toBe(200);
    expect(previewIndex.body).toMatchObject({
      items: [{ entityId: lessonId, totalCount: 3 }],
      hasMore: false,
    });
    const previewReplies = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}/lessons/${lessonId}/discussions/comments/${commentBody.id}/replies`,
      headers: { "x-preview-token": previewToken },
    });
    expect(previewReplies.status).toBe(200);
    expect(
      (previewReplies.body as { items: Array<{ id: string }> }).items.map(
        (item) => item.id,
      ),
    ).toContain(replyBody.id);

    const secondLiked = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/likes`,
      headers: secondLearnerHeaders,
      body: { contentType: "comment", contentId: commentBody.id },
    });
    expect(secondLiked.body).toMatchObject({ active: true, likesCount: 1 });
    const firstNotificationsAfterReaction = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications",
      headers: learnerHeaders,
    });
    expect(firstNotificationsAfterReaction.body).toMatchObject({
      items: [
        {
          type: "course_discussion_reacted",
          title: "New discussion reaction",
          href: expect.stringContaining(`#discussion-comment-${commentBody.id}`),
        },
      ],
    });

    const index = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/discussions`,
      headers: learnerHeaders,
    });
    expect(index.status).toBe(200);
    expect(index.body).toMatchObject({
      items: [
        {
          entityId: lessonId,
          lessonTitle: "Discuss this lesson",
          totalCount: 3,
        },
      ],
      hasMore: false,
    });

    const secondComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: secondLearnerHeaders,
      body: { content: doc("A second learner has a different question.") },
    });
    expect(secondComment.status).toBe(201);
    const secondCommentId = (secondComment.body as { id: string }).id;
    const firstCommentPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions?limit=1`,
      headers: learnerHeaders,
    });
    const firstCommentPageBody = firstCommentPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstCommentPage.status).toBe(200);
    expect(firstCommentPageBody.items).toHaveLength(1);
    expect([commentBody.id, secondCommentId]).toContain(
      firstCommentPageBody.items[0]?.id,
    );
    expect(firstCommentPageBody.nextCursor).not.toBeNull();
    const secondCommentPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions?limit=1&cursor=${encodeURIComponent(firstCommentPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(secondCommentPage.status).toBe(200);
    expect(
      (secondCommentPage.body as { items: Array<{ id: string }> }).items[0]?.id,
    ).not.toBe(firstCommentPageBody.items[0]?.id);

    const firstReplyPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/comments/${commentBody.id}/replies?limit=1`,
      headers: learnerHeaders,
    });
    const firstReplyPageBody = firstReplyPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstReplyPage.status).toBe(200);
    expect(firstReplyPageBody.items).toHaveLength(1);
    expect(firstReplyPageBody.nextCursor).not.toBeNull();
    const secondReplyPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/comments/${commentBody.id}/replies?limit=1&cursor=${encodeURIComponent(firstReplyPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(secondReplyPage.status).toBe(200);
    expect(
      (secondReplyPage.body as { items: Array<{ id: string }> }).items,
    ).toHaveLength(1);

    const secondLessonCreated = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: adminHeaders,
      body: { title: "A second discussion lesson", content: textDoc("Lesson two") },
    });
    const secondLessonId = (secondLessonCreated.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${secondLessonId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    const secondLessonComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${secondLessonId}/discussions`,
      headers: secondLearnerHeaders,
      body: { content: doc("The second lesson has a question too.") },
    });
    expect(secondLessonComment.status).toBe(201);
    const firstSummaryPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/discussions?limit=1`,
      headers: learnerHeaders,
    });
    const firstSummaryPageBody = firstSummaryPage.body as {
      items: Array<{ entityId: string }>;
      nextCursor: string | null;
    };
    expect(firstSummaryPage.status).toBe(200);
    expect(firstSummaryPageBody.items).toHaveLength(1);
    expect(firstSummaryPageBody.nextCursor).not.toBeNull();
    const secondSummaryPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/discussions?limit=1&cursor=${encodeURIComponent(firstSummaryPageBody.nextCursor!)}`,
      headers: learnerHeaders,
    });
    expect(secondSummaryPage.status).toBe(200);
    expect(
      (secondSummaryPage.body as { items: Array<{ entityId: string }> }).items,
    ).toHaveLength(1);
    expect(
      (secondSummaryPage.body as { items: Array<{ entityId: string }> }).items[0]
        ?.entityId,
    ).not.toBe(firstSummaryPageBody.items[0]?.entityId);

    const listedReplies = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/comments/${commentBody.id}/replies`,
      headers: learnerHeaders,
    });
    expect(listedReplies.status).toBe(200);
    const replyItems = (
      listedReplies.body as {
        items: Array<{ id: string; parentReplyId: string | null }>;
      }
    ).items;
    expect(replyItems).toHaveLength(2);
    expect(
      replyItems.some(
        (item) => item.id === replyBody.id && item.parentReplyId === null,
      ),
    ).toBe(true);
    expect(replyItems.some((item) => item.parentReplyId === replyBody.id)).toBe(true);

    const liked = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/likes`,
      headers: learnerHeaders,
      body: { contentType: "comment", contentId: commentBody.id },
    });
    expect(liked.body).toMatchObject({
      contentType: "comment",
      contentId: commentBody.id,
      active: true,
      likesCount: 2,
    });
    const unliked = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/likes`,
      headers: learnerHeaders,
      body: { contentType: "comment", contentId: commentBody.id },
    });
    expect(unliked.body).toMatchObject({ active: false, likesCount: 1 });

    const subscribed = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/subscription`,
      headers: learnerHeaders,
      body: { subscription: true },
    });
    expect(subscribed.body).toEqual({ active: true });

    const report = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/reports`,
      headers: learnerHeaders,
      body: {
        contentType: "comment",
        contentId: commentBody.id,
        reason: "Please review this.",
      },
    });
    expect(report.status).toBe(201);
    expect(report.body).toMatchObject({
      productId,
      entityId: lessonId,
      contentId: commentBody.id,
      status: "pending",
    });
    const duplicate = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/reports`,
      headers: learnerHeaders,
      body: { contentType: "comment", contentId: commentBody.id, reason: "Again" },
    });
    expect(duplicate.status).toBe(409);

    const secondReport = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions/reports`,
      headers: secondLearnerHeaders,
      body: {
        contentType: "comment",
        contentId: secondCommentId,
        reason: "Please review this other comment.",
      },
    });
    expect(secondReport.status).toBe(201);
    const firstReportPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/discussions/reports?status=pending&limit=1`,
      headers: adminHeaders,
    });
    const firstReportPageBody = firstReportPage.body as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(firstReportPage.status).toBe(200);
    expect(firstReportPageBody.items).toHaveLength(1);
    expect(firstReportPageBody.nextCursor).not.toBeNull();
    const secondReportPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/discussions/reports?status=pending&limit=1&cursor=${encodeURIComponent(firstReportPageBody.nextCursor!)}`,
      headers: adminHeaders,
    });
    expect(secondReportPage.status).toBe(200);
    expect(
      (secondReportPage.body as { items: Array<{ id: string }> }).items,
    ).toHaveLength(1);

    const reports = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/discussions/reports?status=pending`,
      headers: adminHeaders,
    });
    expect(reports.status).toBe(200);
    const reportItems = reports.body as {
      items: Array<{ id: string; contentId: string }>;
    };
    const reportId = reportItems.items.find(
      (item) => item.contentId === commentBody.id,
    )!.id;
    const accepted = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/product-discussion-reports/${reportId}`,
      headers: adminHeaders,
      body: { status: "accepted" },
    });
    expect(accepted.status).toBe(200);
    const hidden = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
    });
    const hiddenBody = hidden.body as {
      items: Array<{ id: string; deleted: boolean; content: { content: unknown[] } }>;
      summary: { commentsCount: number; repliesCount: number; totalCount: number };
    };
    expect(hiddenBody.items.find((item) => item.id === commentBody.id)).toMatchObject({
      id: commentBody.id,
      deleted: true,
      content: { content: [] },
    });
    expect(hiddenBody.summary).toMatchObject({
      commentsCount: 1,
      repliesCount: 2,
      totalCount: 3,
    });

    const restored = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/product-discussion-reports/${reportId}`,
      headers: adminHeaders,
      body: { status: "rejected", rejectionReason: "Reviewed and allowed." },
    });
    expect(restored.status).toBe(200);
    const visibleAgain = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
    });
    expect(
      (
        visibleAgain.body as { items: Array<{ id: string; replyCount: number }> }
      ).items.find((item) => item.id === commentBody.id),
    ).toMatchObject({
      id: commentBody.id,
      replyCount: 2,
    });

    const disabled = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { discussions: false },
    });
    expect(disabled.status).toBe(200);
    const disabledRead = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
    });
    expect(disabledRead.status).toBe(403);
    const disabledWrite = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
      body: { content: doc("This should not be posted while disabled.") },
    });
    expect(disabledWrite.status).toBe(403);
    const reenabled = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { discussions: true },
    });
    expect(reenabled.status).toBe(200);

    const outsider = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "discussion-outsider@example.com",
        password: "learner-password-1",
        name: "Outsider",
      },
    });
    const outsiderRead = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: {
        cookie: learnerCookie(outsider),
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(outsiderRead.status).toBe(403);

    const preferences = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notification-preferences",
      headers: secondLearnerHeaders,
    });
    expect(preferences.status).toBe(200);
    expect(preferences.body).toMatchObject({
      items: [
        { type: "community_post_created", appEnabled: true },
        { type: "community_post_liked", appEnabled: true },
        { type: "community_comment", appEnabled: true },
        { type: "community_comment_liked", appEnabled: true },
        { type: "community_reply", appEnabled: true },
        { type: "community_reply_liked", appEnabled: true },
        { type: "community_membership_granted", appEnabled: true },
        { type: "course_discussion_comment_created", appEnabled: true },
        { type: "course_discussion_reacted", appEnabled: true },
      ],
    });
    const disabledDiscussionNotifications = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/learner/notification-preferences/course_discussion_comment_created",
      headers: secondLearnerHeaders,
      body: { appEnabled: false },
    });
    expect(disabledDiscussionNotifications.body).toEqual({
      type: "course_discussion_comment_created",
      appEnabled: false,
    });
    const suppressedComment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/discussions`,
      headers: learnerHeaders,
      body: { content: doc("This notification is intentionally disabled.") },
    });
    expect(suppressedComment.status).toBe(201);
    const notificationsAfterPreferenceChange = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/notifications",
      headers: secondLearnerHeaders,
    });
    expect(
      (notificationsAfterPreferenceChange.body as { items: unknown[] }).items,
    ).toHaveLength(3);
    await runtime.close();
  });
});
