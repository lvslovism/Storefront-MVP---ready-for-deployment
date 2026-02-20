import Link from 'next/link';
import StaggerContainer, { StaggerItem } from './StaggerContainer';
import type { MotionThemeConfig } from '@/lib/motion/themes';

interface Card {
  icon?: string;
  title: string;
  description: string;
  link_url?: string;
}

interface Props {
  sectionKey?: string;
  theme: MotionThemeConfig;
  data?: {
    heading?: string;
    subtitle?: string;
    cards: Card[];
  } | null;
}

export default function CardRowSection({ theme, data }: Props) {
  if (!data?.cards?.length) return null;

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 區塊標題 */}
        {data.heading && (
          <div className="text-center mb-12">
            {data.subtitle && (
              <p className="text-xs tracking-[4px] mb-3 uppercase" style={{ color: 'rgba(212,175,55,0.6)' }}>
                {data.subtitle}
              </p>
            )}
            <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text">
              {data.heading}
            </h2>
          </div>
        )}

        {/* 卡片網格 */}
        <StaggerContainer
          theme={theme}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {data.cards.map((card, i) => (
            <StaggerItem key={i} theme={theme}>
              <CardContent card={card} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function CardContent({ card }: { card: Card }) {
  const inner = (
    <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover-lift">
      {card.icon && (
        <div className="text-3xl mb-4">{card.icon}</div>
      )}
      <h3 className="text-lg font-medium text-white mb-2 tracking-wide">
        {card.title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {card.description}
      </p>
    </div>
  );

  if (card.link_url) {
    return (
      <Link href={card.link_url} className="block h-full">
        {inner}
      </Link>
    );
  }

  return inner;
}
