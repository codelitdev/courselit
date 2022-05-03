import '../styles/globals.css'
import type { AppProps } from 'next/app'
import type { User } from "@courselit/common-models";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
