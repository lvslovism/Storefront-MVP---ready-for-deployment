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
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
