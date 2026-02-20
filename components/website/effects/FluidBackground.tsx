'use client';

export default function FluidBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div
        className="absolute rounded-full animate-fluid-1"
        style={{
          width: '500px',
          height: '500px',
          background: 'rgba(212,175,55,0.08)',
          filter: 'blur(120px)',
          top: '-10%',
          left: '-5%',
        }}
      />
      <div
        className="absolute rounded-full animate-fluid-2"
        style={{
          width: '400px',
          height: '400px',
          background: 'rgba(217,158,46,0.06)',
          filter: 'blur(100px)',
          top: '20%',
          right: '-10%',
        }}
      />
      <div
        className="absolute rounded-full animate-fluid-3"
        style={{
          width: '350px',
          height: '350px',
          background: 'rgba(212,175,55,0.05)',
          filter: 'blur(80px)',
          bottom: '-5%',
          left: '30%',
        }}
      />
    </div>
  );
}
