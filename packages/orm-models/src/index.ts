import { UserModel } from "./models/user";
import { DomainModel } from "./models/domain";
import CourseModel from "./models/course";
import LessonModel from "./models/lesson";
import MembershipModel from "./models/membership";
import PaymentPlanModel from "./models/payment-plan";
import CommunityModel from "./models/community";
import CommunityPostModel from "./models/community-post";
import CommunityCommentModel from "./models/community-comment";
import CommunityReportModel from "./models/community-report";
import CommunityPostSubscriberModel from "./models/community-post-subscriber";
import PageModel from "./models/page";
import UserThemeModel from "./models/user-theme";
import SequenceModel from "./models/sequence";
import EmailDeliveryModel from "./models/email-delivery";
import NotificationModel from "./models/notification";
import InvoiceModel from "./models/invoice";
import CertificateModel from "./models/certificate";
import CertificateTemplateModel from "./models/certificate-template";
import LessonEvaluationModel from "./models/lesson-evaluation";
import ApiKeyModel from "./models/apikey";
import ActivityModel from "./models/activity";
import DownloadLinkModel from "./models/download-link";
import OngoingSequenceModel from "./models/ongoing-sequence";

import { MongooseUserRepository } from "./implementations/mongoose/user.repository";
import { MongooseDomainRepository } from "./implementations/mongoose/domain.repository";
import { MongooseCourseRepository } from "./implementations/mongoose/course.repository";
import { MongooseLessonRepository } from "./implementations/mongoose/lesson.repository";
import { MongooseMembershipRepository } from "./implementations/mongoose/membership.repository";
import { MongoosePaymentPlanRepository } from "./implementations/mongoose/payment-plan.repository";
import { MongooseCommunityRepository } from "./implementations/mongoose/community.repository";
import { MongooseCommunityPostRepository } from "./implementations/mongoose/community-post.repository";
import { MongooseCommunityCommentRepository } from "./implementations/mongoose/community-comment.repository";
import { MongooseCommunityReportRepository } from "./implementations/mongoose/community-report.repository";
import { MongooseCommunityPostSubscriberRepository } from "./implementations/mongoose/community-post-subscriber.repository";
import { MongoosePageRepository } from "./implementations/mongoose/page.repository";
import { MongooseUserThemeRepository } from "./implementations/mongoose/user-theme.repository";
import { MongooseSequenceRepository } from "./implementations/mongoose/sequence.repository";
import { MongooseEmailDeliveryRepository } from "./implementations/mongoose/email-delivery.repository";
import { MongooseNotificationRepository } from "./implementations/mongoose/notification.repository";
import { MongooseInvoiceRepository } from "./implementations/mongoose/invoice.repository";
import { MongooseCertificateRepository } from "./implementations/mongoose/certificate.repository";
import { MongooseCertificateTemplateRepository } from "./implementations/mongoose/certificate-template.repository";
import { MongooseLessonEvaluationRepository } from "./implementations/mongoose/lesson-evaluation.repository";
import { MongooseApiKeyRepository } from "./implementations/mongoose/apikey.repository";
import { MongooseActivityRepository } from "./implementations/mongoose/activity.repository";
import { MongooseDownloadLinkRepository } from "./implementations/mongoose/download-link.repository";
import { MongooseOngoingSequenceRepository } from "./implementations/mongoose/ongoing-sequence.repository";

export * from "./core/criteria";
export * from "./core/repository";
export * from "./contracts/user.repository";
export * from "./contracts/domain.repository";
export * from "./contracts/course.repository";
export * from "./contracts/lesson.repository";
export * from "./contracts/membership.repository";
export * from "./contracts/payment-plan.repository";
export * from "./contracts/community.repository";
export * from "./contracts/community-post.repository";
export * from "./contracts/community-comment.repository";
export * from "./contracts/community-report.repository";
export * from "./contracts/community-post-subscriber.repository";
export * from "./contracts/page.repository";
export * from "./contracts/user-theme.repository";
export * from "./contracts/sequence.repository";
export * from "./contracts/email-delivery.repository";
export * from "./contracts/notification.repository";
export * from "./contracts/invoice.repository";
export * from "./contracts/certificate.repository";
export * from "./contracts/certificate-template.repository";
export * from "./contracts/lesson-evaluation.repository";
export * from "./contracts/apikey.repository";
export * from "./contracts/activity.repository";
export * from "./contracts/download-link.repository";
export * from "./contracts/ongoing-sequence.repository";

// Export concrete implementations
export {
    MongooseUserRepository,
    MongooseDomainRepository,
    MongooseCourseRepository,
    MongooseLessonRepository,
    MongooseMembershipRepository,
    MongoosePaymentPlanRepository,
    MongooseCommunityRepository,
    MongooseCommunityPostRepository,
    MongooseCommunityCommentRepository,
    MongooseCommunityReportRepository,
    MongooseCommunityPostSubscriberRepository,
    MongoosePageRepository,
    MongooseUserThemeRepository,
    MongooseSequenceRepository,
    MongooseEmailDeliveryRepository,
    MongooseNotificationRepository,
    MongooseInvoiceRepository,
    MongooseCertificateRepository,
    MongooseCertificateTemplateRepository,
    MongooseLessonEvaluationRepository,
    MongooseApiKeyRepository,
    MongooseActivityRepository,
    MongooseDownloadLinkRepository,
    MongooseOngoingSequenceRepository,
};

// Factory / Container
export const repositories = {
    user: new MongooseUserRepository(UserModel),
    domain: new MongooseDomainRepository(DomainModel),
    course: new MongooseCourseRepository(CourseModel),
    lesson: new MongooseLessonRepository(LessonModel),
    membership: new MongooseMembershipRepository(MembershipModel),
    paymentPlan: new MongoosePaymentPlanRepository(PaymentPlanModel),
    community: new MongooseCommunityRepository(CommunityModel),
    communityPost: new MongooseCommunityPostRepository(CommunityPostModel),
    communityComment: new MongooseCommunityCommentRepository(
        CommunityCommentModel,
    ),
    communityReport: new MongooseCommunityReportRepository(
        CommunityReportModel,
    ),
    communityPostSubscriber: new MongooseCommunityPostSubscriberRepository(
        CommunityPostSubscriberModel,
    ),
    page: new MongoosePageRepository(PageModel),
    userTheme: new MongooseUserThemeRepository(UserThemeModel),
    sequence: new MongooseSequenceRepository(SequenceModel),
    emailDelivery: new MongooseEmailDeliveryRepository(EmailDeliveryModel),
    notification: new MongooseNotificationRepository(NotificationModel),
    invoice: new MongooseInvoiceRepository(InvoiceModel),
    certificate: new MongooseCertificateRepository(CertificateModel),
    certificateTemplate: new MongooseCertificateTemplateRepository(
        CertificateTemplateModel,
    ),
    lessonEvaluation: new MongooseLessonEvaluationRepository(
        LessonEvaluationModel,
    ),
    apiKey: new MongooseApiKeyRepository(ApiKeyModel),
    activity: new MongooseActivityRepository(ActivityModel),
    downloadLink: new MongooseDownloadLinkRepository(DownloadLinkModel),
    ongoingSequence: new MongooseOngoingSequenceRepository(
        OngoingSequenceModel,
    ),
};

// Re-export original models for backward compatibility
export * from "./models/user";
export * from "./models/domain";
export * from "./models/course";
export * from "./models/lesson";
export * from "./models/membership";
export * from "./models/payment-plan";
// ... export other models ...
export * from "./models/membership";
export * from "./models/media";
export * from "./models/sequence";
export * from "./models/user-segment";
export * from "./models/user-filter";
export * from "./models/course";
export * from "./models/rule";
export * from "./models/email";
export * from "./models/email-delivery";
export * from "./models/email-event";
export * from "./models/subscriber";
export * from "./models/site-info";
export * from "./models/lesson";
export * from "./models/certificate";
export * from "./models/certificate-template";
export * from "./models/payment-plan";
export * from "./models/activity";
export * from "./models/lesson-evaluation";
export * from "./models/page";
export * from "./models/community";
export * from "./models/community-report";
export * from "./models/community-post-subscriber";
export * from "./models/community-comment";
export * from "./models/community-media";
export * from "./models/community-post";
export * from "./models/invoice";
export * from "./models/theme";
export * from "./models/ongoing-sequence";
export * from "./models/notification";
export * from "./models/download-link";
export * from "./models/apikey";
export * from "./models/user-theme";
