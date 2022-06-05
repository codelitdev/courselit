import React from "react";
import Document, { Html, Head, Main, NextScript } from "next/document";
import createEmotionServer from "@emotion/server/create-instance";
import createEmotionCache from "../ui-lib/create-emotion-cache";

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
    const originalRenderPage = ctx.renderPage;

    const cache = createEmotionCache();
    const { extractCriticalToChunks } = createEmotionServer(cache);

    ctx.renderPage = () =>
        originalRenderPage({
            // eslint-disable-next-line react/display-name
            enhanceApp: (App: any) => (props) =>
                <App emotionCache={cache} {...props} />,
        });

    const initialProps = await Document.getInitialProps(ctx);
    // This is important. It prevents emotion to render invalid HTML.
    // See https://github.com/mui/material-ui/issues/26561#issuecomment-855286153
    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
        <style
            data-emotion={`${style.key} ${style.ids.join(" ")}`}
            key={style.key}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: style.css }}
        />
    ));

    return {
        ...initialProps,
        emotionStyleTags,
    };
};

export default MyDocument;
