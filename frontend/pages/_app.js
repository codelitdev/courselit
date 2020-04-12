import { Provider } from "react-redux";
import App from "next/app";
import makeStore from "../redux/store.js";
import withRedux from "next-redux-wrapper";
import { getCookie } from "../lib/session.js";
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants.js";
import {
  signedIn,
  updateSiteInfo,
  authHasBeenChecked,
  updateCustomisations
} from "../redux/actions.js";
import { ThemeProvider } from "@material-ui/styles";
import theme from "../theme";
import CodeInjector from "../components/CodeInjector.js";

class MyApp extends App {
  constructor(props) {
    super(props);

    this.state = {
      headCode: `
      <script>
        "use strict";
        !function() {
          var t = window.driftt = window.drift = window.driftt || [];
          if (!t.init) {
            if (t.invoked) return void (window.console && console.error && console.error("Drift snippet included twice."));
            t.invoked = !0, t.methods = [ "identify", "config", "track", "reset", "debug", "show", "ping", "page", "hide", "off", "on" ], 
            t.factory = function(e) {
              return function() {
                var n = Array.prototype.slice.call(arguments);
                return n.unshift(e), t.push(n), t;
              };
            }, t.methods.forEach(function(e) {
              t[e] = t.factory(e);
            }), t.load = function(t) {
              var e = 3e5, n = Math.ceil(new Date() / e) * e, o = document.createElement("script");
              o.type = "text/javascript", o.async = !0, o.crossorigin = "anonymous", o.src = "https://js.driftt.com/include/" + n + "/" + t + ".js";
              var i = document.getElementsByTagName("script")[0];
              i.parentNode.insertBefore(o, i);
            };
          }
        }();
        drift.SNIPPET_VERSION = '0.3.1';
        drift.load('2x4f2cm87muu');
      </script>
      <!-- Global site tag (gtag.js) - Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=UA-163326223-1"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'UA-163326223-1');
      </script>
      `,
      bodyCode: `
      <div id="fb-root"></div>
      <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_GB/sdk.js#xfbml=1&version=v6.0&appId=982276498618242&autoLogAppEvents=1"></script>
      `
    };
  }

  static async getInitialProps(props) {
    const { Component, ctx } = props;
    await ctx.store.dispatch(updateSiteInfo());
    await ctx.store.dispatch(updateCustomisations());
    const pageProps = Component.getInitialProps
      ? await Component.getInitialProps(ctx)
      : {};
    return { pageProps };
  }

  componentDidMount() {
    this.setUpCookies();
    this.removeServerSideInjectedCSS();

    // const driftComp = document.createElement('script');
    // driftComp.innerHTML = `
    //   "use strict";
    //   !function() {
    //     var t = window.driftt = window.drift = window.driftt || [];
    //     if (!t.init) {
    //       if (t.invoked) return void (window.console && console.error && console.error("Drift snippet included twice."));
    //       t.invoked = !0, t.methods = [ "identify", "config", "track", "reset", "debug", "show", "ping", "page", "hide", "off", "on" ],
    //       t.factory = function(e) {
    //         return function() {
    //           var n = Array.prototype.slice.call(arguments);
    //           return n.unshift(e), t.push(n), t;
    //         };
    //       }, t.methods.forEach(function(e) {
    //         t[e] = t.factory(e);
    //       }), t.load = function(t) {
    //         var e = 3e5, n = Math.ceil(new Date() / e) * e, o = document.createElement("script");
    //         o.type = "text/javascript", o.async = !0, o.crossorigin = "anonymous", o.src = "https://js.driftt.com/include/" + n + "/" + t + ".js";
    //         var i = document.getElementsByTagName("script")[0];
    //         i.parentNode.insertBefore(o, i);
    //       };
    //     }
    //   }();
    //   drift.SNIPPET_VERSION = '0.3.1';
    //   drift.load('2x4f2cm87muu');
    // `
    // document.head.appendChild(driftComp);
    // console.log('appended');

    // const headContainer = document.createElement('div')
    // headContainer.innerHTML = this.state.headCode;
    // console.log(headContainer);
    // while (headContainer.firstChild) {
    //     document.head.appendChild(headContainer.firstChild);
    //     headContainer.removeChild(headContainer.firstChild);
    // }
  }

  setUpCookies() {
    const { store } = this.props;
    const tokenCookie = getCookie(JWT_COOKIE_NAME);
    if (tokenCookie) {
      store.dispatch(
        signedIn(getCookie(USERID_COOKIE_NAME), getCookie(JWT_COOKIE_NAME))
      );
    }
    store.dispatch(authHasBeenChecked());
  }

  removeServerSideInjectedCSS() {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  render() {
    const { Component, pageProps, store } = this.props;

    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <Component {...pageProps} />
          <CodeInjector />
        </ThemeProvider>
      </Provider>
    );
  }
}

export default withRedux(makeStore)(MyApp);
