interface SkeletonCardProps {
  viewMode?: 'cards' | 'compact';
}

export function SkeletonCard({ viewMode = 'cards' }: SkeletonCardProps) {
  return (
    <div className={`skeleton-card${viewMode === 'compact' ? ' is-compact' : ''}`} aria-hidden="true">
      <div className="skeleton-image" />
      <div className="skeleton-content">
        <div className="skeleton-line is-short" />
        <div className="skeleton-line" />
        <div className="skeleton-line is-medium" />
        <div className="skeleton-line is-price" />
      </div>
    </div>
  );
}
