export function NodeLeft({ className }: { className?: string }) {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className={className}>
      <rect x="0" y="1" width="8" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="13" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="6" x2="11.2" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <line x1="14.8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <rect x="16" y="1" width="8" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function NodeRight({ className }: { className?: string }) {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className={className}>
      <rect x="0" y="1" width="8" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="6" x2="9.2" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12.8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1.2" />
      <rect x="16" y="1" width="8" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function NodeUnion({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="0" y="0" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10" y="0" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="0" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="3" y1="6" x2="3" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="13" y1="6" x2="13" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function NodeLink({ className }: { className?: string }) {
  return (
    <svg width="60" height="12" viewBox="0 0 60 12" fill="none" className={className}>
      <rect x="0" y="1" width="8" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="6" x2="52" y2="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
      <rect x="52" y="1" width="8" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
