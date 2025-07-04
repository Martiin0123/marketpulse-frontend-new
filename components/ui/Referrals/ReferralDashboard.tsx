'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
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
  Target
} from 'lucide-react';

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
  status: 'pending' | 'active' | 'rewarded' | 'expired';
  reward_amount: number;
  reward_currency: string;
  converted_at?: string;
  rewarded_at?: string;
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
    totalClicks: number;
    pendingReferrals: number;
    activeReferrals: number;
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
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const supabase = createClient();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralUrl = referralCode
    ? `${baseUrl}/signin/signup?ref=${referralCode.code}`
    : '';

  const createReferralCode = async () => {
    setLoading(true);
    try {
      const newCode = await ensureUserReferralCodeClient(supabase);
      if (newCode) {
        setReferralCode(newCode);
        setToastMessage('Referral code created successfully!');
      } else {
        setToastMessage('Failed to create referral code');
      }
    } catch (error) {
      console.error('Error creating referral code:', error);
      setToastMessage('Failed to create referral code');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Referral Program
          </h1>
          <p className="text-gray-400 text-lg">
            Share PrimeScope with friends and earn rewards for every successful
            referral
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-white">
                  €{stats.totalEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  €{stats.pendingAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Active Referrals
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.activeReferrals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {stats.pendingReferrals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Clicks</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalClicks}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Link Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Share2 className="w-6 h-6 text-purple-400" />
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
                    <button
                      onClick={() => copyToClipboard(referralCode.code)}
                      className="p-3 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-white" />
                    </button>
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
                    <button
                      onClick={() => copyToClipboard(referralUrl)}
                      className="p-3 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">
                    Share via
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={shareViaEmail}
                      className="flex items-center justify-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Mail className="w-5 h-5 text-gray-300" />
                      <span className="text-white">Email</span>
                    </button>
                    <button
                      onClick={shareViaTwitter}
                      className="flex items-center justify-center space-x-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Twitter className="w-5 h-5 text-white" />
                      <span className="text-white">Twitter</span>
                    </button>
                    <button
                      onClick={shareViaFacebook}
                      className="flex items-center justify-center space-x-3 p-3 bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors"
                    >
                      <Facebook className="w-5 h-5 text-white" />
                      <span className="text-white">Facebook</span>
                    </button>
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
                <button
                  onClick={createReferralCode}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
                >
                  {loading ? 'Creating...' : 'Create Referral Code'}
                </button>
              </div>
            )}
          </div>

          {/* Referral Program Info */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
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
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-white font-medium">Get Rewarded</h3>
                  <p className="text-gray-400 text-sm">
                    Receive $25 commission for each successful referral
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
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
                  <tr className="border-b border-gray-700">
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
                      Reward
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr
                      key={referral.id}
                      className="border-b border-gray-700/50"
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
                              ? 'bg-green-500/20 text-green-400'
                              : referral.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {referral.status === 'active' && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {referral.status === 'pending' && (
                            <Clock className="w-3 h-3" />
                          )}
                          <span className="capitalize">{referral.status}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {formatDate(referral.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-medium ${
                            referral.status === 'active'
                              ? 'text-green-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {referral.status === 'active' ? '$25.00' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rewards History */}
        {rewards.length > 0 && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Rewards History
                </h2>
                <p className="text-gray-400">Your earning history</p>
              </div>
            </div>

            <div className="space-y-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <DollarSign className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        Referral Reward - {reward.referral?.referee?.full_name}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {formatDate(reward.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">
                      +${Number(reward.amount).toFixed(2)}
                    </div>
                    <div
                      className={`text-xs ${
                        reward.status === 'paid'
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {reward.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
