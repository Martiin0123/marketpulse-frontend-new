import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getUser,
  getSubscription,
  getUserReferralCode,
  getReferrals,
  getReferralRewards,
  getReferralStats
} from '@/utils/supabase/queries';
import ReferralDashboard from '@/components/ui/Referrals/ReferralDashboard';

export default async function ReferralsPage() {
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

  // Fetch referral data
  const [referralCode, referrals, rewards, stats] = await Promise.all([
    getUserReferralCode(supabase),
    getReferrals(supabase),
    getReferralRewards(supabase),
    getReferralStats(supabase)
  ]);

  return (
    <ReferralDashboard
      user={user}
      initialReferralCode={referralCode}
      initialReferrals={referrals || []}
      initialRewards={rewards || []}
      initialStats={stats}
    />
  );
}
