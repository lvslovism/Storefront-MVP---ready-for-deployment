import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OrderDetailClient from './OrderDetailClient';

export const metadata = {
  title: '訂單詳情｜MINJIE STUDIO',
  description: '查看訂單詳細資訊',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await getSession();

  // 未登入則跳轉到登入頁
  if (!session) {
    const { id } = await params;
    redirect(`/login?redirect=/account/orders/${id}`);
  }

  const { id } = await params;

  return <OrderDetailClient orderId={id} session={session} />;
}
