import React from 'react';

export const HealthBadge = ({ status, label, size = 'md' }) => {
  let badgeClass = 'bg-emerald-500 text-white font-semibold';
  let dotClass = 'bg-emerald-200';
  let defaultLabel = 'On Track';

  if (status === 'CRITICAL' || status === '🔴 Critical') {
    badgeClass = 'bg-rose-600 text-white font-bold animate-pulse-subtle';
    dotClass = 'bg-rose-200 animate-ping';
    defaultLabel = 'Critical';
  } else if (status === 'ATTENTION_NEEDED' || status === '🟡 Attention Needed') {
    badgeClass = 'bg-amber-500 text-slate-950 font-bold';
    dotClass = 'bg-amber-100';
    defaultLabel = 'Attention Needed';
  }

  // Strip leading emoji prefixes from backend labels (e.g. "🟡 Attention Needed" -> "Attention Needed")
  // to avoid duplicated emoji dots beside our dot indicator
  const cleanLabel = (label || defaultLabel).replace(/^[^\w\s]+\s*/, '').trim() || defaultLabel;

  const sizeClass = size === 'sm' 
    ? 'text-[11px] py-1 px-2.5 h-6' 
    : size === 'lg' 
      ? 'text-sm py-1.5 px-3.5 h-8' 
      : 'text-xs py-1 px-3 h-7';

  return (
    <div className={`badge border-none ${badgeClass} ${sizeClass} gap-1.5 shadow-xs inline-flex items-center justify-center rounded-full leading-none`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}></span>
      <span className="truncate">{cleanLabel}</span>
    </div>
  );
};

export default HealthBadge;
