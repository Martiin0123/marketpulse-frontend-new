import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getUser,
  getSubscription,
  getPositions
} from '@/utils/supabase/queries';
import Dashboard from '@/components/ui/Dashboard/Dashboard';

export default async function DashboardPage() {
  const supabase = createClient();
  const [user, subscription] = await Promise.all([
    getUser(supabase),
    getSubscription(supabase)
  ]);
  console.log(user);

  if (!user) {
    return redirect('/signin');
  }

  if (
    !subscription ||
    !['trialing', 'active'].includes(subscription.status as string)
  ) {
    return redirect('/?message=subscription_required');
  }

  const positions = await getPositions(supabase);

  return (
    <Dashboard
      user={user}
      subscription={subscription}
      positions={positions || []}
    />
  );
}
