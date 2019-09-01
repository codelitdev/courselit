const withCSS = require('@zeit/next-css')
module.exports = withCSS({
  publicRuntimeConfig: {
    apiPrefix: process.env.API_PREFIX,
    backend: process.env.BACKEND
  }
})
