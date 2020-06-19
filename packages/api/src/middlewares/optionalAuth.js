/**
 * This middleware authenticates via JWT if 'Authorization' header is set
 * otherwise lets one use the route as an unauthenticated party.
 *
 * Inspired by: https://github.com/themikenicholson/passport-jwt/issues/110#issuecomment-403556121
 */

module.exports = (passport) => (req, res, next) => {
  const auth = req.header("Authorization");
  if (auth) {
    passport.authenticate("jwt", { session: false })(req, res, next);
  } else {
    next();
  }
};
