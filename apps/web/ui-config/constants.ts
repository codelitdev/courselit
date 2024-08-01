/**
 * This file provides application wide constants.
 */

// Constants that represent types from the server
export const LESSON_TYPE_TEXT = "text";
export const LESSON_TYPE_AUDIO = "audio";
export const LESSON_TYPE_VIDEO = "video";
export const LESSON_TYPE_PDF = "pdf";
export const LESSON_TYPE_QUIZ = "quiz";
export const LESSON_TYPE_FILE = "file";
export const LESSON_TYPE_EMBED = "embed";

export const FREE_COURSES_TEXT = "FREE";

// Constant for representing Draftjs' entities
export const DRAFTJS_ENTITY_TYPE_IMAGE = "image";
export const DRAFTJS_ENTITY_TYPE_VIDEO = "video";
export const DRAFTJS_ENTITY_TYPE_AUDIO = "audio";

// transaction statuses from backend
export const TRANSACTION_INITIATED = "initiated";
export const TRANSACTION_SUCCESS = "success";
export const TRANSACTION_FAILED = "failed";

export const CONSECUTIVE_PAYMENT_VERIFICATION_REQUEST_GAP = 2000;

// mime types
export const MIMETYPE_VIDEO = ["video/mp4", "video/quicktime"];
export const MIMETYPE_AUDIO = ["audio/mp3", "audio/mpeg"];
export const MIMETYPE_IMAGE = ["image/png", "image/jpeg", "image/webp"];
export const MIMETYPE_PDF = ["application/pdf"];

export const THEMES_REPO = "https://github.com/codelitdev/courselit-themes";

// Course Type
export const COURSE_TYPE_COURSE = "course";
export const COURSE_TYPE_DOWNLOAD = "download";

export const DEFAULT_PASSING_GRADE = 70;

export const ITEMS_PER_PAGE = 10; // this should be in sync with backend's itemsPerPage
