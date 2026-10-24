import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { dict, type Locale } from '../i18n';

type Kind = 'crank' | 'saddle' | 'stem' | 'drop';

const PHOTO: Record<Kind, string> = {
  crank: '/motion/measures/crank.jpg',
  saddle: '/motion/measures/saddle.jpg',
  stem: '/motion/measures/stem.jpg',
  drop: '/motion/measures/drop.jpg',
};

export default function MeasureHint({ locale, kind }: { locale: Locale; kind: Kind }) {
  const copy = dict[locale].account.measures[kind];
  const label = dict[locale].account.measureHint;
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const root = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    if (!open) return undefined;
    function place() {
      const button = root.current?.querySelector('.hint-button');
      const card = cardRef.current;
      if (!(button instanceof HTMLElement) || !card) return;
      const margin = 12;
      const rect = button.getBoundingClientRect();
      const width = card.offsetWidth;
      const height = Math.min(card.scrollHeight, window.innerHeight - margin * 2);
      let left = rect.right + 10;
      if (left + width > window.innerWidth - margin) left = rect.left - width - 10;
      left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      let top = rect.bottom + 8;
      if (below < height && above > below) top = rect.top - height - 8;
      top = Math.max(margin, Math.min(top, window.innerHeight - margin - height));
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      pinned.current = false;
      setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!pinned.current || !root.current) return;
      if (event.target instanceof Node && root.current.contains(event.target)) return;
      pinned.current = false;
      setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <span
      className="hint"
      ref={root}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!pinned.current) setOpen(false); }}
    >
      <button
        type="button"
        className="hint-button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}
      >
        ?
      </button>
      {open && (
        <span className="hint-card" role="dialog" aria-labelledby={titleId} ref={cardRef}>
          <img src={PHOTO[kind]} alt="" width="640" height="420" />
          <strong id={titleId}>{copy.title}</strong>
          <p>{copy.text}</p>
          <ol>
            {copy.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </span>
      )}
    </span>
  );
}
