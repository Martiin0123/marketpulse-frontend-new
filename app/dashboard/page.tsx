import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getSignals } from '@/utils/supabase/queries';
import Dashboard from '@/components/ui/Dashboard/Dashboard';
import { getUser } from '@/utils/supabase/queries';

export default async function DashboardPage() {
  const supabase = createClient();
  const user = await getUser(supabase);

  if (!user) {
    return redirect('/signin');
  }

  // Get subscription from auth context will be handled client-side
  const signals = await getSignals(supabase);

  return (
    <Dashboard
      user={user}
      subscription={null as any} // Will be provided by auth context
      signals={signals || []}
      stats={{
        totalSignals: 0,
        activeSignals: 0,
        closedSignals: 0,
        totalPnl: 0,
        winRate: 0,
        averagePnl: 0
      }}
    />
  );
}
