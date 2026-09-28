import React from 'react';

export const HealthBadge = ({ status, label, size = 'md' }) => {
  let badgeClass = 'badge-success text-white';
  let dotClass = 'bg-emerald-400';
  let displayLabel = label || 'On Track';

  if (status === 'CRITICAL' || status === '🔴 Critical') {
    badgeClass = 'badge-error text-white font-bold animate-pulse-subtle';
    dotClass = 'bg-red-300 animate-ping';
    displayLabel = label || 'Critical';
  } else if (status === 'ATTENTION_NEEDED' || status === '🟡 Attention Needed') {
    badgeClass = 'badge-warning text-slate-900 font-semibold';
    dotClass = 'bg-amber-300';
    displayLabel = label || 'Attention Needed';
  }

  const sizeClass = size === 'sm' ? 'badge-sm text-xs py-2 px-2' : size === 'lg' ? 'badge-lg text-sm py-3 px-4' : 'text-xs py-2.5 px-3';

  return (
    <div className={`badge ${badgeClass} ${sizeClass} gap-1.5 shadow-sm inline-flex items-center`}>
      <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
      <span>{displayLabel}</span>
    </div>
  );
};

export default HealthBadge;
