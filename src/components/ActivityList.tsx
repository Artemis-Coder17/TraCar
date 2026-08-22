'use client';

import { FC } from 'react';
import { Log } from '../hooks/useLogs';

const FuelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
  </svg>
);

const ServiceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

export const ActivityList: FC<{ activities: Log[] }> = ({ activities }) => {
  const fmtDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-10 text-zinc-500 text-sm">
        No logs yet. Tap + to add one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map(activity => {
        const isFuel = activity.type === 'fuel';
        const accentColor = isFuel ? 'text-cyan-400' : 'text-emerald-400';
        const iconBg = isFuel ? 'bg-cyan-500/15' : 'bg-emerald-500/15';
        const iconColor = isFuel ? 'text-cyan-400' : 'text-emerald-400';
        const typeLabel = isFuel ? 'Fuel' : 'Service';

        return (
          <div key={activity.id} className="activity-card p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
                <span className={iconColor}>
                  {isFuel ? <FuelIcon /> : <ServiceIcon />}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Type label + cost row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${accentColor} opacity-80`}>
                      {typeLabel}
                    </span>
                    <p className="text-sm font-semibold text-white leading-tight mt-0.5 truncate">
                      {activity.label}
                    </p>
                  </div>
                  {activity.cost != null && (
                    <span className="flex-shrink-0 text-sm font-bold text-emerald-400">
                      €{parseFloat(activity.cost.toString()).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Date */}
                {activity.date && (
                  <p className="text-xs text-zinc-500 mb-2">{fmtDate(activity.date)}</p>
                )}

                {/* Pills row */}
                <div className="flex flex-wrap gap-1.5">
                  {activity.odo != null && (
                    <span className="glass-pill text-zinc-300">
                      {Number(activity.odo).toLocaleString()} km
                    </span>
                  )}
                  {isFuel && activity.litres != null && (
                    <span className="glass-pill text-cyan-400">
                      {activity.litres}L
                    </span>
                  )}
                  {isFuel && activity.pricePerL != null && (
                    <span className="glass-pill text-zinc-300">
                      €{Number(activity.pricePerL).toFixed(3)}/L
                    </span>
                  )}
                  {isFuel && activity.consumptionRate != null && (
                    <span className="glass-pill text-amber-400">
                      {activity.consumptionRate}L/100km
                    </span>
                  )}
                  {!isFuel && activity.garage && (
                    <span className="glass-pill text-zinc-300">
                      {activity.garage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
