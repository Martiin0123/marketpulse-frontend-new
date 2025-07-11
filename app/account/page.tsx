import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getUserDetails,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';
import AccountPage from '@/components/ui/Account/AccountPage';

// Force dynamic rendering since this page uses auth
export const dynamic = 'force-dynamic';

export default async function Account() {
  const supabase = createClient();
  const [user, userDetails, subscription] = await Promise.all([
    getUser(supabase),
    getUserDetails(supabase),
    getSubscription(supabase)
  ]);

  if (!user) {
    return redirect('/signin');
  }

  return (
    <AccountPage
      user={user}
      userDetails={userDetails}
      subscription={subscription}
    />
  );
}
