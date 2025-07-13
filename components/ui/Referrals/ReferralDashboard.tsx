'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/utils/auth-context';
import {
  getUserReferralCode,
  getReferrals,
  getReferralRewards,
  getReferralStats,
  ensureUserReferralCodeClient
} from '@/utils/supabase/queries';
import {
  Share2,
  Copy,
  Users,
  DollarSign,
  Gift,
  TrendingUp,
  Mail,
  MessageSquare,
  Twitter,
  Facebook,
  ExternalLink,
  CheckCircle,
  Clock,
  Trophy,
  Target,
  AlertCircle,
  X
} from 'lucide-react';
import Button from '@/components/ui/Button';

// Define referral types manually since they're not in the generated types yet
type ReferralCode = {
  id: number;
  user_id: string;
  code: string;
  clicks: number;
  conversions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Referral = {
  id: number;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  status: 'pending' | 'active' | 'rewarded' | 'expired' | 'requested' | 'paid';
  reward_amount: number;
  reward_currency: string;
  converted_at?: string;
  rewarded_at?: string;
  eligible_at?: string;
  created_at: string;
  updated_at: string;
  referee?: {
    id: string;
    full_name: string;
    email: string;
  };
};

type ReferralReward = {
  id: number;
  user_id: string;
  referral_id: number;
  reward_type: 'commission' | 'credit' | 'bonus';
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at?: string;
  stripe_transfer_id?: string;
  created_at: string;
  referral?: {
    referral_code: string;
    referee?: {
      full_name: string;
    };
  };
};

interface Props {
  user: User;
  initialReferralCode: ReferralCode | null;
  initialReferrals: Referral[];
  initialRewards: ReferralReward[];
  initialStats: {
    totalEarnings: number;
    pendingAmount: number;
    requestedAmount: number;
    totalClicks: number;
    pendingReferrals: number;
    requestedReferrals: number;
    activeReferrals: number;
    totalReferrals: number;
  };
}

export default function ReferralDashboard({
  user,
  initialReferralCode,
  initialReferrals,
  initialRewards,
  initialStats
}: Props) {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(
    initialReferralCode
  );
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals);
  const [rewards, setRewards] = useState<ReferralReward[]>(initialRewards);
  const [stats, setStats] = useState({
    totalEarnings: initialStats?.totalEarnings || 0,
    pendingAmount: initialStats?.pendingAmount || 0,
    requestedAmount: initialStats?.requestedAmount || 0,
    totalClicks: initialStats?.totalClicks || 0,
    pendingReferrals: initialStats?.pendingReferrals || 0,
    requestedReferrals: initialStats?.requestedReferrals || 0,
    activeReferrals: initialStats?.activeReferrals || 0,
    totalReferrals: initialStats?.totalReferrals || 0
  });
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { user: authUser, session, signOut } = useAuth();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralUrl = referralCode
    ? `${baseUrl}/signin/signup?ref=${referralCode.code}`
    : '';

  // Calculate stats dynamically from referrals data
  useEffect(() => {
    const calculatedStats = {
      totalEarnings: referrals
        .filter((r) => r.status === 'paid' || r.status === 'active')
        .reduce((sum, r) => sum + r.reward_amount, 0),
      pendingAmount: referrals
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + r.reward_amount, 0),
      requestedAmount: referrals
        .filter((r) => r.status === 'requested')
        .reduce((sum, r) => sum + r.reward_amount, 0),
      totalClicks: referralCode?.clicks || 0,
      pendingReferrals: referrals.filter((r) => r.status === 'pending').length,
      requestedReferrals: referrals.filter((r) => r.status === 'requested')
        .length,
      activeReferrals: referrals.filter(
        (r) => r.status === 'active' || r.status === 'paid'
      ).length,
      totalReferrals: referrals.length
    };
    setStats(calculatedStats);
  }, [referrals, referralCode]);
  const createReferralCode = async () => {
    setLoading(true);
    try {
      console.log('🔍 Checking session state...');

      if (!authUser) {
        console.error('❌ No authenticated user found');
        setToastMessage('Please sign in to create a referral code');
        return;
      }

      console.log('🔍 Auth user found:', authUser.id);

      // Skip session validation since user is clearly authenticated
      // The fact that we're on this page means auth context has the user
      console.log('🔍 Calling simple API endpoint...');

      // Use the simple API endpoint that handles auth via cookies
      const response = await fetch('/api/referral/create-simple', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.referralCode) {
          setReferralCode(data.referralCode);
          setToastMessage('Referral code created successfully!');
          console.log('✅ Referral code created:', data.referralCode);
        } else {
          setToastMessage('Failed to create referral code');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ API error:', errorData);
        setToastMessage(
          'Failed to create referral code: ' +
            (errorData.error || 'Unknown error')
        );
      }
    } catch (error) {
      console.error('Error creating referral code:', error);
      setToastMessage('Session error. Please sign in again.');

      // If any error occurs, assume session is corrupted
      try {
        await signOut();
      } catch (signOutError) {
        console.error('Sign out error:', signOutError);
      }

      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => {
        window.location.href =
          '/signin?next=' + encodeURIComponent(window.location.pathname);
      }, 1500);
    } finally {
      setLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage('Copied to clipboard!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage('Failed to copy');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const shareViaEmail = () => {
    const subject = 'Join PrimeScope - Get AI-Powered Trading Signals';
    const body = `Hey! I've been using PrimeScope for AI-powered trading signals and thought you'd love it too. 

Use my referral link to get started: ${referralUrl}

PrimeScope provides real-time trading signals backed by advanced AI and technical analysis. Perfect for both beginners and experienced traders!`;

    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  const shareViaTwitter = () => {
    const text = `🚀 Get AI-powered trading signals with PrimeScope! Use my referral link for exclusive access: ${referralUrl} #TradingSignals #AI #Investing`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    );
  };

  const shareViaFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateTimeRemaining = (eligibleAt: string) => {
    const now = new Date();
    const eligibleDate = new Date(eligibleAt);
    const diffTime = eligibleDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { days: 0, hours: 0, minutes: 0, isEligible: true };
    }

    const diffHours = Math.floor(
      (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    return {
      days: diffDays,
      hours: diffHours,
      minutes: diffMinutes,
      isEligible: false
    };
  };

  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: any }>(
    {}
  );

  // Update timers every minute
  useEffect(() => {
    const updateTimers = () => {
      const newTimeRemaining: { [key: string]: any } = {};

      referrals.forEach((referral) => {
        if (referral.status === 'active' && referral.eligible_at) {
          newTimeRemaining[referral.id] = calculateTimeRemaining(
            referral.eligible_at
          );
        }
      });

      setTimeRemaining(newTimeRemaining);
    };

    // Update immediately
    updateTimers();

    // Update every minute
    const interval = setInterval(updateTimers, 60000);

    return () => clearInterval(interval);
  }, [referrals]);

  const requestIndividualReferral = async (referral: Referral) => {
    console.log('🔍 Requesting individual referral:', {
      referralId: referral.id,
      hasSession: !!session,
      authUser: authUser?.id
    });

    try {
      if (!authUser) {
        console.error('❌ No authenticated user found');
        setToastMessage('Please sign in to request referral assistance');
        return;
      }

      console.log('🔍 Auth user found:', authUser.id);

      // Use the same approach as createReferralCode - rely on server-side auth via cookies
      const response = await fetch('/api/referral/request-simple', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          referralId: referral.id,
          referral,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Unknown'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request referral');
      }

      const result = await response.json();
      setToastMessage(result.message || 'Referral request sent successfully!');

      // Update the referral status locally
      setReferrals((prevReferrals) =>
        prevReferrals.map((r) =>
          r.id === referral.id ? { ...r, status: 'requested' as const } : r
        )
      );
    } catch (error) {
      console.error('Error requesting individual referral:', error);
      setToastMessage(
        error instanceof Error ? error.message : 'Failed to request referral'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Referral Program
          </h1>
          <p className="text-gray-400 text-lg">
            Share PrimeScope with friends and earn rewards for every successful
            referral
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-white">
                  €{(stats.totalEarnings || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Requested Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  €{(stats.requestedAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  €{(stats.pendingAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Total Referrals
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalReferrals || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-slate-500/20 rounded-lg">
                <Target className="w-6 h-6 text-slate-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Clicks</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalClicks || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Link Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Share2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Your Referral Link
                </h2>
                <p className="text-gray-400">
                  Share this link to start earning
                </p>
              </div>
            </div>

            {referralCode ? (
              <>
                {/* Referral Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Referral Code
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-700 rounded-lg px-4 py-3 flex-1 font-mono text-lg text-white">
                      {referralCode.code}
                    </div>
                    <Button
                      onClick={() => copyToClipboard(referralCode.code)}
                      variant="outline"
                      size="sm"
                      className="p-3"
                    >
                      <Copy className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>

                {/* Referral URL */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Referral URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-700 rounded-lg px-4 py-3 flex-1 text-white break-all">
                      {referralUrl}
                    </div>
                    <Button
                      onClick={() => copyToClipboard(referralUrl)}
                      variant="outline"
                      size="sm"
                      className="p-3"
                    >
                      <Copy className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">
                    Share via
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={shareViaEmail}
                      variant="ghost"
                      className="flex items-center justify-center space-x-3 p-3"
                    >
                      <Mail className="w-5 h-5 text-gray-300" />
                      <span className="text-white">Email</span>
                    </Button>
                    <Button
                      onClick={shareViaTwitter}
                      variant="primary"
                      className="flex items-center justify-center space-x-3 p-3"
                    >
                      <Twitter className="w-5 h-5 text-white" />
                      <span className="text-white">Twitter</span>
                    </Button>
                    <Button
                      onClick={shareViaFacebook}
                      variant="primary"
                      className="flex items-center justify-center space-x-3 p-3 bg-blue-800 hover:bg-blue-900"
                    >
                      <Facebook className="w-5 h-5 text-white" />
                      <span className="text-white">Facebook</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* No Referral Code Yet */
              <div className="text-center py-8">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Share2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    No Referral Code Yet
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Create your unique referral code to start earning rewards
                  </p>
                </div>
                <Button
                  onClick={createReferralCode}
                  disabled={loading}
                  variant="primary"
                  size="lg"
                >
                  {loading ? 'Creating...' : 'Create Referral Code'}
                </Button>
              </div>
            )}
          </div>

          {/* Referral Program Info */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Gift className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  How It Works
                </h2>
                <p className="text-gray-400">Earn money for each referral</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-white font-medium">Share Your Link</h3>
                  <p className="text-gray-400 text-sm">
                    Share your unique referral link with friends and colleagues
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-white font-medium">Friend Signs Up</h3>
                  <p className="text-gray-400 text-sm">
                    Your friend creates an account using your referral link
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-white font-medium">They Subscribe</h3>
                  <p className="text-gray-400 text-sm">
                    When your friend subscribes to a paid plan, you earn a
                    reward
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-white font-medium">Wait 60 Days</h3>
                  <p className="text-gray-400 text-sm">
                    After 60 days, you can request your €19 commission
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  5
                </div>
                <div>
                  <h3 className="text-white font-medium">Get Rewarded</h3>
                  <p className="text-gray-400 text-sm">
                    Request and receive €19 commission for each successful
                    referral
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Your Referrals
                </h2>
                <p className="text-gray-400">Track your referral progress</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-gray-400 font-medium py-3 px-4">
                      User
                    </th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">
                      Status
                    </th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">
                      Date
                    </th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">
                      Amount
                    </th>
                    <th className="text-left text-gray-400 font-medium py-3 px-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr
                      key={referral.id}
                      className="border-b border-slate-700/50"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-white font-medium">
                            {referral.referee?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {referral.referee?.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                            referral.status === 'active'
                              ? 'bg-blue-500/20 text-blue-400'
                              : referral.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : referral.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : referral.status === 'requested'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {referral.status === 'active' && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {referral.status === 'paid' && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {referral.status === 'pending' && (
                            <Clock className="w-3 h-3" />
                          )}
                          {referral.status === 'requested' && (
                            <Clock className="w-3 h-3" />
                          )}
                          <span className="capitalize">{referral.status}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {formatDate(referral.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-full text-sm font-bold text-green-400 mr-2">
                          €
                        </span>
                        <span className="font-medium text-green-400">
                          {(referral.reward_amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {referral.status === 'pending' && (
                          <div className="text-center">
                            <div className="text-orange-400 text-sm font-medium mb-1">
                              Waiting for subscription
                            </div>
                            <div className="text-xs text-gray-400">
                              User needs to subscribe first
                            </div>
                          </div>
                        )}
                        {referral.status === 'active' && (
                          <div className="text-center">
                            {timeRemaining[referral.id]?.isEligible ? (
                              <Button
                                onClick={() =>
                                  requestIndividualReferral(referral)
                                }
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Request Payment
                              </Button>
                            ) : (
                              <div>
                                <div className="text-blue-400 text-sm font-medium mb-1">
                                  {timeRemaining[referral.id]?.days || 0}d{' '}
                                  {timeRemaining[referral.id]?.hours || 0}h{' '}
                                  {timeRemaining[referral.id]?.minutes || 0}m
                                </div>
                                <div className="text-xs text-gray-400">
                                  until eligible
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {referral.status === 'requested' && (
                          <span className="text-yellow-400 text-sm font-medium">
                            Requested
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
