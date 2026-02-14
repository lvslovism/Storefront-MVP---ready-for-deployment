import WebsiteHeader from '@/components/website/Header';
import WebsiteFooter from '@/components/website/Footer';
import AnnouncementBar from '@/components/cms/AnnouncementBar';
import { getAnnouncements } from '@/lib/cms';

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let announcements: any[] = [];
  try {
    announcements = await getAnnouncements();
  } catch (error) {
    console.error('[Layout] getAnnouncements error:', error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-100">
      <WebsiteHeader />
      <AnnouncementBar announcements={announcements} />
      <main className="flex-grow">{children}</main>
      <WebsiteFooter />
    </div>
  );
}
