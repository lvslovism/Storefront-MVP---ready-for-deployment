import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProducts, getProductByHandle } from '@/lib/medusa';
import { config } from '@/lib/config';
import ProductDetail from '@/components/ProductDetail';

export const revalidate = 3600;

interface Props {
  params: { handle: string };
}

// 產生靜態路徑
export async function generateStaticParams() {
  const { products } = await getProducts({ limit: 100 });
  return products.map((product) => ({
    handle: product.handle,
  }));
}

// 動態 metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductByHandle(params.handle);
  
  if (!product) {
    return {
      title: '商品不存在',
    };
  }

  return {
    title: `${product.title} | ${config.store.name}`,
    description: product.description || config.seo.description,
    openGraph: {
      title: product.title,
      description: product.description || config.seo.description,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductByHandle(params.handle);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
