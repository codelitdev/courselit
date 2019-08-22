/**
 * This file provides application wide constants.
 */

export const BACKEND = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000'
export const JWT_COOKIE_NAME = 'access_token'
export const USERID_COOKIE_NAME = 'email'

// Constants that represent types from the server
export const LESSON_TYPE_TEXT = 'text'
export const LESSON_TYPE_AUDIO = 'audio'
export const LESSON_TYPE_VIDEO = 'video'
export const LESSON_TYPE_PDF = 'pdf'
export const LESSON_TYPE_QUIZ = 'quiz'

export const URL_EXTENTION_POSTS = 'post'
export const URL_EXTENTION_COURSES = 'course'

export const FREE_COURSES_TEXT = 'FREE'
