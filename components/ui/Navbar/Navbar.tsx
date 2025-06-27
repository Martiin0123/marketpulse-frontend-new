import { createClient } from '@/utils/supabase/server';
import Navlinks from './Navlinks';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="max-w-7xl mx-auto">
        <Navlinks user={user} />
      </div>
    </nav>
  );
}
