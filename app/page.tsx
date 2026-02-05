import { getProducts } from '@/lib/medusa';
import { config } from '@/lib/config';
import ProductCard from '@/components/ProductCard';

export const revalidate = 3600; // ISR: 1 小時重新驗證

export default async function HomePage() {
  const { products } = await getProducts({ limit: 50 });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {config.store.name}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {config.store.description}
        </p>
      </section>

      {/* 免運提示 */}
      {config.shipping.freeShippingThreshold > 0 && (
        <div className="bg-secondary text-center py-3 mb-8 rounded">
          <p className="text-sm">
            🚚 滿 <span className="font-bold">NT${config.shipping.freeShippingThreshold}</span> 免運費
          </p>
        </div>
      )}

      {/* 商品列表 */}
      <section>
        <h2 className="text-2xl font-bold mb-6">全部商品</h2>
        
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-12">目前沒有商品</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
