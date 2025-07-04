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
  monthlyData: { timestamp: number; value: number }[];
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
    .select('*')
    .eq('status', 'closed')
    .gte('exit_timestamp', Math.floor(new Date(startOfMonth).getTime() / 1000))
    .lte('exit_timestamp', Math.floor(new Date(endOfMonth).getTime() / 1000))
    .order('exit_timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching monthly PnL:', error);
    return undefined;
  }

  console.log('Monthly PnL Query:', {
    startOfMonth,
    endOfMonth,
    startTimestamp: Math.floor(new Date(startOfMonth).getTime() / 1000),
    endTimestamp: Math.floor(new Date(endOfMonth).getTime() / 1000),
    positionsCount: positions?.length || 0
  });

  // Calculate total PnL and count profitable positions
  let runningBalance = 0;
  const monthlyData = [];
  const accountSize = 10000; // Default account size

  // Add initial point at start of month
  monthlyData.push({
    timestamp: Math.floor(new Date(startOfMonth).getTime()),
    value: 0
  });

  // Process each position
  positions.forEach((pos: any) => {
    const pnlPercent = pos.pnl || 0;
    const pnlDollar = (pnlPercent / 100) * accountSize;
    runningBalance += pnlDollar;

    monthlyData.push({
      timestamp: pos.exit_timestamp * 1000, // Convert to milliseconds
      value: runningBalance
    });
  });

  // Calculate stats
  const result = positions.reduce(
    (acc: MonthlyPnL, pos: { pnl: number }) => ({
      ...acc,
      totalPnL: acc.totalPnL + (pos.pnl || 0),
      profitablePositions: acc.profitablePositions + (pos.pnl > 0 ? 1 : 0)
    }),
    { totalPnL: 0, profitablePositions: 0, totalPositions: 0, monthlyData: [] }
  );

  return {
    ...result,
    totalPositions: positions.length,
    monthlyData
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
