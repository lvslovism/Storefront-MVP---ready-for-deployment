import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MINJIE STUDIO',
  description: 'LINE LIFF 結帳頁面',
};

// LIFF 頁面專用 Layout：無 Header/Footer，手機全螢幕
export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {children}
    </div>
  );
}
