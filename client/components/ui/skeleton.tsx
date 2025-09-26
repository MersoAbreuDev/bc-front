import React from "react";

export default function Skeleton({ className = "", count = 1 }: { className?: string; count?: number }) {
  const items = Array.from({ length: count });
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-200 rounded-md" style={{ height: 24 }} />
      ))}
    </div>
  );
}
