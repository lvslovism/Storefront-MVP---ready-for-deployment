import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AccountClient from './AccountClient';

export const metadata = {
  title: '我的帳號｜MINJIE STUDIO',
  description: '管理您的 MINJIE STUDIO 會員帳號、訂單紀錄、會員等級、購物金與個人資料',
};

export default async function AccountPage() {
  const session = await getSession();

  // 未登入則跳轉到登入頁
  if (!session) {
    redirect('/login?redirect=/account');
  }

  return <AccountClient session={session} />;
}
