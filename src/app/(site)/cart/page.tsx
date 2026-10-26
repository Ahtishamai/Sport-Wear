import type { Metadata } from 'next';
import { CartView } from '@/components/shop/CartView';
import { PageHeaderBlock } from '@/components/blocks/sections';

export const metadata: Metadata = {
  title: 'Your cart',
  description: 'The designs and sizes you have chosen, ready to order.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/cart' },
};

export default function CartPage() {
  return (
    <>
      <PageHeaderBlock
        p={{ eyebrow: 'Your order', heading: 'Your cart', body: '', showBreadcrumb: true }}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Cart' }]}
      />
      <section className="gutter py-10 md:py-14">
        <CartView />
      </section>
    </>
  );
}
