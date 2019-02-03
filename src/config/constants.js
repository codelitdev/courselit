/**
 * This file provides app wide constants
 */

module.exports = {
  authSecret: process.env.NODE_ENV === 'production' ? '' : '@Kjkl2jlk5$32lkj',
  authIssuer: 'raynstudios.com',
  dbURL: process.env.NODE_ENV === 'production' ? 'mongo' : '172.18.0.2',
  dbName: 'app',
  saltRounds: 10 // for bcrypting the plain text passwords
}
