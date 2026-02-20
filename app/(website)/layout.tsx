import { Suspense } from 'react';
import WebsiteHeader from '@/components/website/Header';
import WebsiteFooter from '@/components/website/Footer';
import AnnouncementBarServer from '@/components/cms/AnnouncementBarServer';
import Analytics from '@/components/Analytics';
import { getMerchantSettings } from '@/lib/cms';
import CursorGlow from '@/components/website/effects/CursorGlow';

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getMerchantSettings();

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-100">
      <CursorGlow />
      <Analytics
        gaMeasurementId={settings?.ga_measurement_id}
        metaPixelId={settings?.meta_pixel_id}
      />
      <WebsiteHeader />
      <Suspense fallback={null}>
        <AnnouncementBarServer />
      </Suspense>
      <main className="flex-grow">{children}</main>
      <WebsiteFooter />
    </div>
  );
}
