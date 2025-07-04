import { createClient } from '@/utils/supabase/server';
import { getSubscription } from '@/utils/supabase/queries';
import Navlinks from './Navlinks';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const subscription = user ? await getSubscription(supabase) : null;

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <Navlinks user={user} subscription={subscription} />
      </div>
    </nav>
  );
}
