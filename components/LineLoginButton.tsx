'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LineSession {
  logged_in: boolean;
  line_user_id?: string;
  display_name?: string;
  picture_url?: string | null;
  customer_id?: string | null;
}

export default function LineLoginButton() {
  const [session, setSession] = useState<LineSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 取得 session
    fetch('/api/auth/line/session')
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        setSession({ logged_in: false });
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/line/session', { method: 'DELETE' });
    setSession({ logged_in: false });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
    );
  }

  if (session?.logged_in) {
    // 已登入：顯示頭像 + 登出
    return (
      <div className="flex items-center gap-2">
        {session.picture_url ? (
          <Image
            src={session.picture_url}
            alt={session.display_name || 'User'}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border border-gold/50"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
            {session.display_name?.charAt(0) || 'U'}
          </div>
        )}
        <span className="hidden sm:inline text-sm text-gray-300 max-w-[100px] truncate">
          {session.display_name}
        </span>
        <button
          onClick={handleLogout}
          className="hidden sm:inline text-xs text-gray-400 hover:text-white transition-colors"
        >
          登出
        </button>
      </div>
    );
  }

  // 未登入：LINE Login 按鈕
  return (
    <a
      href="/api/auth/line"
      className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-medium rounded transition-colors px-2 py-2 md:px-3 md:py-1.5 text-sm"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 md:w-4 md:h-4"
      >
        <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.62 1.39 4.98 3.58 6.56-.12.67-.64 2.72-.74 3.16-.13.55.2.54.42.4.18-.12 2.82-1.92 3.97-2.7.88.14 1.79.22 2.77.22 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" />
      </svg>
      <span className="hidden md:inline">LINE 登入</span>
    </a>
  );
}
