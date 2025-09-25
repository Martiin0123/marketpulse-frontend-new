interface ViewSelectorProps {
  view: 'individual' | 'combined';
  onViewChange: (view: 'individual' | 'combined') => void;
}

export default function ViewSelector({
  view,
  onViewChange
}: ViewSelectorProps) {
  return (
    <div className="flex rounded-lg bg-slate-800 p-0.5">
      <button
        onClick={() => onViewChange('individual')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'individual'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        Individual
      </button>
      <button
        onClick={() => onViewChange('combined')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'combined'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        Combined
      </button>
    </div>
  );
}
