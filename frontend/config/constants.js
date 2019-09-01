/**
 * This file provides application wide constants.
 */
import getConfig from 'next/config'
const { publicRuntimeConfig } = getConfig()

export const BACKEND = process.env.NODE_ENV === 'production'
  ? (process.env.BACKEND
    ? `http://backend:8000${publicRuntimeConfig.apiPrefix}`
    : publicRuntimeConfig.backend)
  : 'http://localhost:8000'
// export const BACKEND = process.env.backend
// console.log(process.env.backend, process.env.BACKEND, BACKEND)
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
