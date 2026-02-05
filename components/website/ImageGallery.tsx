'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
  images: Array<{ id: string; url: string }>;
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl flex items-center justify-center"
        style={{ background: '#111', border: '1px solid rgba(212,175,55,0.1)' }}>
        <div className="text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-sm">無圖片</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 主圖 */}
      <div className="aspect-square relative rounded-2xl overflow-hidden mb-4"
        style={{ background: '#111', border: '1px solid rgba(212,175,55,0.1)' }}>
        <Image
          src={images[selectedIndex].url}
          alt={`${title} - ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={selectedIndex === 0}
        />
      </div>

      {/* 縮圖列表 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(i)}
              className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden relative transition-all duration-200"
              style={{
                border: `2px solid ${i === selectedIndex ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.15)'}`,
                opacity: i === selectedIndex ? 1 : 0.6,
              }}
            >
              <Image
                src={img.url}
                alt={`${title} 縮圖 ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
