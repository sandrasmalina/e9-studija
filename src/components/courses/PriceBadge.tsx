'use client';

interface PriceBadgeProps {
  price: number;
  discountPrice?: number | null;
  currency?: string;
  isFree?: boolean;
}

export default function PriceBadge({ price, discountPrice, currency = 'EUR', isFree }: PriceBadgeProps) {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;

  if (isFree || price === 0) {
    return (
      <span className="text-emerald-400 font-bold text-lg">Free</span>
    );
  }

  const active = discountPrice ?? price;
  const hasDiscount = discountPrice !== null && discountPrice !== undefined && discountPrice < price;

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-white font-bold text-lg">{symbol}{active.toFixed(2)}</span>
      {hasDiscount && (
        <span className="text-neutral-500 text-sm line-through">{symbol}{price.toFixed(2)}</span>
      )}
    </div>
  );
}
