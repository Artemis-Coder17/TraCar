'use client';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ animation: 'pageIn 0.22s ease-out both' }}>
      {children}
    </div>
  );
}
