import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription, getSignals } from '@/utils/supabase/queries';
import SignalsPage from '@/components/ui/Signals/SignalsPage';

export default async function Signals() {
  const supabase = createClient();
  const [user, subscription] = await Promise.all([
    getUser(supabase),
    getSubscription(supabase)
  ]);

  if (!user) {
    return redirect('/signin');
  }

  if (
    !subscription ||
    !['trialing', 'active'].includes(subscription.status as string)
  ) {
    return redirect('/?message=subscription_required');
  }

  const signals = await getSignals(supabase);

  return (
    <SignalsPage
      user={user}
      subscription={subscription}
      signals={signals || []}
    />
  );
}
