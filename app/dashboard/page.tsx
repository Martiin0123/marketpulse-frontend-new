import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getSignals } from '@/utils/supabase/queries';
import Dashboard from '@/components/ui/Dashboard/Dashboard';
import { getUser } from '@/utils/supabase/queries';
import { calculateTradingStats } from '@/utils/stats';

// Force dynamic rendering since this page uses auth
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const supabase = createClient();
    const user = await getUser(supabase);

    if (!user) {
      return redirect('/signin');
    }

    // Get signals with error handling
    let signals = [];
    try {
      signals = await getSignals(supabase) || [];
    } catch (signalsError) {
      console.log('Signals fetch failed, continuing with empty array:', signalsError);
      signals = [];
    }

    // Use centralized stats calculation
    let tradingStats = null;
    try {
      tradingStats = await calculateTradingStats();
    } catch (statsError) {
      console.error('Failed to calculate trading stats:', statsError);
      // Fallback to basic calculations if centralized stats fail
      const completedSignals = signals.filter(s => s.status === 'closed' && s.pnl_percentage !== null);
      const totalPnl = completedSignals.reduce((sum, s) => sum + (s.pnl_percentage || 0), 0);
      tradingStats = {
        totalSignals: signals.length,
        activeSignals: signals.filter(s => s.status === 'active').length,
        closedSignals: signals.filter(s => s.status === 'closed').length,
        totalPnl,
        winRate: completedSignals.length > 0 ? 
          (completedSignals.filter(s => (s.pnl_percentage || 0) > 0).length / completedSignals.length) * 100 : 0,
        averagePnl: completedSignals.length > 0 ? totalPnl / completedSignals.length : 0
      };
    }

    return (
      <Dashboard
        user={user}
        subscription={null as any} // Will be provided by auth context
        signals={signals}
        stats={{
          totalSignals: tradingStats.totalSignals,
          activeSignals: tradingStats.activeSignals,
          closedSignals: tradingStats.closedSignals,
          totalPnl: tradingStats.totalPnl,
          winRate: tradingStats.winRate,
          averagePnl: tradingStats.averageTradeReturn
        }}
      />
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Dashboard Unavailable</h1>
          <p className="text-slate-400 mb-4">There was an error loading the dashboard.</p>
          <a href="/" className="text-blue-400 hover:text-blue-300">Return Home</a>
        </div>
      </div>
    );
  }
}
