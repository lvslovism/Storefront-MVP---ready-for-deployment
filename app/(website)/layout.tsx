import WebsiteHeader from '@/components/website/Header';
import WebsiteFooter from '@/components/website/Footer';

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-100">
      <WebsiteHeader />
      <main className="flex-grow">{children}</main>
      <WebsiteFooter />
    </div>
  );
}
