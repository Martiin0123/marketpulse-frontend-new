import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import PublicAccountView from '@/components/ui/Journal/PublicAccountView';

interface PageProps {
  params: {
    shareId: string;
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { shareId } = params;
  const supabase = createClient();

  try {
    // Find account by matching the hash
    const { data: accounts, error: accountsError } = await supabase
      .from('trading_accounts')
      .select('*');

    if (accountsError || !accounts) {
      notFound();
    }

    // Find the account that matches this hash
    let matchingAccount = null;
    for (const account of accounts) {
      const accountHash = await generateAccountHash(account.id);
      if (accountHash === shareId) {
        matchingAccount = account;
        break;
      }
    }

    if (!matchingAccount) {
      notFound();
    }

    // Get account trades
    const { data: trades, error: tradesError } = await supabase
      .from('trade_entries')
      .select('*')
      .eq('account_id', matchingAccount.id)
      .order('entry_date', { ascending: false });

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
    }

    const accountStats = calculateAccountStats(trades || []);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <PublicAccountView
          account={matchingAccount}
          trades={trades || []}
          stats={accountStats}
          shareId={shareId}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading public share:', error);
    notFound();
  }
}

async function generateAccountHash(accountId: string): Promise<string> {
  // Create a simple hash of the account ID (same logic as in ShareButton)
  const encoder = new TextEncoder();
  const data = encoder.encode(accountId + 'marketpulse-share');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

function calculateAccountStats(trades: any[]) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      bestTrade: 0,
      worstTrade: 0,
      averageWin: 0,
      averageLoss: 0,
      maxDrawdown: 0,
      winStreak: 0,
      loseStreak: 0,
      totalPnLPercentage: 0
    };
  }

  const profitableTrades = trades.filter((trade) => trade.pnl_amount > 0);
  const losingTrades = trades.filter((trade) => trade.pnl_amount < 0);

  const totalPnL = trades.reduce(
    (sum, trade) => sum + (trade.pnl_amount || 0),
    0
  );
  const winRate =
    trades.length > 0 ? (profitableTrades.length / trades.length) * 100 : 0;

  const bestTrade = Math.max(...trades.map((trade) => trade.pnl_amount || 0));
  const worstTrade = Math.min(...trades.map((trade) => trade.pnl_amount || 0));

  const averageWin =
    profitableTrades.length > 0
      ? profitableTrades.reduce((sum, trade) => sum + trade.pnl_amount, 0) /
        profitableTrades.length
      : 0;

  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl_amount, 0) /
        losingTrades.length
      : 0;

  // Calculate streaks
  let currentWinStreak = 0;
  let currentLoseStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;

  for (const trade of trades) {
    if (trade.pnl_amount > 0) {
      currentWinStreak++;
      currentLoseStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (trade.pnl_amount < 0) {
      currentLoseStreak++;
      currentWinStreak = 0;
      maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
    }
  }

  return {
    totalTrades: trades.length,
    winRate,
    totalPnL,
    bestTrade,
    worstTrade,
    averageWin,
    averageLoss,
    maxDrawdown: 0, // TODO: Calculate actual drawdown
    winStreak: maxWinStreak,
    loseStreak: maxLoseStreak,
    totalPnLPercentage: 0 // TODO: Calculate percentage based on initial balance
  };
}
