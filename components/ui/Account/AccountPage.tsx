'use client';

import { User } from '@supabase/supabase-js';
import { Tables, Database } from '@/types_db';
import { UserDetails } from '@/utils/supabase/queries';
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
  Activity,
  Users,
  LogOut
} from 'lucide-react';
import { updateName } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import CustomerPortalForm from '@/components/ui/AccountForms/CustomerPortalForm';
import Button from '@/components/ui/Button';

type Subscription = Tables<'subscriptions'>;
type Price = Database['public']['Tables']['prices']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

interface Props {
  user: User | null;
  userDetails: UserDetails | null;
  subscription: SubscriptionWithPriceAndProduct | null;
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [tradingAlerts, setTradingAlerts] = useState(true);
  const router = useRouter();
  const supabase = createClient();

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      alert('Password updated successfully');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      alert(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = async (
    type: 'email' | 'trading',
    value: boolean
  ) => {
    try {
      // Update user metadata with notification preferences
      const { error } = await supabase.auth.updateUser({
        data: {
          [`${type}_notifications`]: value
        }
      });

      if (error) {
        throw error;
      }

      if (type === 'email') {
        setEmailNotifications(value);
      } else {
        setTradingAlerts(value);
      }
    } catch (error) {
      console.error('Error updating notification preference:', error);
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
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Account Settings
          </h1>
          <p className="text-slate-400">
            Manage your profile, subscription, and preferences
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 sticky top-24">
              {/* Avatar Section */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div
                    className={`w-20 h-20 rounded-full ${getAvatarColor()} flex items-center justify-center text-white text-xl font-semibold shadow-lg`}
                  >
                    {getInitials(userDetails?.full_name)}
                  </div>
                  <button className="absolute -bottom-1 -right-1 bg-blue-500 hover:bg-blue-600 rounded-full p-2 transition-colors shadow-lg">
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                </div>

                {/* Name Section */}
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="space-y-3">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full text-center"
                      placeholder="Full Name"
                      maxLength={64}
                    />
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingName(false);
                          setFullName(userDetails?.full_name || '');
                        }}
                        className="flex-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white flex items-center justify-center space-x-2">
                      <span>{userDetails?.full_name || 'No name set'}</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </h2>
                    <p className="text-slate-400 text-sm">{user?.email}</p>
                  </div>
                )}

                {/* Subscription Badge */}
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${subscriptionInfo.bgColor} ${subscriptionInfo.color} mt-4`}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {subscriptionInfo.status}
                </div>
              </div>

              {/* Account Stats */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-sm font-medium text-slate-300 mb-4">
                  Account Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Member since</span>
                    <span className="text-sm text-white">
                      {new Date(user?.created_at || '').toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Last sign in</span>
                    <span className="text-sm text-white">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
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

          {/* Settings Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Personal Information */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <UserIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Personal Information
                  </h3>
                  <p className="text-sm text-slate-400">
                    Update your personal details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userDetails?.full_name || ''}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Management */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Subscription & Billing
                  </h3>
                  <p className="text-sm text-slate-400">
                    Manage your subscription and billing details
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div>
                    <h4 className="text-white font-medium">Current Plan</h4>
                    <p className="text-slate-400 text-sm">
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

                <CustomerPortalForm subscription={subscription} />
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Security</h3>
                  <p className="text-sm text-slate-400">
                    Manage your account security settings
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Password Section */}
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-white font-medium">Password</h4>
                      <p className="text-slate-400 text-sm">
                        Secure your account with a strong password
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingPassword(!isChangingPassword)}
                    >
                      {isChangingPassword ? 'Cancel' : 'Change Password'}
                    </Button>
                  </div>

                  {isChangingPassword && (
                    <form
                      onSubmit={handlePasswordChange}
                      className="space-y-4 mt-4 pt-4 border-t border-slate-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-300 block mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value
                              })
                            }
                            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                            placeholder="Enter new password"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-300 block mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value
                              })
                            }
                            className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsChangingPassword(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div>
                    <h4 className="text-white font-medium">
                      Two-Factor Authentication
                    </h4>
                    <p className="text-slate-400 text-sm">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable 2FA
                  </Button>
                </div>
              </div>
            </div>

            {/* Notifications & Preferences */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Notifications
                  </h3>
                  <p className="text-sm text-slate-400">
                    Control how you receive notifications
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div>
                    <h4 className="text-white font-medium">
                      Email Notifications
                    </h4>
                    <p className="text-slate-400 text-sm">
                      Receive updates about your account and trades
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={emailNotifications}
                      onChange={(e) =>
                        handleNotificationToggle('email', e.target.checked)
                      }
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div>
                    <h4 className="text-white font-medium">Trading Alerts</h4>
                    <p className="text-slate-400 text-sm">
                      Get notified about important trading signals
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tradingAlerts}
                      onChange={(e) =>
                        handleNotificationToggle('trading', e.target.checked)
                      }
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
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
