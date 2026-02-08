interface TrustNumbersProps {
  data: {
    items: { number: string; label: string }[]
  } | null
}

// 預設數據
const DEFAULT_ITEMS = [
  { number: '900+', label: '商品銷售' },
  { number: '689萬', label: '社群觸及' },
  { number: '19K+', label: '滿意客戶' },
  { number: '95%', label: '好評率' },
]

export default function TrustNumbers({ data }: TrustNumbersProps) {
  const items = data?.items || DEFAULT_ITEMS

  return (
    <section style={{
      borderTop: '1px solid rgba(212,175,55,0.15)',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
      background: 'rgba(212,175,55,0.02)',
    }}>
      <div className="max-w-7xl mx-auto px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-2xl md:text-3xl font-bold gold-text">{item.number}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
