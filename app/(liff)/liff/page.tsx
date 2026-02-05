import { Metadata } from 'next';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: `LIFF | ${config.store.name}`,
  description: 'LINE LIFF 應用程式',
};

export default function LiffPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center p-8">
        <div className="text-6xl mb-6">📱</div>
        <h1 className="text-2xl font-bold gold-text mb-4">LIFF 功能開發中</h1>
        <p className="text-gray-400">
          LINE 會員功能即將推出，敬請期待！
        </p>
      </div>
    </div>
  );
}
