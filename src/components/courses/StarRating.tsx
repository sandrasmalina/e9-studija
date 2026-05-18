'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;   // 0–5, supports decimals
  count?: number;
  size?: number;
  showCount?: boolean;
}

export default function StarRating({ rating, count, size = 14, showCount = true }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.min(1, Math.max(0, rating - (star - 1)));
          return (
            <span key={star} className="relative inline-block" style={{ width: size, height: size }}>
              <Star size={size} className="text-neutral-700 fill-neutral-700" />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star size={size} className="text-yellow-400 fill-yellow-400" />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showCount && count !== undefined && (
        <span className="text-neutral-500 text-xs">({count.toLocaleString()})</span>
      )}
    </div>
  );
}
