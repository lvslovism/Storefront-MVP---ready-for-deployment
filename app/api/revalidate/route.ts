// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 支援 header 或 body 傳入 secret
  const headerSecret = request.headers.get('x-revalidate-secret');
  const body = await request.json();
  const secret = headerSecret || body.secret;

  // 簡單驗證（正式環境用更強的驗證）
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = body;

  revalidatePath(path || '/');

  return NextResponse.json({
    revalidated: true,
    path: path || '/',
    timestamp: new Date().toISOString()
  });
}
