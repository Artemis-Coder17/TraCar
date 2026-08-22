'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { haptic } from '../lib/haptic';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { id: 'home', label: 'Home', href: '/', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    )},
    { id: 'reminders', label: 'Reminders', href: '/reminders', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    )},
    { id: 'service', label: 'Service', href: '/service', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    )},
    { id: 'fuel', label: 'Fuel', href: '/fuel', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
      </svg>
    )}
  ];

  const activeIndex = navItems.findIndex(item => pathname === item.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-md mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="relative flex" style={{ paddingTop: '6px', paddingBottom: '12px' }}>
          {/* Sliding liquid glass pill */}
          {activeIndex >= 0 && (
            <div
              className="absolute rounded-2xl pointer-events-none"
              style={{
                top: '6px',
                bottom: '12px',
                left: '4px',
                width: 'calc(25% - 8px)',
                transform: `translateX(calc(${activeIndex} * (100% + 8px)))`,
                transition: 'transform 320ms cubic-bezier(0.34,1.18,0.64,1)',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.06))',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderTopColor: 'rgba(255,255,255,0.34)',
                boxShadow: '0 2px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.10)',
              }}
            />
          )}

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 relative z-10 select-none"
                onClick={() => haptic(6)}
                style={{
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.38)',
                  transition: 'color 220ms ease',
                }}
              >
                <div
                  style={{
                    transform: isActive ? 'scale(1.10)' : 'scale(1)',
                    transition: 'transform 320ms cubic-bezier(0.34,1.18,0.64,1)',
                  }}
                >
                  {item.icon}
                </div>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{
                    opacity: isActive ? 1 : 0.55,
                    transition: 'opacity 220ms ease',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
