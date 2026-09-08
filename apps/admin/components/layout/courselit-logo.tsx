/** The CourseLit petal mark from `@codelitdev/design-system/assets/logo-courselit.svg` and `app/icon.svg`. */
export function CourseLitLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <g
        fill="oklch(0.62 0.16 30 / 0.18)"
        stroke="oklch(0.62 0.16 30)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      >
        <path d="M32,10 L38,28 L32,34 L26,28 Z" />
        <path d="M32,10 L38,28 L32,34 L26,28 Z" transform="rotate(90 32 32)" />
        <path d="M32,10 L38,28 L32,34 L26,28 Z" transform="rotate(180 32 32)" />
        <path d="M32,10 L38,28 L32,34 L26,28 Z" transform="rotate(270 32 32)" />
      </g>
    </svg>
  );
}
