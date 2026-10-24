import { useEffect, useId, useRef, useState } from 'react';

type Option = { value: string; label: string };

export default function Pick({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event: PointerEvent) {
      if (!root.current || !(event.target instanceof Node) || root.current.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    if (!open && root.current) {
      const rect = root.current.getBoundingClientRect();
      setUp(window.innerHeight - rect.bottom < 220 && rect.top > 220);
    }
    setOpen((next) => !next);
  }

  return (
    <div className="pick" ref={root}>
      <span id={listId} className="pick-label">{label}</span>
      <button
        type="button"
        className="pick-button"
        aria-labelledby={listId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        <span>{current?.label ?? ''}</span>
        <Caret />
      </button>
      {open ? (
        <ul className={`pick-menu${up ? ' is-up' : ''}`} role="listbox" aria-labelledby={listId}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Caret() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}
