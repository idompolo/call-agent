import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/PretendardVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Pretendard-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Pretendard-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* DNS Prefetch for external fonts (if using) */}
        <link rel="dns-prefetch" href="https://rsms.me" />
        
        {/* Font optimization meta tags */}
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}