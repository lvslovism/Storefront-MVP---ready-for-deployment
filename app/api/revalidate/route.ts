// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 支援 header 或 body 傳入 secret
  const headerSecret = request.headers.get('x-revalidate-secret');
  const body = await request.json();
  const secret = headerSecret || body.secret;

  // 驗證 REVALIDATE_SECRET
  if (!process.env.REVALIDATE_SECRET) {
    console.error('[Revalidate] REVALIDATE_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 支援單一 path 或多個 paths
  const { path, paths } = body;
  const pathsToRevalidate: string[] = [];

  if (paths && Array.isArray(paths)) {
    pathsToRevalidate.push(...paths);
  } else if (path) {
    pathsToRevalidate.push(path);
  } else {
    pathsToRevalidate.push('/');
  }

  // 逐一 revalidate
  for (const p of pathsToRevalidate) {
    revalidatePath(p);
  }

  return NextResponse.json({
    revalidated: true,
    paths: pathsToRevalidate,
    timestamp: new Date().toISOString(),
  });
}
