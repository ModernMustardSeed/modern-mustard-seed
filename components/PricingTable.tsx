import { packages } from '@/data/pricing';
import PricingCard from './PricingCard';

export default function PricingTable() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto items-stretch">
        {packages.map((pkg) => (
          <PricingCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </section>
  );
}
