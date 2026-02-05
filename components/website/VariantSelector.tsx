'use client';

interface Option {
  id: string;
  title: string;
  values: Array<{ id: string; value: string }>;
}

interface VariantSelectorProps {
  options: Option[];
  selectedOptions: Record<string, string>;
  onSelect: (optionId: string, value: string) => void;
}

export default function VariantSelector({ options, selectedOptions, onSelect }: VariantSelectorProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="space-y-5">
      {options.map((option) => (
        <div key={option.id}>
          <label className="block text-sm mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {option.title}
          </label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((val) => {
              const isSelected = selectedOptions[option.id] === val.value;
              return (
                <button
                  key={val.id}
                  onClick={() => onSelect(option.id, val.value)}
                  className="px-5 py-2.5 rounded-lg text-sm transition-all duration-200"
                  style={{
                    background: isSelected ? '#D4AF37' : 'transparent',
                    color: isSelected ? '#000' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isSelected ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {val.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
