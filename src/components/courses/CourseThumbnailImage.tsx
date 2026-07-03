'use client';

import { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';

interface Props {
  thumbnailUrl: string | null | undefined;
  thumbnailUrlLv?: string | null;
  promoVideoUrl?: string | null;
  promoVideoType?: string | null;
  /** Pass the current UI language so the correct LV/EN thumbnail is chosen */
  language?: string | null;
  alt: string;
  /** Tailwind classes applied to the <img>. Default fills parent absolutely. */
  imgClassName?: string;
  /** Tailwind classes for the fallback wrapper div */
  fallbackClassName?: string;
  /** Icon size for the fallback placeholder */
  fallbackIconSize?: number;
}

function extractVimeoId(url: string): string {
  const m = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  return m ? m[1] : url;
}

/**
 * Renders a course thumbnail image.
 * - Uses thumbnailUrl/thumbnailUrlLv if available.
 * - Auto-fetches a Vimeo thumbnail via oEmbed when thumbnailUrl is absent
 *   and promo_video_type is 'vimeo'.
 * - Shows a PlayCircle placeholder while loading / when nothing is available.
 */
export default function CourseThumbnailImage({
  thumbnailUrl,
  thumbnailUrlLv,
  promoVideoUrl,
  promoVideoType,
  language,
  alt,
  imgClassName = 'absolute inset-0 w-full h-full object-cover',
  fallbackClassName = 'absolute inset-0 w-full h-full flex items-center justify-center',
  fallbackIconSize = 32,
}: Props) {
  const useLatvian = language === 'lv';
  const resolved = useLatvian
    ? (thumbnailUrlLv || thumbnailUrl)
    : (thumbnailUrl || thumbnailUrlLv);

  const [vimeoThumb, setVimeoThumb] = useState<string | null>(null);

  useEffect(() => {
    if (resolved || promoVideoType !== 'vimeo' || !promoVideoUrl) return;
    const id = extractVimeoId(promoVideoUrl);
    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=640`)
      .then(r => r.json())
      .then((data: { thumbnail_url?: string }) => {
        if (data.thumbnail_url) setVimeoThumb(data.thumbnail_url);
      })
      .catch(() => {});
  }, [resolved, promoVideoUrl, promoVideoType]);

  const displayUrl = resolved || vimeoThumb;

  if (displayUrl) {
    return <img src={displayUrl} alt={alt} className={imgClassName} />;
  }

  return (
    <div className={fallbackClassName}>
      <PlayCircle size={fallbackIconSize} className="text-zinc-700" />
    </div>
  );
}
