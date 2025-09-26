'use client';

import { ViewColumnsIcon, UserIcon } from '@heroicons/react/24/outline';

interface ViewSelectorProps {
  view: 'individual' | 'combined';
  onViewChange: (view: 'individual' | 'combined') => void;
}

export default function ViewSelector({
  view,
  onViewChange
}: ViewSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onViewChange('combined')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          view === 'combined'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        <ViewColumnsIcon className="h-4 w-4" />
        <span>Combined</span>
      </button>
      <button
        onClick={() => onViewChange('individual')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          view === 'individual'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        <UserIcon className="h-4 w-4" />
        <span>Individual</span>
      </button>
    </div>
  );
}
