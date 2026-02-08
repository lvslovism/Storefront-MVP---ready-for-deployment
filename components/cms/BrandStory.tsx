interface BrandStoryProps {
  data: {
    subtitle?: string
    title: string
    body: string
    image_url?: string
    badges?: { icon: string; label: string }[]
  } | null
}

export default function BrandStory({ data }: BrandStoryProps) {
  if (!data) return null

  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          {data.subtitle && (
            <div className="text-[11px] tracking-[4px] mb-4" style={{ color: 'rgba(212,175,55,0.5)' }}>
              {data.subtitle}
            </div>
          )}
          <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text mb-6">
            {data.title}
          </h2>
          {data.body.split('\n\n').map((p, i) => (
            <p key={i} className="text-sm leading-loose mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {p}
            </p>
          ))}
          {data.badges && data.badges.length > 0 && (
            <div className="flex gap-8 mt-6">
              {data.badges.map((badge) => (
                <div key={badge.label} className="text-center">
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <div className="text-[11px]" style={{ color: 'rgba(212,175,55,0.7)' }}>{badge.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-80 md:h-96 rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(212,175,55,0.15)' }}>
          {data.image_url && !data.image_url.includes('placeholder') ? (
            <img src={data.image_url} alt={data.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #1a1a1a, #111)', color: 'rgba(255,255,255,0.3)' }}>
              [ 形象照片 ]
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
