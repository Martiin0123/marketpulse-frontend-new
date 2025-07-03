'use client';

import { User } from '@supabase/supabase-js';
import { Tables } from '@/types_db';
import { useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Shield,
  CreditCard,
  Bell,
  Settings,
  Camera,
  Edit3,
  Check,
  X,
  Star,
  Calendar,
  Activity
} from 'lucide-react';
import { updateName } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';

type UserDetails = Tables<'users'>;
type Price = Tables<'prices'> & {
  products: Tables<'products'> | null;
};

type Subscription = Tables<'subscriptions'> & {
  prices: Price | null;
};

interface Props {
  user: User | null;
  userDetails: UserDetails | null;
  subscription: Subscription | null;
}

export default function AccountPage({
  user,
  userDetails,
  subscription
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [fullName, setFullName] = useState(userDetails?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Generate avatar initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar color based on email
  const getAvatarColor = () => {
    if (!user?.email) return 'bg-purple-500';
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500'
    ];
    const index = user.email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName === userDetails?.full_name) {
      setIsEditingName(false);
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('fullName', fullName);

    try {
      await updateName(formData);
      router.refresh();
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscription) {
      return {
        status: 'Free',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20'
      };
    }

    if (
      subscription.status === 'active' ||
      subscription.status === 'trialing'
    ) {
      const planName = subscription.prices?.products?.name || 'Pro';
      const isTrialing = subscription.status === 'trialing';
      return {
        status: isTrialing ? `${planName} (Trial)` : planName,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20'
      };
    }

    if (
      subscription.status === 'canceled' ||
      subscription.status === 'incomplete_expired'
    ) {
      return {
        status: 'Canceled',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20'
      };
    }

    if (subscription.status === 'past_due') {
      return {
        status: 'Past Due',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20'
      };
    }

    return {
      status: 'Inactive',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    };
  };

  const subscriptionInfo = getSubscriptionStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Account Settings
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your profile, subscription, and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8 hover:border-gray-600 transition-all duration-200">
              {/* Avatar Section */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div
                    className={`w-24 h-24 rounded-full ${getAvatarColor()} flex items-center justify-center text-white text-2xl font-bold mb-4 mx-auto`}
                  >
                    {getInitials(userDetails?.full_name)}
                  </div>
                  <button className="absolute -bottom-1 -right-1 bg-purple-500 hover:bg-purple-600 rounded-full p-2 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Name */}
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="space-y-3">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
                      placeholder="Full Name"
                      maxLength={64}
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(false);
                          setFullName(userDetails?.full_name || '');
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white flex items-center justify-center space-x-2">
                      <span>{userDetails?.full_name || 'No name set'}</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-gray-400 hover:text-purple-400 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </h2>
                    <p className="text-gray-400">{user?.email}</p>
                  </div>
                )}

                {/* Subscription Badge */}
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${subscriptionInfo.bgColor} ${subscriptionInfo.color} mt-4`}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {subscriptionInfo.status} Plan
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border-t border-gray-700 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Member since</span>
                    <span className="text-white">
                      {new Date(user?.created_at || '').toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Last sign in</span>
                    <span className="text-white">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric'
                            }
                          )
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <UserIcon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Account Information
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userDetails?.full_name || ''}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Management */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Subscription
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Current Plan</h4>
                    <p className="text-gray-400 text-sm">
                      {subscription
                        ? `${subscriptionInfo.status} subscription`
                        : 'Free tier with limited features'}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${subscriptionInfo.bgColor} ${subscriptionInfo.color}`}
                  >
                    {subscriptionInfo.status}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    {subscription ? 'Manage Subscription' : 'Upgrade Plan'}
                  </button>
                  {subscription && (
                    <button className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                      Billing History
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Security</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">Password</h4>
                    <p className="text-gray-400 text-sm">
                      Last updated 30 days ago
                    </p>
                  </div>
                  <button className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                    Change Password
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">
                      Two-Factor Authentication
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Add an extra layer of security
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Settings className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Preferences
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">
                      Email Notifications
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Receive updates about your account
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Trading Alerts</h4>
                    <p className="text-gray-400 text-sm">
                      Get notified about important signals
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Dark Mode</h4>
                    <p className="text-gray-400 text-sm">
                      Always enabled for better trading experience
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                      disabled
                    />
                    <div className="w-11 h-6 bg-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all opacity-50"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
