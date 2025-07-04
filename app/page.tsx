import Hero from '@/components/ui/Hero/Hero';
import Features from '@/components/ui/Features/Features';
import Testimonials from '@/components/ui/Testimonials/Testimonials';
import Stats from '@/components/ui/Stats/Stats';
import CTA from '@/components/ui/CTA/CTA';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';

interface MonthlyPnL {
  totalPnL: number;
  profitablePositions: number;
  totalPositions: number;
}

async function getMonthlyPnL(supabase: any): Promise<MonthlyPnL | undefined> {
  // Get the start and end of the current month
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).toISOString();

  // Fetch closed positions for the current month
  const { data: positions, error } = await supabase
    .from('positions')
    .select('pnl, status')
    .eq('status', 'closed')
    .gte('exit_time', startOfMonth)
    .lte('exit_time', endOfMonth);

  if (error) {
    console.error('Error fetching monthly PnL:', error);
    return undefined;
  }

  // Calculate total PnL and count profitable positions
  const result = positions.reduce(
    (acc: MonthlyPnL, pos: { pnl: number }) => ({
      ...acc,
      totalPnL: acc.totalPnL + (pos.pnl || 0),
      profitablePositions: acc.profitablePositions + (pos.pnl > 0 ? 1 : 0)
    }),
    { totalPnL: 0, profitablePositions: 0, totalPositions: 0 }
  );

  return {
    ...result,
    totalPositions: positions.length
  };
}

export default async function HomePage() {
  const supabase = createClient();
  const user = await getUser(supabase);
  const monthlyPnL = await getMonthlyPnL(supabase);

  return (
    <>
      <Hero user={user} monthlyPnL={monthlyPnL} />
      <Stats />
      <Features />
      <Testimonials />
      <CTA user={user} />
    </>
  );
}
