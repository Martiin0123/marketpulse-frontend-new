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

// Force dynamic rendering since this page uses auth
export const dynamic = 'force-dynamic';

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
    return redirect('/pricing?message=dashboard_access_required');
  }

  // Check if user has premium or VIP subscription based on product name
  const productName =
    (subscription as any)?.prices?.products?.name?.toLowerCase() || '';
  const hasPremiumAccess =
    productName.includes('premium') || productName.includes('vip');

  if (!hasPremiumAccess) {
    return redirect('/pricing?message=dashboard_access_required');
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
