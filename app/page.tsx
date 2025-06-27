import Hero from '@/components/ui/Hero/Hero';
import Features from '@/components/ui/Features/Features';
import Testimonials from '@/components/ui/Testimonials/Testimonials';
import Stats from '@/components/ui/Stats/Stats';
import CTA from '@/components/ui/CTA/CTA';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';

export default async function HomePage() {
  const supabase = createClient();
  const user = await getUser(supabase);

  return (
    <>
      <Hero user={user} />
      <Stats />
      <Features />
      <Testimonials />
      <CTA user={user} />
    </>
  );
}
