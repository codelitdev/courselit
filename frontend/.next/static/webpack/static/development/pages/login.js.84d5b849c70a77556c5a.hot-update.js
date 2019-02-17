webpackHotUpdate("static/development/pages/login.js",{

/***/ "./lib/session.js":
/*!************************!*\
  !*** ./lib/session.js ***!
  \************************/
/*! exports provided: setCookie, getCookie, removeCookie */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setCookie", function() { return setCookie; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getCookie", function() { return getCookie; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "removeCookie", function() { return removeCookie; });
/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! js-cookie */ "./node_modules/js-cookie/src/js.cookie.js");
/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(js_cookie__WEBPACK_IMPORTED_MODULE_0__);
/**
 * Provides cookie based session management functions
 */

var setCookie = function setCookie(key, value) {
  if (true) {
    js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.set(key, value, {
      expires: 1,
      path: '/'
    });
  }
};
var getCookie = function getCookie(key) {
  return  true ? js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.get(key) : undefined;
};
var removeCookie = function removeCookie(key) {
  return  true ? js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.remove(key) : undefined;
};

/***/ })

})
//# sourceMappingURL=login.js.84d5b849c70a77556c5a.hot-update.js.map