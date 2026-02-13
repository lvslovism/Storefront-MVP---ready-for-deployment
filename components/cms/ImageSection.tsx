// components/cms/ImageSection.tsx
import Link from 'next/link';
import type { CmsBanner } from '@/lib/cms';

interface ImageSectionProps {
  banner: CmsBanner | null;
  /** 無圖片時是否隱藏區塊（預設 true） */
  hideWhenEmpty?: boolean;
  /** 優先載入（LCP 用，只給第一個區塊設 true） */
  priority?: boolean;
}

export default function ImageSection({
  banner,
  hideWhenEmpty = true,
  priority = false
}: ImageSectionProps) {
  // 無資料或圖片 URL 為空字串 → 隱藏或顯示 placeholder
  if (!banner || !banner.image_url || banner.image_url.trim() === '') {
    if (hideWhenEmpty) return null;
    return (
      <section
        className="w-full flex items-center justify-center"
        style={{
          background: '#0a0a0a',
          minHeight: '200px',
          border: '1px dashed rgba(212,175,55,0.2)'
        }}
      >
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {banner?.title || '圖片區塊'} — 請至 CMS 上傳圖片
        </p>
      </section>
    );
  }

  const desktopSrc = banner.image_url;
  const mobileSrc = banner.image_mobile_url || banner.image_url;
  const alt = banner.title || 'MINJIE STUDIO';
  const hasLink = banner.link_url && banner.link_url.trim() !== '';

  const imageContent = (
    <div className="w-full" style={{ background: '#0a0a0a' }}>
      {/* 桌面版圖片 */}
      <picture>
        {/* 手機版：< 768px 使用 mobile 圖 */}
        <source
          media="(max-width: 767px)"
          srcSet={mobileSrc}
        />
        {/* 桌面版：>= 768px 使用 desktop 圖 */}
        <source
          media="(min-width: 768px)"
          srcSet={desktopSrc}
        />
        {/* fallback img */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={desktopSrc}
          alt={alt}
          style={{
            width: '100%',
            maxWidth: '1920px',
            maxHeight: '900px',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
          }}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
        />
      </picture>
    </div>
  );

  // 有連結 → 包 Link
  if (hasLink) {
    const isExternal = banner.link_url!.startsWith('http');

    if (isExternal) {
      return (
        <a
          href={banner.link_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {imageContent}
        </a>
      );
    }

    return (
      <Link href={banner.link_url!} className="block">
        {imageContent}
      </Link>
    );
  }

  // 無連結 → 純展示
  return imageContent;
}
