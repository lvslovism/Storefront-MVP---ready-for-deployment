import Image from 'next/image';
import Link from 'next/link';
import StaggerContainer, { StaggerItem } from './StaggerContainer';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface BannerItem {
  image_url: string;
  title?: string;
  link_url?: string;
}

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    left: BannerItem;
    right: BannerItem;
  } | null;
}

export default function DuoBannerSection({ theme, data }: Props) {
  if (!data?.left?.image_url || !data?.right?.image_url) return null;

  const items = [data.left, data.right];

  return (
    <section className="py-8 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <StaggerContainer
          theme={theme}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {items.map((item, i) => (
            <StaggerItem key={i} theme={theme}>
              <BannerCard item={item} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function BannerCard({ item }: { item: BannerItem }) {
  const imageContent = (
    <div className="relative aspect-[4/3] rounded-xl overflow-hidden hover-lift">
      <Image
        src={item.image_url}
        alt={item.title || ''}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      {item.title && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-5">
          <h3 className="text-lg md:text-xl font-light text-white tracking-wider">
            {item.title}
          </h3>
        </div>
      )}
    </div>
  );

  if (item.link_url) {
    return (
      <Link href={item.link_url} className="block">
        {imageContent}
      </Link>
    );
  }

  return imageContent;
}
