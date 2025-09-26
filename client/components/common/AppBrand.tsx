import React from "react";

export default function AppBrand({ className, compact = false, onToggle }: { className?: string; compact?: boolean; onToggle?: (() => void) | undefined }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-4 mb-6">
        <div
          role={onToggle ? "button" : undefined}
          tabIndex={onToggle ? 0 : undefined}
          onKeyDown={onToggle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } } : undefined}
          onClick={onToggle}
          className={`rounded-lg p-3 bg-gradient-to-br from-[#f7e8da] to-[#ff7a18] text-white shadow-md flex items-center justify-center ${onToggle ? 'cursor-pointer focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-[#ffecd6]' : ''}`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12h6M9 16h6M7 8h10M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {!compact && (
          <h1 className={`font-extrabold ${compact ? "text-lg" : "text-2xl"} text-[#b85b00] leading-none`}>BComandas</h1>
        )}
      </div>
    </div>
  );
}
