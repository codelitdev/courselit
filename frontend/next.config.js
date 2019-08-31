const withCSS = require('@zeit/next-css')
// console.log(process.env.NODE_ENV, process.env.BACKEND)
module.exports = withCSS({
  // env: {
  //   backend: process.env.NODE_ENV === 'production'
  //     ? process.env.BACKEND : 'http://localhost:8000'
  // }
  publicRuntimeConfig: {
    apiPrefix: process.env.API_PREFIX,
    backend: process.env.BACKEND
  }
})
