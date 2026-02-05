import type { Metadata } from 'next';
import { config } from '@/lib/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartProvider from '@/components/CartProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: config.seo.title,
  description: config.seo.description,
  openGraph: {
    title: config.seo.title,
    description: config.seo.description,
    images: [config.seo.ogImage],
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
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
