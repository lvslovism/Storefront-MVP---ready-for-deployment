import Image from 'next/image';
import Link from 'next/link';
import StaggerContainer, { StaggerItem } from './StaggerContainer';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface GridItem {
  image_url: string;
  title?: string;
  link_url?: string;
}

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    images: GridItem[];
    columns?: 2 | 3;
  } | null;
}

export default function GridBannerSection({ theme, data }: Props) {
  if (!data?.images?.length) return null;

  const columns = data.columns || 2;
  const gridClass = columns === 3
    ? 'grid-cols-2 md:grid-cols-3'
    : 'grid-cols-2';

  return (
    <section className="py-8 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <StaggerContainer
          theme={theme}
          className={`grid ${gridClass} gap-4`}
        >
          {data.images.map((item, i) => (
            <StaggerItem key={i} theme={theme}>
              <GridCard item={item} columns={columns} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function GridCard({ item, columns }: { item: GridItem; columns: number }) {
  const imageContent = (
    <div className="relative aspect-[4/3] rounded-xl overflow-hidden hover-lift">
      <Image
        src={item.image_url}
        alt={item.title || ''}
        fill
        className="object-cover"
        sizes={columns === 3
          ? '(max-width: 768px) 50vw, 33vw'
          : '50vw'
        }
      />
      {item.title && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
          <h3 className="text-sm md:text-base font-light text-white tracking-wider">
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
