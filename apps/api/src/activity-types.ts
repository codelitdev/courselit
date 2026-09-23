/**
 * Activity names are part of the CourseLit analytics contract. Keep these
 * values stable: the admin overview and downstream integrations use them as
 * event identifiers.
 */
export const ActivityType = {
  ENROLLED: "enrolled",
  PURCHASED: "purchased",
  DOWNLOADED: "downloaded",
  LESSON_COMPLETED: "lesson_completed",
  COURSE_COMPLETED: "course_completed",
  QUIZ_ATTEMPTED: "quiz_attempted",
  QUIZ_PASSED: "quiz_passed",
  VIDEO_STARTED: "video_started",
  VIDEO_FINISHED: "video_finished",
  CERTIFICATE_ISSUED: "certificate_issued",
  CERTIFICATE_DOWNLOADED: "certificate_downloaded",
  REVIEWED: "reviewed",
  NEWSLETTER_SUBSCRIBED: "newsletter_subscribed",
  NEWSLETTER_UNSUBSCRIBED: "newsletter_unsubscribed",
  USER_CREATED: "user_created",
  TAG_ADDED: "tag_added",
  TAG_REMOVED: "tag_removed",
  COMMUNITY_JOINED: "community_joined",
  COMMUNITY_LEFT: "community_left",
  COMMUNITY_POST_CREATED: "community_post_created",
  COMMUNITY_POST_LIKED: "community_post_liked",
  COMMUNITY_COMMENT_CREATED: "community_comment_created",
  COMMUNITY_COMMENT_REPLIED: "community_comment_replied",
  COMMUNITY_COMMENT_LIKED: "community_comment_liked",
  COMMUNITY_REPLY_CREATED: "community_reply_created",
  COMMUNITY_REPLY_LIKED: "community_reply_liked",
  COMMUNITY_MEMBERSHIP_REQUESTED: "community_membership_requested",
  COMMUNITY_MEMBERSHIP_GRANTED: "community_membership_granted",
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const activityTypeValues = Object.values(ActivityType) as [
  ActivityType,
  ...ActivityType[],
];
