'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface SessionResponse {
  logged_in: boolean;
  line_user_id?: string;
  display_name?: string;
  picture_url?: string | null;
  customer_id?: string | null;
}

export default function UserMenu() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 取得 session 狀態
  useEffect(() => {
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

  // 點擊外部關閉選單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 登出處理
  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession({ logged_in: false });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Loading 狀態
  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
    );
  }

  // 已登入狀態
  if (session?.logged_in) {
    return (
      <div className="relative" ref={menuRef}>
        {/* 觸發按鈕 */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="會員選單"
          aria-expanded={isOpen}
        >
          {session.picture_url ? (
            <Image
              src={session.picture_url}
              alt={session.display_name || 'User'}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full border border-gold/50"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold border border-gold/50">
              {session.display_name?.charAt(0) || 'U'}
            </div>
          )}
          <span className="hidden sm:inline text-sm text-gray-300 max-w-[100px] truncate">
            {session.display_name}
          </span>
          {/* 下拉箭頭 */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* 下拉選單 */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-black border border-gold/30 rounded-lg shadow-lg overflow-hidden z-50">
            {/* 用戶名稱（手機版顯示） */}
            <div className="sm:hidden px-4 py-3 border-b border-gold/20">
              <p className="text-sm text-gold font-medium truncate">{session.display_name}</p>
            </div>

            {/* 選單項目 */}
            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-gold hover:bg-gold/5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              我的帳號
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-300 hover:text-red-400 hover:bg-red-500/5 transition-colors border-t border-gold/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              登出
            </button>
          </div>
        )}
      </div>
    );
  }

  // 未登入狀態：顯示登入按鈕
  return (
    <Link
      href="/login"
      className="flex items-center gap-2 border border-gold/50 hover:border-gold hover:bg-gold/10 text-gold font-medium rounded-lg transition-colors px-3 py-1.5 text-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
      <span className="hidden md:inline">登入</span>
    </Link>
  );
}
