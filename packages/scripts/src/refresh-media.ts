/**
 * Media URL Refresh Script
 *
 * This script refreshes all media URLs in the database by fetching
 * the latest URLs from MediaLit service using the stored mediaId.
 *
 * Usage:
 *   pnpm media:refresh [domain-name] [--save]
 *
 * Options:
 *   --save      Actually update the database (Default is DRY RUN / DISCOVER)
 *
 * If domain-name is provided, only that domain's media is refreshed.
 * If omitted, all domains are processed.
 *
 * Environment variables required:
 *   - DB_CONNECTION_STRING: MongoDB connection string
 *   - MEDIALIT_SERVER: MediaLit API server URL
 *   - MEDIALIT_APIKEY: MediaLit API key
 */

import mongoose from "mongoose";
import {
    CourseSchema,
    DomainSchema,
    LessonSchema,
    CertificateTemplateSchema,
    PageSchema,
    CommunitySchema,
    CommunityCommentSchema,
    CommunityPostSchema,
    UserSchema,
} from "@courselit/orm-models";
import type {
    InternalCertificateTemplate,
    InternalCourse,
    InternalLesson,
    InternalPage,
    InternalCommunity,
    InternalUser,
    InternalCommunityPost,
    InternalCommunityComment,
    Domain,
} from "@courselit/orm-models";
import { loadEnvFile } from "node:process";
import { MediaLit } from "medialit";
import type { Media, CommunityMedia } from "@courselit/common-models";

// Load environment variables
loadEnvFile();

// Parse command line arguments
const args = process.argv.slice(2);
const saveMode = args.includes("--save");
const discoverMode = !saveMode;
const domainArg = args.find((arg) => !arg.startsWith("--"));

if (!process.env.DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is not set");
}

if (!process.env.MEDIALIT_SERVER || !process.env.MEDIALIT_APIKEY) {
    throw new Error(
        "MEDIALIT_SERVER and MEDIALIT_APIKEY must be set to fetch refreshed URLs",
    );
}

// Initialize MediaLit client
function getMediaLitClient() {
    const medialit = new MediaLit({
        apiKey: process.env.MEDIALIT_APIKEY,
        endpoint: process.env.MEDIALIT_SERVER,
    });
    return medialit;
}

const medialitClient = getMediaLitClient();

// Statistics
const stats = {
    processed: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
};

// Cache to avoid duplicate API calls for the same mediaId
const mediaCache = new Map<string, Media | null>();

/**
 * Extracts Media ID from a MediaLit URL
 */
function extractIdFromUrl(url: string): string | null {
    try {
        const { pathname } = new URL(url);
        const segments = pathname.split("/").filter(Boolean);

        if (segments.length < 2) {
            return null;
        }

        const lastSegment = segments[segments.length - 1];
        if (!/^main\.[^/]+$/i.test(lastSegment)) {
            return null;
        }

        return segments[segments.length - 2] || null;
    } catch {
        return null;
    }
}

/**
 * Fetch fresh media data from MediaLit
 */
async function fetchMediaFromMediaLit(mediaId: string): Promise<Media | null> {
    // Check cache first
    if (mediaCache.has(mediaId)) {
        return mediaCache.get(mediaId) || null;
    }

    try {
        const media = await medialitClient.get(mediaId);
        const result = media as unknown as Media;
        mediaCache.set(mediaId, result);
        return result;
    } catch (error) {
        console.error(`  ✗ Failed to fetch media ${mediaId}:`, error);
        mediaCache.set(mediaId, null);
        return null;
    }
}

/**
 * Update a Media object with fresh URLs from MediaLit
 * In discover mode, just prints the media object instead of updating
 */
async function refreshMediaObject(
    existingMedia: Media,
    context?: string,
): Promise<Media | null> {
    if (!existingMedia?.mediaId) {
        return null;
    }

    stats.processed++;

    // In discover mode, fetch and print comparison but return null
    if (discoverMode) {
        console.log(`    📎 ${context || "Media"}: ${existingMedia.mediaId}`);
        console.log(
            `       📄 Current File:  ${existingMedia.file || "(none)"}`,
        );
        if (existingMedia.thumbnail) {
            console.log(`       🖼️  Current Thumb: ${existingMedia.thumbnail}`);
        }

        const freshMedia = await fetchMediaFromMediaLit(existingMedia.mediaId);
        if (freshMedia) {
            if (freshMedia.file !== existingMedia.file) {
                console.log(`       ✨ New File:      ${freshMedia.file}`);
            }
            if (freshMedia.thumbnail !== existingMedia.thumbnail) {
                console.log(`       ✨ New Thumb:     ${freshMedia.thumbnail}`);
            }
            if (
                freshMedia.file === existingMedia.file &&
                freshMedia.thumbnail === existingMedia.thumbnail
            ) {
                console.log(`       ✅ URLs are already up to date`);
            }
        } else {
            console.log(`       ❌ Could not fetch updated URLs from MediaLit`);
        }
        return null;
    }

    const freshMedia = await fetchMediaFromMediaLit(existingMedia.mediaId);

    if (!freshMedia) {
        stats.failed++;
        return null;
    }

    // Check if URLs actually changed
    if (
        freshMedia.file === existingMedia.file &&
        freshMedia.thumbnail === existingMedia.thumbnail
    ) {
        stats.skipped++;
        return null;
    }

    stats.updated++;
    return {
        ...existingMedia,
        file: freshMedia.file,
        thumbnail: freshMedia.thumbnail,
    };
}

/**
 * Recursively find and refresh Media objects in any structure
 * Returns true if any updates were made
 */
async function recursiveMediaRefresh(obj: any): Promise<boolean> {
    if (!obj) return false;

    // Handle stringified JSON (e.g., ProseMirror docs in description/content)
    if (typeof obj === "string") {
        if (
            (obj.trim().startsWith("{") && obj.trim().endsWith("}")) ||
            (obj.trim().startsWith("[") && obj.trim().endsWith("]"))
        ) {
            // We can't update primitive strings in-place via reference.
            // Caller must handle string return values if they iterate objects.
            // But here we return boolean indicating update, so for strings passed directly
            // this function is limited unless we change signature to return updated value.
            return false;
        }
        return false;
    }

    if (typeof obj !== "object") {
        return false;
    }

    let updated = false;

    // Check if this object itself is a Media object
    if (
        obj.mediaId &&
        typeof obj.mediaId === "string" &&
        (obj.file || obj.thumbnail)
    ) {
        const freshMedia = await refreshMediaObject(obj as Media);
        if (freshMedia) {
            obj.file = freshMedia.file;
            obj.thumbnail = freshMedia.thumbnail;
            return true;
        }
        return false;
    }

    // Recursively check keys
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];

            // 1. Special handling for stringified JSON fields (e.g. ProseMirror docs)
            if (
                typeof value === "string" &&
                ((value.trim().startsWith("{") && value.trim().endsWith("}")) ||
                    (value.trim().startsWith("[") &&
                        value.trim().endsWith("]")))
            ) {
                try {
                    const parsed = JSON.parse(value);
                    const childUpdated = await recursiveMediaRefresh(parsed);
                    if (childUpdated) {
                        obj[key] = JSON.stringify(parsed);
                        updated = true;
                    }
                    continue; // Skip normal recursion/string check for this key
                } catch {
                    // Not valid JSON
                }
            }

            // 2. If the value is a string, check if it's a MediaLit URL that needs refreshing
            if (typeof value === "string") {
                const extractedId = extractIdFromUrl(value);
                if (extractedId) {
                    stats.processed++;
                    if (discoverMode) {
                        console.log(
                            `    📎 URL found in key '${key}': ${extractedId}`,
                        );
                        console.log(`       🔗 Current Value: ${value}`);

                        const freshMedia =
                            await fetchMediaFromMediaLit(extractedId);
                        if (freshMedia) {
                            if (freshMedia.file !== value) {
                                console.log(
                                    `       ✨ New Value:     ${freshMedia.file}`,
                                );
                            } else {
                                console.log(
                                    `       ✅ Value is already up to date`,
                                );
                            }
                        } else {
                            console.log(
                                `       ❌ Could not fetch updated URL from MediaLit`,
                            );
                        }
                        continue;
                    }

                    const freshMedia =
                        await fetchMediaFromMediaLit(extractedId);
                    if (freshMedia && freshMedia.file !== value) {
                        // Check if we should use file or thumbnail URL
                        // Usually for 'src' we use file URL.
                        // If the current URL ends with main.png (or similar), we update it to freshMedia.file
                        // Note: Our extractIdFromUrl only matches main images anyway.
                        obj[key] = freshMedia.file;
                        updated = true;
                        stats.updated++;
                    } else if (!freshMedia) {
                        stats.failed++;
                    } else {
                        stats.skipped++;
                    }
                    continue;
                }
            }

            // 3. Normal recursion for objects/arrays
            const result = await recursiveMediaRefresh(value);
            if (result) {
                updated = true;
            }
        }
    }

    return updated;
}

// Initialize models
mongoose.connect(process.env.DB_CONNECTION_STRING);

const DomainModel = mongoose.model("Domain", DomainSchema);
const CourseModel = mongoose.model("Course", CourseSchema);
const LessonModel = mongoose.model("Lesson", LessonSchema);
const CertificateTemplateModel = mongoose.model(
    "CertificateTemplate",
    CertificateTemplateSchema,
);
const PageModel = mongoose.model("Page", PageSchema);
const CommunityModel = mongoose.model("Community", CommunitySchema);
const CommunityPostModel = mongoose.model("CommunityPost", CommunityPostSchema);
const CommunityCommentModel = mongoose.model(
    "CommunityComment",
    CommunityCommentSchema,
);
const UserModel = mongoose.model("User", UserSchema);

/**
 * Refresh media in Courses (featuredImage and description)
 */
async function refreshCourseMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n📦 Processing courses...");

    const courses = (await CourseModel.find({
        domain: domainId,
    }).lean()) as InternalCourse[];

    for (const course of courses) {
        let hasUpdates = false;
        const updates: Record<string, any> = {};

        // 1. Featured Image
        if (course.featuredImage?.mediaId) {
            const updatedMedia = await refreshMediaObject(course.featuredImage);
            if (updatedMedia) {
                updates.featuredImage = updatedMedia;
                hasUpdates = true;
            }
        }

        // 2. Description (scanning for stringified JSON with Media)
        if (course.description) {
            const container = { value: course.description };
            const descUpdated = await recursiveMediaRefresh(container);
            if (descUpdated) {
                updates.description = container.value;
                hasUpdates = true;
                console.log(`    → Media in course description updated`);
            }
        }

        if (hasUpdates) {
            const result = await CourseModel.updateOne(
                { _id: (course as any)._id },
                { $set: updates },
            );
            if (result.matchedCount === 0) {
                console.error(
                    `  ✗ Failed to update course: ${course.title} (No document found)`,
                );
            } else {
                console.log(`  ✓ Course: ${course.title}`);
            }
        }
    }
}

/**
 * Refresh media in Lessons (media field and content)
 */
async function refreshLessonMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n📚 Processing lessons...");

    const lessons = (await LessonModel.find({
        domain: domainId,
    }).lean()) as InternalLesson[];

    for (const lesson of lessons) {
        let hasUpdates = false;
        const updates: Record<string, any> = {};

        // 1. Direct media field
        if (lesson.media?.mediaId) {
            const updatedMedia = await refreshMediaObject(lesson.media);
            if (updatedMedia) {
                updates.media = updatedMedia;
                hasUpdates = true;
            }
        }

        // 2. Content (recursive search for media in content)
        if (lesson.content) {
            const container = { value: lesson.content };
            const contentUpdated = await recursiveMediaRefresh(container);
            if (contentUpdated) {
                updates.content = container.value;
                hasUpdates = true;
                console.log(`    → Media in lesson content updated`);
            }
        }

        if (hasUpdates) {
            const result = await LessonModel.updateOne(
                { _id: (lesson as any)._id },
                { $set: updates },
            );
            if (result.matchedCount === 0) {
                console.error(
                    `  ✗ Failed to update lesson: ${lesson.title} (No document found)`,
                );
            } else {
                console.log(`  ✓ Lesson: ${lesson.title}`);
            }
        }
    }
}

/**
 * Refresh media in Users (avatar)
 */
async function refreshUserMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n👤 Processing users...");

    const users = (await UserModel.find({
        domain: domainId,
        "avatar.mediaId": { $exists: true },
    }).lean()) as InternalUser[];

    for (const user of users) {
        if (user.avatar?.mediaId) {
            const updatedMedia = await refreshMediaObject(user.avatar);
            if (updatedMedia) {
                await UserModel.updateOne(
                    { _id: (user as any)._id },
                    { $set: { avatar: updatedMedia } },
                );
                console.log(`  ✓ User: ${user.email}`);
            }
        }
    }
}

/**
 * Refresh media in Communities (featuredImage)
 */
/**
 * Refresh media in Communities (featuredImage, banner, description)
 */
async function refreshCommunityMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n🏘️ Processing communities...");

    const communities = (await CommunityModel.find({
        domain: domainId,
    }).lean()) as InternalCommunity[];

    for (const community of communities) {
        let hasUpdates = false;
        const updates: Record<string, any> = {};

        // 1. Featured Image
        if (community.featuredImage?.mediaId) {
            const updatedMedia = await refreshMediaObject(
                community.featuredImage,
            );
            if (updatedMedia) {
                updates.featuredImage = updatedMedia;
                hasUpdates = true;
            }
        }

        // 2. Banner
        if (community.banner) {
            const container = { value: community.banner };
            const bannerUpdated = await recursiveMediaRefresh(container);
            if (bannerUpdated) {
                updates.banner = container.value;
                hasUpdates = true;
            }
        }

        // 3. Description
        if (community.description) {
            const container = { value: community.description };
            const descUpdated = await recursiveMediaRefresh(container);
            if (descUpdated) {
                updates.description = container.value;
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            await CommunityModel.updateOne(
                { _id: (community as any)._id },
                { $set: updates },
            );
            console.log(`  ✓ Community: ${community.name}`);
        }
    }
}

/**
 * Refresh media in CommunityPosts (media[].media)
 */
async function refreshCommunityPostMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n📝 Processing community posts...");

    const posts = (await CommunityPostModel.find({
        domain: domainId,
        "media.media.mediaId": { $exists: true },
    }).lean()) as InternalCommunityPost[];

    for (const post of posts) {
        let hasUpdates = false;
        const updatedMediaArray: CommunityMedia[] = [...(post.media || [])];

        for (let i = 0; i < updatedMediaArray.length; i++) {
            const mediaItem = updatedMediaArray[i];
            if (mediaItem.media?.mediaId) {
                const updatedMedia = await refreshMediaObject(mediaItem.media);
                if (updatedMedia) {
                    updatedMediaArray[i] = {
                        ...mediaItem,
                        media: updatedMedia,
                    };
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) {
            await CommunityPostModel.updateOne(
                { _id: (post as any)._id },
                { $set: { media: updatedMediaArray } },
            );
            console.log(`  ✓ Post: ${post.postId}`);
        }
    }
}

/**
 * Refresh media in CommunityComments (media[].media and replies[].media[].media)
 */
async function refreshCommunityCommentMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n💬 Processing community comments...");

    const comments = (await CommunityCommentModel.find({
        domain: domainId,
        $or: [
            { "media.media.mediaId": { $exists: true } },
            { "replies.media.media.mediaId": { $exists: true } },
        ],
    }).lean()) as InternalCommunityComment[];

    for (const comment of comments) {
        let hasUpdates = false;
        const updatedMediaArray: CommunityMedia[] = [...(comment.media || [])];
        const updatedReplies = [...(comment.replies || [])];

        // Update comment media
        for (let i = 0; i < updatedMediaArray.length; i++) {
            const mediaItem = updatedMediaArray[i];
            if (mediaItem.media?.mediaId) {
                const updatedMedia = await refreshMediaObject(mediaItem.media);
                if (updatedMedia) {
                    updatedMediaArray[i] = {
                        ...mediaItem,
                        media: updatedMedia,
                    };
                    hasUpdates = true;
                }
            }
        }

        // Update replies media
        for (let r = 0; r < updatedReplies.length; r++) {
            const reply = updatedReplies[r];
            // Use any[] to handle the type mismatch between InternalReply.media and CommunityMedia
            const replyMedia: any[] = [...(reply.media || [])];

            for (let i = 0; i < replyMedia.length; i++) {
                const mediaItem = replyMedia[i];
                if (mediaItem.media?.mediaId) {
                    const updatedMedia = await refreshMediaObject(
                        mediaItem.media,
                    );
                    if (updatedMedia) {
                        replyMedia[i] = {
                            ...mediaItem,
                            media: updatedMedia,
                        };
                        hasUpdates = true;
                    }
                }
            }

            if (hasUpdates) {
                updatedReplies[r] = { ...reply, media: replyMedia } as any;
            }
        }

        if (hasUpdates) {
            await CommunityCommentModel.updateOne(
                { _id: (comment as any)._id },
                { $set: { media: updatedMediaArray, replies: updatedReplies } },
            );
            console.log(`  ✓ Comment: ${comment.commentId}`);
        }
    }
}

/**
 * Refresh media in Pages (socialImage, draftSocialImage, layout, draftLayout)
 */
async function refreshPageMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n📄 Processing pages...");

    // We scan all pages because specific mediaIds can be hidden deep in layout JSON
    const pages = (await PageModel.find({
        domain: domainId,
    }).lean()) as InternalPage[];

    for (const page of pages) {
        let hasUpdates = false;
        const updates: Record<string, any> = {};

        // 1. Social Image
        if (page.socialImage?.mediaId) {
            const updatedMedia = await refreshMediaObject(page.socialImage);
            if (updatedMedia) {
                updates.socialImage = updatedMedia;
                hasUpdates = true;
            }
        }

        // 2. Draft Social Image
        if (page.draftSocialImage?.mediaId) {
            const updatedMedia = await refreshMediaObject(
                page.draftSocialImage,
            );
            if (updatedMedia) {
                updates.draftSocialImage = updatedMedia;
                hasUpdates = true;
            }
        }

        // 3. Layout (Widget settings)
        if (page.layout && page.layout.length > 0) {
            // Clone layout to avoid mutating lean object directly during traversal
            const layoutCopy = JSON.parse(JSON.stringify(page.layout));
            const layoutUpdated = await recursiveMediaRefresh(layoutCopy);
            if (layoutUpdated) {
                updates.layout = layoutCopy;
                hasUpdates = true;
                console.log(`    → Widget(s) in layout updated`);
            }
        }

        // 4. Draft Layout
        if (page.draftLayout && page.draftLayout.length > 0) {
            const draftLayoutCopy = JSON.parse(
                JSON.stringify(page.draftLayout),
            );
            const draftLayoutUpdated =
                await recursiveMediaRefresh(draftLayoutCopy);
            if (draftLayoutUpdated) {
                updates.draftLayout = draftLayoutCopy;
                hasUpdates = true;
                console.log(`    → Widget(s) in draft layout updated`);
            }
        }

        if (hasUpdates) {
            await PageModel.updateOne(
                { _id: (page as any)._id },
                { $set: updates },
            );
            console.log(`  ✓ Page: ${page.name}`);
        }
    }
}

/**
 * Refresh media in CertificateTemplates (signatureImage, logo)
 */
async function refreshCertificateTemplateMedia(
    domainId: mongoose.Types.ObjectId,
) {
    console.log("\n🎓 Processing certificate templates...");

    const templates = (await CertificateTemplateModel.find({
        domain: domainId,
        $or: [
            { "signatureImage.mediaId": { $exists: true } },
            { "logo.mediaId": { $exists: true } },
        ],
    }).lean()) as InternalCertificateTemplate[];

    for (const template of templates) {
        const updates: Record<string, Media> = {};

        if (template.signatureImage?.mediaId) {
            const updatedMedia = await refreshMediaObject(
                template.signatureImage,
            );
            if (updatedMedia) {
                updates.signatureImage = updatedMedia;
            }
        }

        if (template.logo?.mediaId) {
            const updatedMedia = await refreshMediaObject(template.logo);
            if (updatedMedia) {
                updates.logo = updatedMedia;
            }
        }

        if (Object.keys(updates).length > 0) {
            await CertificateTemplateModel.updateOne(
                { _id: (template as any)._id },
                { $set: updates },
            );
            console.log(`  ✓ Certificate Template: ${template.title}`);
        }
    }
}

/**
 * Refresh media in Domain settings (settings.logo)
 */
async function refreshDomainMedia(domainId: mongoose.Types.ObjectId) {
    console.log("\n🌐 Processing domain settings...");

    const domain = (await DomainModel.findById(
        domainId,
    ).lean()) as Domain | null;

    // Cast to Media since Partial<Media> from common-models may not have all fields
    const logo = domain?.settings?.logo as Media | undefined;
    if (logo?.mediaId) {
        const updatedMedia = await refreshMediaObject(logo);
        if (updatedMedia) {
            await DomainModel.updateOne(
                { _id: domainId },
                { $set: { "settings.logo": updatedMedia } },
            );
            console.log(`  ✓ Domain logo updated`);
        }
    }
}

/**
 * Process all media for a single domain
 */
async function refreshAllMediaForDomain(domain: Domain) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔄 Processing domain: ${domain.name}`);
    console.log(`${"=".repeat(60)}`);

    const domainId = domain._id;

    await refreshDomainMedia(domainId);
    await refreshCourseMedia(domainId);
    await refreshLessonMedia(domainId);
    await refreshUserMedia(domainId);
    await refreshCommunityMedia(domainId);
    await refreshCommunityPostMedia(domainId);
    await refreshCommunityCommentMedia(domainId);
    await refreshPageMedia(domainId);
    await refreshCertificateTemplateMedia(domainId);
}

/**
 * Main execution
 */
async function main() {
    console.log("🚀 Media URL Refresh Script");
    console.log("============================\n");

    if (discoverMode) {
        console.log(
            "🔍 DRY RUN (Discover Mode): Showing changes without updating the database.",
        );
        console.log("   To apply changes, run with --save\n");
    } else {
        console.log("💾 SAVE MODE: Updating database with fresh URLs\n");
    }

    if (domainArg) {
        console.log(`Processing single domain: ${domainArg}`);
        const domain = (await DomainModel.findOne({
            name: domainArg,
        }).lean()) as Domain | null;

        if (!domain) {
            console.error(`❌ Domain not found: ${domainArg}`);
            process.exit(1);
        }

        await refreshAllMediaForDomain(domain);
    } else {
        console.log("Processing ALL domains...");
        const domains = (await DomainModel.find({}).lean()) as Domain[];

        for (const domain of domains) {
            await refreshAllMediaForDomain(domain);
        }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 Summary");
    console.log(`${"=".repeat(60)}`);
    console.log(`  Total media found: ${stats.processed}`);
    if (!discoverMode) {
        console.log(`  Updated: ${stats.updated}`);
        console.log(`  Skipped (unchanged): ${stats.skipped}`);
        console.log(`  Failed: ${stats.failed}`);
    }
    console.log(`\n✅ Done!`);
}

(async () => {
    try {
        await main();
    } catch (error) {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
})();
