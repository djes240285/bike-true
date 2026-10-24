export default function Wheel({ label }: { label?: string }) {
  return (
    <span className="wheel" role="status">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="wheel-tire" cx="32" cy="32" r="26" />
        <circle className="wheel-hub" cx="32" cy="32" r="4" />
        <path className="wheel-spokes" d="M32 8v18M32 38v18M8 32h18M38 32h18M14 14l13 13M37 37l13 13M50 14L37 27M27 37L14 50" />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
