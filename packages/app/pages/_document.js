import React from "react";
import Document, { Html, Head, Main, NextScript } from "next/document";
import { ServerStyleSheets } from "@material-ui/styles";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" style={{ height: "100%", width: "100%" }}>
        <Head>
          <meta charSet="utf-8" />
          {/* <meta name="theme-color" content={theme.palette.primary.main} /> */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Fira+Code&display=swap"
          />
        </Head>
        <body style={{ height: "100%", width: "100%", margin: 0 }}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

MyDocument.getInitialProps = async (ctx) => {
  // Refer for more details: https://github.com/mui-org/material-ui/blob/master/examples/nextjs/pages/_document.js
  const sheets = new ServerStyleSheets();
  const originalRenderPage = ctx.renderPage;

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => (props) => sheets.collect(<App {...props} />),
    });

  const initialProps = await Document.getInitialProps(ctx);

  return {
    ...initialProps,
    styles: [
      <React.Fragment key="styles">
        {initialProps.styles}
        {sheets.getStyleElement()}
      </React.Fragment>,
    ],
  };
};

export default MyDocument;
