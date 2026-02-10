import { NextResponse } from 'next/server';

// 用 LINE access token 驗證用戶身份
export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
    }

    // 呼叫 LINE API 驗證 token 並取得用戶資料
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const profile = await profileRes.json();
    // profile: { userId, displayName, pictureUrl }

    return NextResponse.json({
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    });
  } catch (e) {
    console.error('LIFF verify error:', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
