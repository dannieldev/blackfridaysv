import React from 'react';

interface SkeletonCardProps {
  viewMode: 'cards' | 'compact';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ viewMode }) => {
  if (viewMode === 'compact') {
    return (
      <div 
        className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 animate-shimmer flex items-center justify-between gap-3"
        aria-hidden="true"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-12 h-12 bg-slate-800/70 rounded-lg shrink-0"></div>
          <div className="space-y-1.5 flex-1 max-w-md">
            <div className="h-3.5 bg-slate-800/80 rounded w-1/4"></div>
            <div className="h-4 bg-slate-800/90 rounded w-4/5"></div>
            <div className="h-3 bg-slate-800/60 rounded w-1/3"></div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="h-6 bg-slate-800/80 rounded w-20"></div>
          <div className="h-8 bg-slate-800/90 rounded-xl w-24 hidden sm:block"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 animate-shimmer"
      aria-hidden="true"
    >
      <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">
        {/* Thumbnail Placeholder */}
        <div className="w-full md:w-44 lg:w-48 h-44 md:h-auto md:min-h-[190px] bg-slate-800/60 rounded-xl shrink-0"></div>

        {/* Central Details Placeholder */}
        <div className="flex-1 space-y-3 py-1">
          <div className="flex items-center gap-2">
            <div className="h-5 bg-slate-800/90 rounded-md w-28"></div>
            <div className="h-4 bg-slate-800/70 rounded w-16"></div>
            <div className="h-4 bg-slate-800/60 rounded w-24 hidden sm:block"></div>
          </div>

          <div className="h-6 bg-slate-800/90 rounded w-5/6"></div>
          <div className="h-4 bg-slate-800/60 rounded w-2/3"></div>

          {/* Verdict Box Placeholder */}
          <div className="h-14 bg-slate-800/40 rounded-xl w-full"></div>

          {/* Bar Placeholder */}
          <div className="h-8 bg-slate-800/50 rounded-xl w-full"></div>
        </div>

        {/* Price & Action Placeholder */}
        <div className="w-full md:w-56 lg:w-60 shrink-0 flex flex-col justify-between items-start md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="space-y-1.5 w-full md:text-right">
            <div className="h-8 bg-slate-800/90 rounded w-32 md:ml-auto"></div>
            <div className="h-4 bg-slate-800/60 rounded w-24 md:ml-auto"></div>
            <div className="h-5 bg-slate-800/70 rounded w-28 md:ml-auto"></div>
          </div>

          <div className="h-11 bg-slate-800/90 rounded-xl w-full"></div>
        </div>
      </div>
    </div>
  );
};
