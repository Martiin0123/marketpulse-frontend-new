import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  validateReferralCode,
  updateReferralCodeClicks
} from '@/utils/supabase/queries';

interface Props {
  params: {
    code: string;
  };
}

export default async function ReferralPage({ params }: Props) {
  const { code } = params;
  const supabase = createClient();

  try {
    // Validate the referral code
    const validation = await validateReferralCode(supabase, code);

    if (!validation.valid) {
      // Invalid referral code, redirect to signup without referral
      redirect('/signin/signup');
    }

    // Track the click
    await updateReferralCodeClicks(supabase, code);

    // Redirect to signup with the referral code
    redirect(`/signin/signup?ref=${code}`);
  } catch (error) {
    console.error('Error handling referral link:', error);
    // On error, redirect to signup without referral
    redirect('/signin/signup');
  }
}
