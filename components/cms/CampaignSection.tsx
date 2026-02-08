interface Campaign {
  id: string
  title: string
  subtitle?: string
  badge_text?: string
  banner_image_url?: string
  plans: {
    name: string
    price: number
    original_price?: number
    description?: string
    badge?: string
    link_url?: string
  }[]
}

interface CampaignSectionProps {
  campaigns: Campaign[]
}

export default function CampaignSection({ campaigns }: CampaignSectionProps) {
  if (!campaigns || campaigns.length === 0) return null

  return (
    <>
      {campaigns.map((campaign) => (
        <section key={campaign.id} className="py-16" style={{
          background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0) 100%)',
          borderTop: '1px solid rgba(212,175,55,0.15)',
        }}>
          <div className="max-w-7xl mx-auto px-5">
            {/* 標題區 */}
            <div className="text-center mb-10">
              {campaign.badge_text && (
                <span className="inline-block text-xs px-3 py-1 rounded-full mb-4"
                  style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                  🔥 {campaign.badge_text}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-light tracking-wider gold-text mb-3">
                {campaign.title}
              </h2>
              {campaign.subtitle && (
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {campaign.subtitle}
                </p>
              )}
            </div>

            {/* 方案卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {campaign.plans.map((plan, i) => (
                <a
                  key={i}
                  href={plan.link_url || '/products'}
                  className="group relative p-5 rounded-xl text-center transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(212,175,55,0.2)',
                  }}
                >
                  {/* 角標 */}
                  {plan.badge && (
                    <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full text-black font-bold"
                      style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E6A3)' }}>
                      {plan.badge}
                    </span>
                  )}

                  <div className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {plan.name}
                  </div>

                  {plan.original_price && (
                    <div className="text-xs line-through mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      NT${plan.original_price.toLocaleString()}
                    </div>
                  )}

                  <div className="text-2xl md:text-3xl font-bold gold-text mb-2">
                    ${plan.price.toLocaleString()}
                  </div>

                  {plan.description && (
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {plan.description}
                    </div>
                  )}

                  <div className="mt-3 text-xs px-3 py-1.5 rounded-full inline-block transition-colors"
                    style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                    立即搶購 →
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  )
}
