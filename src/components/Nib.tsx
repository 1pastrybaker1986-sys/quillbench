export default function Nib({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="nibRose" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0D0C4" />
          <stop offset="0.4" stopColor="#F0A8A0" />
          <stop offset="1" stopColor="#D45F6C" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="url(#nibRose)" />
      <path
        d="M9 24.5c6-1 10-6.5 11.2-12.2.2-1.1 1.3-1.8 2.3-1.5l.8.2c.7.2 1.1 1 .8 1.7-.3 1.1-.4 2.3-1.5 2.6C16.2 16.7 12.4 21 9 24.5z"
        fill="#161214"
      />
      <path
        d="M20.8 11.2l1.9-5.2"
        stroke="#fffdfb"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
