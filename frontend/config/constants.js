/**
 * This file provides application wide constants.
 */

export const BACKEND = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000'
export const JWT_COOKIE_NAME = 'access_token'
