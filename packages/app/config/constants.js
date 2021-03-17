/**
 * This file provides application wide constants.
 */
// import getConfig from "next/config";
// const { serverRuntimeConfig, publicRuntimeConfig } = getConfig();

// const LOCAL_BACKEND = "http://localhost:8000";
// const LOCAL_FRONTEND = "http://localhost:3000";
// const API_PREFIX = publicRuntimeConfig.apiPrefix || "/api";

// const resolveProductionBackend = () => process.env.BACKEND
//   ? `http://backend:8000${API_PREFIX}` // Server-side API path (SSR)
//   :  API_PREFIX // Client-side API path
// export const BACKEND =
//   process.env.NODE_ENV === "production"
//     ? serverRuntimeConfig.ssrUrl
//       ? serverRuntimeConfig.ssrUrl + API_PREFIX
//       : API_PREFIX
//     : LOCAL_BACKEND;
// export const FRONTEND = publicRuntimeConfig.mainUrl || LOCAL_FRONTEND;
// export const MEDIA_BACKEND = publicRuntimeConfig.mainUrl
//   ? publicRuntimeConfig.mainUrl + API_PREFIX
//   : LOCAL_BACKEND;

// Constants for auth related functionalities
export const JWT_COOKIE_NAME = "access_token";
export const USERID_COOKIE_NAME = "email";

// Constants that represent types from the server
export const LESSON_TYPE_TEXT = "text";
export const LESSON_TYPE_AUDIO = "audio";
export const LESSON_TYPE_VIDEO = "video";
export const LESSON_TYPE_PDF = "pdf";
export const LESSON_TYPE_QUIZ = "quiz";

export const URL_EXTENTION_POSTS = "post";
export const URL_EXTENTION_COURSES = "course";

export const FREE_COURSES_TEXT = "FREE";

// Constant for representing Draftjs' entities
export const DRAFTJS_ENTITY_TYPE_IMAGE = "image";
export const DRAFTJS_ENTITY_TYPE_VIDEO = "video";
export const DRAFTJS_ENTITY_TYPE_AUDIO = "audio";

// Payment methods
export const PAYMENT_METHOD_STRIPE = "stripe";
export const PAYMENT_METHOD_PAYPAL = "paypal";
export const PAYMENT_METHOD_PAYTM = "paytm";
export const PAYMENT_METHOD_NONE = "";

// transaction statuses from backend
export const TRANSACTION_INITIATED = "initiated";
export const TRANSACTION_SUCCESS = "success";
export const TRANSACTION_FAILED = "failed";

export const CONSECUTIVE_PAYMENT_VERIFICATION_REQUEST_GAP = 2000;

// mime types
export const MIMETYPE_VIDEO = ["video/mp4"];
export const MIMETYPE_AUDIO = ["audio/mp3"];
export const MIMETYPE_IMAGE = ["image/png", "image/jpeg", "image/webp"];

export const THEMES_REPO = "https://github.com/codelitdev/courselit-themes";

// Navigation categories
export const NAVIGATION_CATEGORY_MAIN = "main";
export const NAVIGATION_CATEGORY_FOOTER = "footer";
