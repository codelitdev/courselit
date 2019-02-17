webpackHotUpdate("static/development/pages/login.js",{

/***/ "./pages/login.js":
/*!************************!*\
  !*** ./pages/login.js ***!
  \************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime-corejs2/regenerator */ "./node_modules/@babel/runtime-corejs2/regenerator/index.js");
/* harmony import */ var _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @babel/runtime-corejs2/core-js/object/assign */ "./node_modules/@babel/runtime-corejs2/core-js/object/assign.js");
/* harmony import */ var _babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _babel_runtime_corejs2_helpers_esm_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @babel/runtime-corejs2/helpers/esm/asyncToGenerator */ "./node_modules/@babel/runtime-corejs2/helpers/esm/asyncToGenerator.js");
/* harmony import */ var _babel_runtime_corejs2_helpers_esm_slicedToArray__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @babel/runtime-corejs2/helpers/esm/slicedToArray */ "./node_modules/@babel/runtime-corejs2/helpers/esm/slicedToArray.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react-redux */ "./node_modules/react-redux/es/index.js");
/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! next/router */ "./node_modules/next/router.js");
/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var isomorphic_unfetch__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! isomorphic-unfetch */ "./node_modules/isomorphic-unfetch/browser.js");
/* harmony import */ var isomorphic_unfetch__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(isomorphic_unfetch__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var _config_strings_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../config/strings.js */ "./config/strings.js");
/* harmony import */ var _config_constants_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../config/constants.js */ "./config/constants.js");
/* harmony import */ var _redux_actions_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../redux/actions.js */ "./redux/actions.js");
/* harmony import */ var _lib_session_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../lib/session.js */ "./lib/session.js");




var _jsxFileName = "/home/rajat/Dev/dev/rs/frontend/pages/login.js";










function Login(props) {
  var emptyStringPat = /^\s*$/;
  var defaultSignupData = {
    email: '',
    pass: '',
    conf: '',
    err: '',
    msg: ''
  };
  var defaultLoginData = {
    email: '',
    pass: '',
    err: '',
    msg: ''
  };

  var _useState = Object(react__WEBPACK_IMPORTED_MODULE_4__["useState"])(defaultLoginData),
      _useState2 = Object(_babel_runtime_corejs2_helpers_esm_slicedToArray__WEBPACK_IMPORTED_MODULE_3__["default"])(_useState, 2),
      loginData = _useState2[0],
      setLoginData = _useState2[1];

  var _useState3 = Object(react__WEBPACK_IMPORTED_MODULE_4__["useState"])(defaultSignupData),
      _useState4 = Object(_babel_runtime_corejs2_helpers_esm_slicedToArray__WEBPACK_IMPORTED_MODULE_3__["default"])(_useState3, 2),
      signupData = _useState4[0],
      setSignupData = _useState4[1];

  function redirectToHomeIfLoggedIn() {
    if (!props.auth.guest) {
      next_router__WEBPACK_IMPORTED_MODULE_6___default.a.push('/');
    }
  }

  redirectToHomeIfLoggedIn();

  function handleLogin(_x) {
    return _handleLogin.apply(this, arguments);
  }

  function _handleLogin() {
    _handleLogin = Object(_babel_runtime_corejs2_helpers_esm_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__["default"])(
    /*#__PURE__*/
    _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default.a.mark(function _callee(event) {
      var res, data;
      return _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default.a.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              event.preventDefault(); // validate the data

              if (!(!loginData.email || emptyStringPat.test(loginData.pass))) {
                _context.next = 3;
                break;
              }

              return _context.abrupt("return", setLoginData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, loginData, {
                err: _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["ERR_ALL_FIELDS_REQUIRED"],
                msg: ''
              })));

            case 3:
              // clear error message set by previous submissions, if there is any
              setLoginData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, loginData, {
                err: '',
                msg: ''
              }));
              _context.prev = 4;
              _context.next = 7;
              return isomorphic_unfetch__WEBPACK_IMPORTED_MODULE_7___default()("".concat(_config_constants_js__WEBPACK_IMPORTED_MODULE_9__["BACKEND"], "/auth/login"), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "email=".concat(loginData.email, "&password=").concat(loginData.password)
              });

            case 7:
              res = _context.sent;
              _context.next = 10;
              return res.json();

            case 10:
              data = _context.sent;

              if (typeof data.token !== 'undefined') {
                // set cookie
                Object(_lib_session_js__WEBPACK_IMPORTED_MODULE_11__["setCookie"])('token', data.token); // save the token for future requests

                props.dispatch(Object(_redux_actions_js__WEBPACK_IMPORTED_MODULE_10__["signedIn"])(data.token));
                redirectToHomeIfLoggedIn();
              }

              _context.next = 16;
              break;

            case 14:
              _context.prev = 14;
              _context.t0 = _context["catch"](4);

            case 16:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this, [[4, 14]]);
    }));
    return _handleLogin.apply(this, arguments);
  }

  function handleSignup(_x2) {
    return _handleSignup.apply(this, arguments);
  }

  function _handleSignup() {
    _handleSignup = Object(_babel_runtime_corejs2_helpers_esm_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__["default"])(
    /*#__PURE__*/
    _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default.a.mark(function _callee2(event) {
      var res, data;
      return _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default.a.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              event.preventDefault(); // validate the data

              if (!(!signupData.email || emptyStringPat.test(signupData.pass) || emptyStringPat.test(signupData.conf))) {
                _context2.next = 3;
                break;
              }

              return _context2.abrupt("return", setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
                err: _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["ERR_ALL_FIELDS_REQUIRED"],
                msg: ''
              })));

            case 3:
              if (!(signupData.pass !== signupData.conf)) {
                _context2.next = 5;
                break;
              }

              return _context2.abrupt("return", setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
                err: _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["ERR_PASSWORDS_DONT_MATCH"],
                msg: ''
              })));

            case 5:
              // clear error message set by previous submissions, if there is any
              setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
                err: '',
                msg: ''
              }));
              _context2.prev = 6;
              _context2.next = 9;
              return isomorphic_unfetch__WEBPACK_IMPORTED_MODULE_7___default()("".concat(_config_constants_js__WEBPACK_IMPORTED_MODULE_9__["BACKEND"], "/auth/signup"), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "email=".concat(signupData.email, "&password=").concat(signupData.password)
              });

            case 9:
              res = _context2.sent;
              _context2.next = 12;
              return res.json();

            case 12:
              data = _context2.sent;

              if (!(data.message === _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["RESP_API_ERROR"])) {
                _context2.next = 15;
                break;
              }

              return _context2.abrupt("return", setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
                err: _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["ERR_IN_USER_CREATION"],
                msg: ''
              })));

            case 15:
              if (data.message === _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["RESP_API_USER_CREATED"]) {
                setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, defaultSignupData, {
                  err: '',
                  msg: _config_strings_js__WEBPACK_IMPORTED_MODULE_8__["SIGNUP_SUCCESS"]
                }));
              }

              _context2.next = 20;
              break;

            case 18:
              _context2.prev = 18;
              _context2.t0 = _context2["catch"](6);

            case 20:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this, [[6, 18]]);
    }));
    return _handleSignup.apply(this, arguments);
  }

  return react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("div", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 142
    },
    __self: this
  }, react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("div", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 143
    },
    __self: this
  }, react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("h2", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 144
    },
    __self: this
  }, "Log in"), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("form", {
    onSubmit: handleLogin,
    __source: {
      fileName: _jsxFileName,
      lineNumber: 145
    },
    __self: this
  }, react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("label", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 146
    },
    __self: this
  }, " Email:", react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "email",
    value: loginData.email,
    onChange: function onChange(e) {
      return setLoginData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, loginData, {
        email: e.target.value
      }));
    },
    __source: {
      fileName: _jsxFileName,
      lineNumber: 147
    },
    __self: this
  })), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("label", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 157
    },
    __self: this
  }, " Password:", react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "password",
    value: loginData.pass,
    onChange: function onChange(e) {
      return setLoginData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, loginData, {
        pass: e.target.value
      }));
    },
    __source: {
      fileName: _jsxFileName,
      lineNumber: 158
    },
    __self: this
  })), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "submit",
    value: "Submit",
    __source: {
      fileName: _jsxFileName,
      lineNumber: 168
    },
    __self: this
  }))), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("div", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 171
    },
    __self: this
  }, react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("h2", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 172
    },
    __self: this
  }, "Sign up"), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("form", {
    onSubmit: handleSignup,
    __source: {
      fileName: _jsxFileName,
      lineNumber: 173
    },
    __self: this
  }, signupData.msg && react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("div", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 175
    },
    __self: this
  }, signupData.msg), signupData.err && react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("div", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 178
    },
    __self: this
  }, signupData.err), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("label", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 180
    },
    __self: this
  }, " Email:", react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "email",
    value: signupData.email,
    onChange: function onChange(e) {
      return setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
        email: e.target.value
      }));
    },
    __source: {
      fileName: _jsxFileName,
      lineNumber: 181
    },
    __self: this
  })), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("label", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 191
    },
    __self: this
  }, " Password:", react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "password",
    value: signupData.pass,
    onChange: function onChange(e) {
      return setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
        pass: e.target.value
      }));
    },
    __source: {
      fileName: _jsxFileName,
      lineNumber: 192
    },
    __self: this
  })), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("label", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 202
    },
    __self: this
  }, " Confirm password:", react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "password",
    value: signupData.conf,
    onChange: function onChange(e) {
      return setSignupData(_babel_runtime_corejs2_core_js_object_assign__WEBPACK_IMPORTED_MODULE_1___default()({}, signupData, {
        conf: e.target.value
      }));
    },
    __source: {
      fileName: _jsxFileName,
      lineNumber: 203
    },
    __self: this
  })), react__WEBPACK_IMPORTED_MODULE_4___default.a.createElement("input", {
    type: "submit",
    value: "Submit",
    __source: {
      fileName: _jsxFileName,
      lineNumber: 213
    },
    __self: this
  }))));
}

Login.getInitialState =
/*#__PURE__*/
function () {
  var _ref2 = Object(_babel_runtime_corejs2_helpers_esm_asyncToGenerator__WEBPACK_IMPORTED_MODULE_2__["default"])(
  /*#__PURE__*/
  _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default.a.mark(function _callee3(_ref) {
    var store, isServer, pathname, query;
    return _babel_runtime_corejs2_regenerator__WEBPACK_IMPORTED_MODULE_0___default.a.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            store = _ref.store, isServer = _ref.isServer, pathname = _ref.pathname, query = _ref.query;
            return _context3.abrupt("return", {
              store: store
            });

          case 2:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function (_x3) {
    return _ref2.apply(this, arguments);
  };
}();

/* harmony default export */ __webpack_exports__["default"] = (Object(react_redux__WEBPACK_IMPORTED_MODULE_5__["connect"])(function (state) {
  return state;
})(Login));

/***/ })

})
//# sourceMappingURL=login.js.b1bb53a72701851fc7bd.hot-update.js.map