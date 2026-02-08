interface PaymentLogosProps {
  data: {
    logos: { name: string; icon: string }[]
  } | null
}

const DEFAULT_LOGOS = [
  { name: '信用卡', icon: '💳' },
  { name: 'LINE Pay', icon: '📱' },
  { name: 'ATM', icon: '🏧' },
  { name: '超商付款', icon: '🏪' },
]

export default function PaymentLogos({ data }: PaymentLogosProps) {
  const logos = data?.logos || DEFAULT_LOGOS

  return (
    <section style={{
      borderTop: '1px solid rgba(212,175,55,0.1)',
      background: 'rgba(0,0,0,0.3)',
    }}>
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>付款方式</span>
          {logos.map((logo) => (
            <div key={logo.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-sm">{logo.icon || '💳'}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
