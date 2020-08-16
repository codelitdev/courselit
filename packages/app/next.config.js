module.exports = {
  serverRuntimeConfig: {
    ssrUrl: process.env.SSR_SITE_URL,
  },
  publicRuntimeConfig: {
    mainUrl: process.env.SITE_URL,
    apiPrefix: process.env.API_PREFIX,
  },
  compress: false,
};
