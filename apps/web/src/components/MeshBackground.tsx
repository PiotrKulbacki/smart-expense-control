export function MeshBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="grid-floor animate-drift absolute inset-0 opacity-60" />
      <svg
        className="animate-pulseSlow absolute -left-1/4 top-1/4 h-[140%] w-[140%] opacity-20"
        viewBox="0 0 800 800"
      >
        <defs>
          <linearGradient id="mesh-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8a849" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3dd6c3" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d="M0 400 Q200 200 400 400 T800 400"
          fill="none"
          stroke="url(#mesh-a)"
          strokeWidth="1"
        />
        <path
          d="M0 500 Q300 300 600 500 T800 450"
          fill="none"
          stroke="url(#mesh-a)"
          strokeWidth="0.5"
          opacity="0.6"
        />
        <circle cx="620" cy="280" r="120" fill="url(#mesh-a)" opacity="0.08" />
        <circle cx="180" cy="520" r="80" fill="url(#mesh-a)" opacity="0.06" />
      </svg>
    </div>
  );
}
