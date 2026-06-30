'use client';

interface PriceBadgeProps {
  price: number;
  discountPrice?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  currency?: string;
  isFree?: boolean;
}

export function isDiscountActive(discountPrice: number | null | undefined, price: number, discountStartsAt?: string | null, discountEndsAt?: string | null) {
  if (discountPrice === null || discountPrice === undefined || discountPrice >= price) return false;
  const now = Date.now();
  const starts = discountStartsAt ? new Date(discountStartsAt).getTime() : null;
  const ends = discountEndsAt ? new Date(discountEndsAt).getTime() : null;
  return (!starts || starts <= now) && (!ends || ends >= now);
}

export default function PriceBadge({ price, discountPrice, discountStartsAt, discountEndsAt, currency = 'EUR', isFree }: PriceBadgeProps) {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;

  if (isFree || price === 0) {
    return (
      <span className="text-emerald-400 font-bold text-lg">Free</span>
    );
  }

  const hasDiscount = isDiscountActive(discountPrice, price, discountStartsAt, discountEndsAt);
  const active = hasDiscount ? discountPrice! : price;

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-white font-bold text-lg">{symbol}{active.toFixed(2)}</span>
      {hasDiscount && (
        <span className="text-neutral-500 text-sm line-through">{symbol}{price.toFixed(2)}</span>
      )}
    </div>
  );
}
