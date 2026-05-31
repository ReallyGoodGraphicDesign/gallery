import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" role="status" aria-live="polite">
      <div className="skeleton-hero">
        <div className="skeleton-title shimmer" />
        <div className="skeleton-text shimmer" />
        <div className="skeleton-cta shimmer" />
      </div>
      <div className="skeleton-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="skeleton-image shimmer" key={i} />
        ))}
      </div>
    </div>
  );
}
