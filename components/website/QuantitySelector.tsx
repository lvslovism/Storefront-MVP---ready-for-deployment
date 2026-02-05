'use client';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({ quantity, onChange, min = 1, max = 99 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-200"
        style={{
          border: '1px solid rgba(212,175,55,0.3)',
          color: quantity <= min ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
          cursor: quantity <= min ? 'not-allowed' : 'pointer',
        }}
      >
        −
      </button>
      <span className="w-12 text-center text-base font-medium"
        style={{ color: 'rgba(255,255,255,0.9)' }}>
        {quantity}
      </span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-200"
        style={{
          border: '1px solid rgba(212,175,55,0.3)',
          color: quantity >= max ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
          cursor: quantity >= max ? 'not-allowed' : 'pointer',
        }}
      >
        +
      </button>
    </div>
  );
}
