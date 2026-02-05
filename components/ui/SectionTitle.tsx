interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="text-center mb-10">
      {subtitle && (
        <div
          className="text-[11px] tracking-[4px] mb-3"
          style={{ color: 'rgba(212,175,55,0.5)' }}
        >
          {subtitle}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text">
        {title}
      </h2>
    </div>
  );
}
