'use client';

interface Props {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
}

export default function StatsOverview({
  totalSignals,
  buySignals,
  sellSignals
}: Props) {
  const buyPercentage =
    totalSignals > 0 ? (buySignals / totalSignals) * 100 : 0;
  const sellPercentage =
    totalSignals > 0 ? (sellSignals / totalSignals) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Total Signals */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-slate-400">Total Signals</p>
            <p className="text-2xl font-bold text-white">{totalSignals}</p>
          </div>
        </div>
      </div>

      {/* Buy Signals */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <svg
              className="w-6 h-6 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 17l9.2-9.2M17 17V7H7"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-slate-400">Buy Signals</p>
            <p className="text-2xl font-bold text-white">{buySignals}</p>
            <p className="text-xs text-emerald-400">
              {buyPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Sell Signals */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 7l-9.2 9.2M7 7v10h10"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-slate-400">Sell Signals</p>
            <p className="text-2xl font-bold text-white">{sellSignals}</p>
            <p className="text-xs text-red-400">{sellPercentage.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Success Rate (Placeholder) */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <svg
              className="w-6 h-6 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-slate-400">Success Rate</p>
            <p className="text-2xl font-bold text-white">--</p>
            <p className="text-xs text-slate-400">Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
