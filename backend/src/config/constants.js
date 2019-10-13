/**
 * This file provides app wide constants
 */
const path = require('path')
const homedir = require('os').homedir()

module.exports = {
  dbURL: process.env.NODE_ENV === 'production' ? 'db' : 'localhost',
  dbName: 'app',
  saltRounds: 10, // for bcrypting the plain text passwords
  jwtSecret: process.env.NODE_ENV === 'production' ? 'KLjl2k3j5lk2j' : 'kj23kl4j5kjk',
  jwtExpire: 60 * 60 * 24 * 10,
  uploadFolder: path.join(process.env.MEDIA_FOLDER || homedir, 'uploads'),
  thumbnailsFolder: path.join(process.env.MEDIA_FOLDER || homedir, 'thumbs'),
  thumbnailFileExtension: 'jpg',
  thumbnailContentType: 'image/jpeg',
  // the following constants are as per the 16:9 aspect ratio
  thumbnailWidth: 120,
  thumbnailHeight: 68,

  // Constants for content types
  text: 'text',
  audio: 'audio',
  video: 'video',
  pdf: 'pdf',
  quiz: 'quiz',

  // Constants for courses privacy settings
  unlisted: 'unlisted',
  open: 'public',
  closed: 'private',

  // Constants for pagination
  mycoursesLimit: 5,
  postsPerPageLimit: 5,
  postDescTruncLimit: 30,
  coursesPerPageLimit: 1,
  mymediaLimit: 5,
  blogPostSnippetLength: 10
}
