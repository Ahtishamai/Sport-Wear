'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Media thumbnail that says so when the file is missing, instead of rendering a
 * broken-image icon. Deliberately a plain <img>: the admin only needs a small
 * preview, and going through the image optimizer adds a failure mode that
 * turns a missing file into an opaque error.
 */
export function Thumb({
  src,
  alt,
  className,
  fit = 'cover',
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-1 bg-[#F0F0ED] px-2 text-center',
          className
        )}
        title={src ? `File not found: ${src}` : 'No image set'}
      >
        <span className="text-[15px] leading-none text-[#C42027]">⚠</span>
        <span className="text-[9px] font-semibold uppercase leading-tight tracking-[.08em] text-[#8A8C93]">
          {src ? 'File missing' : 'No image'}
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover', className)}
    />
  );
}
