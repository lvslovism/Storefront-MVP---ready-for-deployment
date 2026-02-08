import '@/styles/checkout.css'

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)' }}>
      {children}
    </div>
  );
}
