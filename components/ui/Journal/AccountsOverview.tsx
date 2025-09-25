import type { TradingAccount, AccountStats } from '@/types/journal';

interface AccountsOverviewProps {
  accounts: (TradingAccount & { stats: AccountStats })[];
  onSelectAccount: (accountId: string) => void;
}

export default function AccountsOverview({
  accounts,
  onSelectAccount
}: AccountsOverviewProps) {
  const totalStats = accounts.reduce(
    (acc, account) => ({
      totalTrades: acc.totalTrades + account.stats.totalTrades,
      winRate:
        (acc.winRate * acc.totalTrades +
          account.stats.winRate * account.stats.totalTrades) /
        (acc.totalTrades + account.stats.totalTrades),
      averageRR:
        (acc.averageRR * acc.totalTrades +
          account.stats.averageRR * account.stats.totalTrades) /
        (acc.totalTrades + account.stats.totalTrades),
      totalRR: acc.totalRR + account.stats.totalRR,
      bestTrade: Math.max(acc.bestTrade, account.stats.bestTrade),
      worstTrade: Math.min(acc.worstTrade, account.stats.worstTrade),
      profitFactor:
        (acc.profitFactor * acc.totalTrades +
          account.stats.profitFactor * account.stats.totalTrades) /
        (acc.totalTrades + account.stats.totalTrades),
      averageWin:
        (acc.averageWin * acc.totalTrades +
          account.stats.averageWin * account.stats.totalTrades) /
        (acc.totalTrades + account.stats.totalTrades),
      averageLoss:
        (acc.averageLoss * acc.totalTrades +
          account.stats.averageLoss * account.stats.totalTrades) /
        (acc.totalTrades + account.stats.totalTrades),
      maxDrawdown: Math.max(acc.maxDrawdown, account.stats.maxDrawdown),
      winStreak: Math.max(acc.winStreak, account.stats.winStreak),
      loseStreak: Math.max(acc.loseStreak, account.stats.loseStreak)
    }),
    {
      totalTrades: 0,
      winRate: 0,
      averageRR: 0,
      totalRR: 0,
      bestTrade: -Infinity,
      worstTrade: Infinity,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      maxDrawdown: -Infinity,
      winStreak: -Infinity,
      loseStreak: -Infinity
    } as AccountStats
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-sm font-medium text-slate-400 p-4">
                Account
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                Trades
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                Win Rate
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                Avg R:R
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                Total R
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                Best
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                Worst
              </th>
              <th className="text-right text-sm font-medium text-slate-400 p-4">
                PF
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer"
                onClick={() => onSelectAccount(account.id)}
              >
                <td className="text-sm text-white p-4">{account.name}</td>
                <td className="text-right text-sm text-white p-4">
                  {account.stats.totalTrades}
                </td>
                <td className="text-right text-sm text-white p-4">
                  {account.stats.winRate.toFixed(1)}%
                </td>
                <td className="text-right text-sm text-white p-4">
                  {account.stats.averageRR.toFixed(1)}
                </td>
                <td className="text-right text-sm text-white p-4">
                  {account.stats.totalRR.toFixed(1)}
                </td>
                <td className="text-right text-sm text-green-400 p-4">
                  +{account.stats.bestTrade.toFixed(1)}R
                </td>
                <td className="text-right text-sm text-red-400 p-4">
                  {account.stats.worstTrade.toFixed(1)}R
                </td>
                <td className="text-right text-sm text-white p-4">
                  {account.stats.profitFactor.toFixed(1)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-700/20 font-medium">
              <td className="text-sm text-white p-4">Total</td>
              <td className="text-right text-sm text-white p-4">
                {totalStats.totalTrades}
              </td>
              <td className="text-right text-sm text-white p-4">
                {totalStats.winRate.toFixed(1)}%
              </td>
              <td className="text-right text-sm text-white p-4">
                {totalStats.averageRR.toFixed(1)}
              </td>
              <td className="text-right text-sm text-white p-4">
                {totalStats.totalRR.toFixed(1)}
              </td>
              <td className="text-right text-sm text-green-400 p-4">
                +{totalStats.bestTrade.toFixed(1)}R
              </td>
              <td className="text-right text-sm text-red-400 p-4">
                {totalStats.worstTrade.toFixed(1)}R
              </td>
              <td className="text-right text-sm text-white p-4">
                {totalStats.profitFactor.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
