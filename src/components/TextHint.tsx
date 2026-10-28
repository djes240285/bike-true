import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export default function TextHint({
  label,
  title,
  text,
  steps,
}: {
  label: string;
  title: string;
  text: string;
  steps: string[];
}) {
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
      let top = rect.bottom + 8;
      if (window.innerHeight - rect.bottom - margin < height && rect.top - margin > window.innerHeight - rect.bottom) {
        top = rect.top - height - 8;
      }
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
          <strong id={titleId}>{title}</strong>
          <p>{text}</p>
          <ol>
            {steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </span>
      )}
    </span>
  );
}
