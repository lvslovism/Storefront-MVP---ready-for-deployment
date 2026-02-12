import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginClient from './LoginClient';

export const metadata = {
  title: '登入｜MINJIE STUDIO',
  description: '登入您的 MINJIE STUDIO 會員帳號，享有專屬優惠與會員權益',
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const redirectTo = params.redirect || '/';

  // 已登入則跳轉
  if (session) {
    redirect(redirectTo);
  }

  return <LoginClient redirectTo={redirectTo} />;
}
