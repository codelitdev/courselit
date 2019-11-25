/**
 * This file provides app wide constants
 */
const path = require('path')
const homedir = require('os').homedir()

module.exports = {
  dbConnectionString: process.env.DB_CONNECTION_STRING ||
    `mongodb://localhost/${process.env.NODE_ENV === 'test' ? 'test' : 'app2'}`,
  saltRounds: 10, // for bcrypting the plain text passwords
  jwtSecret: process.env.JWT_SECRET || 'ultrasecurekey',
  jwtExpire: process.env.JWT_EXPIRES_IN || 60 * 60 * 24 * 10,

  // Media uploads config
  uploadFolder: path.join(process.env.MEDIA_FOLDER || homedir, 'uploads'),
  thumbnailsFolder: path.join(process.env.MEDIA_FOLDER || homedir, 'thumbs'),
  thumbnailFileExtension: 'jpg',
  thumbnailContentType: 'image/jpeg', // the following constants are as per the 16:9 aspect ratio
  thumbnailWidth: 120,
  thumbnailHeight: 68,

  // Content types
  text: 'text',
  audio: 'audio',
  video: 'video',
  pdf: 'pdf',
  quiz: 'quiz',

  // Content privacy types
  unlisted: 'unlisted',
  open: 'public',
  closed: 'private',

  // Pagination config
  mycoursesLimit: 5,
  postsPerPageLimit: 5,
  postDescTruncLimit: 30,
  coursesPerPageLimit: 1,
  mymediaLimit: 5,
  blogPostSnippetLength: 300,
  defaultPaginationItemsPerPage: 5,
  defaultOffset: 1,
  siteUsersPerPage: 5
}
