'use client';

// ═══════════════════════════════════════════════════════════════
// components/Analytics.tsx
// 根據 merchant_settings 動態注入 GA4 / Meta Pixel script
// 只在有填寫 ID 時才載入，不影響效能
// ═══════════════════════════════════════════════════════════════

import Script from 'next/script';

interface AnalyticsProps {
  gaMeasurementId?: string | null;
  metaPixelId?: string | null;
}

export default function Analytics({ gaMeasurementId, metaPixelId }: AnalyticsProps) {
  return (
    <>
      {/* ── GA4 ───────────────────────────────────────────── */}
      {gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}', { send_page_view: true });
              window.gtag = gtag;
            `}
          </Script>
        </>
      )}

      {/* ── Meta Pixel ────────────────────────────────────── */}
      {metaPixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
