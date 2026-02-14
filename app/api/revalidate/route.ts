// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error('[Revalidate] REVALIDATE_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const headerSecret = request.headers.get('x-revalidate-secret');
  if (headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const paths: string[] = body.paths || (body.path ? [body.path] : ['/']);

    for (const p of paths) {
      revalidatePath(p);
    }

    return NextResponse.json({
      revalidated: true,
      paths,
      now: Date.now(),
    });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
