'use client';

import { useEffect, useState, useMemo } from 'react';

/**
 * Full-screen photo gallery with prev/next and keyboard support.
 * @param {string[]} photos — Image URLs (falsy entries ignored)
 * @param {boolean} isOpen
 * @param {number} initialIndex — Index when opening
 * @param {() => void} onClose
 */
export default function PhotoLightbox({ photos, isOpen, initialIndex = 0, onClose }) {
  const list = useMemo(() => (Array.isArray(photos) ? photos.filter(Boolean) : []), [photos]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || list.length === 0) return;
    const i = Math.max(0, Math.min(initialIndex, list.length - 1));
    setCurrentPhotoIndex(i);
  }, [isOpen, initialIndex, list.length]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || list.length === 0) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (list.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPhotoIndex((i) => (i - 1 + list.length) % list.length);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPhotoIndex((i) => (i + 1) % list.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, list.length, onClose]);

  if (!isOpen || list.length === 0) return null;

  const url = list[currentPhotoIndex];
  const showArrows = list.length > 1;

  const goPrev = () => setCurrentPhotoIndex((i) => (i - 1 + list.length) % list.length);
  const goNext = () => setCurrentPhotoIndex((i) => (i + 1) % list.length);

  return (
    <div
      className="fixed inset-0 z-[240] flex flex-col items-center justify-center p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      <button
        type="button"
        aria-label="Close gallery"
        className="absolute inset-0 bg-black/85 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[100dvh] w-full max-w-5xl flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between gap-2 px-1">
          <p className="text-sm font-medium text-white/90 tabular-nums drop-shadow-md">
            {currentPhotoIndex + 1} / {list.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex w-full flex-1 min-h-0 max-h-[min(78dvh,720px)] items-center justify-center overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {showArrows && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1 sm:left-2 top-1/2 z-20 -translate-y-1/2 min-h-[48px] min-w-[48px] rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors border border-white/25 shadow-lg"
              aria-label="Previous photo"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <img
            src={url}
            alt={`Photo ${currentPhotoIndex + 1} of ${list.length}`}
            className="max-h-[min(78dvh,720px)] w-full object-contain"
          />

          {showArrows && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1 sm:right-2 top-1/2 z-20 -translate-y-1/2 min-h-[48px] min-w-[48px] rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors border border-white/25 shadow-lg"
              aria-label="Next photo"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-white/60 text-center px-4">Use arrow keys to browse · Esc to close</p>
      </div>
    </div>
  );
}
