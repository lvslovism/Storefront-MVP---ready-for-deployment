import type { Metadata } from 'next';
import { config } from '@/lib/config';
import CartProvider from '@/components/CartProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://shop.minjie0326.com'),
  title: {
    default: config.seo.title,
    template: `%s | ${config.store.name}`,
  },
  description: config.seo.description,
  openGraph: {
    title: config.seo.title,
    description: config.seo.description,
    url: 'https://shop.minjie0326.com',
    images: [config.seo.ogImage],
    siteName: config.store.name,
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        {/* 動態注入主題 CSS 變數 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --color-primary: ${config.theme.primaryColor};
                --color-secondary: ${config.theme.secondaryColor};
                --color-accent: ${config.theme.accentColor};
                --font-family: ${config.theme.fontFamily};
                --border-radius: ${config.theme.borderRadius};
              }
            `,
          }}
        />
        <link rel="icon" href={config.store.favicon} />
      </head>
      <body className="min-h-screen">
        {/* 全站 JSON-LD: WebSite + Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'MINJIE STUDIO',
                url: 'https://shop.minjie0326.com',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://shop.minjie0326.com/search?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'MINJIE STUDIO',
                url: 'https://shop.minjie0326.com',
                logo: 'https://shop.minjie0326.com/tenant/logo.png',
                description: '嚴選健康食品，為家人把關每一口',
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer service',
                  url: 'https://lin.ee/Ro3Fd4p',
                  availableLanguage: 'Chinese',
                },
                sameAs: [
                  'https://lin.ee/Ro3Fd4p',
                ],
              },
            ]),
          }}
        />
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
