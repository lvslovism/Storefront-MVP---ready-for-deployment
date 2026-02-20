'use client';
import { useRef, useEffect } from 'react';
import { useInView } from 'framer-motion';
import AnimatedSection from './AnimatedSection';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    title?: string;
    subtitle?: string;
    video_url: string;
    video_type: 'youtube' | 'mp4';
    poster_image?: string;
  } | null;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

export default function VideoSection({ theme, data }: Props) {
  if (!data?.video_url) return null;

  return (
    <AnimatedSection theme={theme} animation="fade_up">
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          {/* 標題 */}
          {data.title && (
            <div className="text-center mb-10">
              {data.subtitle && (
                <p className="text-xs tracking-[4px] mb-3 uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  {data.subtitle}
                </p>
              )}
              <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text">
                {data.title}
              </h2>
            </div>
          )}

          {/* 影片 */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900">
            {data.video_type === 'youtube' ? (
              <YouTubeEmbed url={data.video_url} title={data.title} />
            ) : (
              <Mp4Player url={data.video_url} poster={data.poster_image} />
            )}
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}

function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
      title={title || 'Video'}
      className="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}

function Mp4Player({ url, poster }: { url: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.5 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      />
    </div>
  );
}
