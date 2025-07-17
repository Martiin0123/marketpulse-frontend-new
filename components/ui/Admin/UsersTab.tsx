import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  CreditCard,
  Share2,
  Gift,
  Shield,
  Calendar,
  Mail,
  Eye,
  EyeOff,
  Search,
  Filter,
  Download
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  subscription?: {
    id: string;
    status: string;
    price_id: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
  referral_code?: {
    code: string;
    clicks: number;
    conversions: number;
  };
  referred_by?: {
    code: string;
    referrer_email: string;
  };
  whitelist_request?: {
    status: string;
    bybit_uid: string;
  };
  performance_refunds?: {
    month_key: string;
    refund_amount: number;
    status: string;
  }[];
}

interface UsersTabProps {
  users: UserData[];
  stats: {
    total_users: number;
    active_subscriptions: number;
    new_users_this_month: number;
    users_with_referral_codes: number;
    users_referred_by_others: number;
    whitelist_requests: number;
    pending_whitelist_requests: number;
  };
}

export default function UsersTab({ users, stats }: UsersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'subscribed' | 'new' | 'referrals' | 'whitelist'
  >('all');
  const [showEmails, setShowEmails] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-400 bg-emerald-400/10';
      case 'canceled':
        return 'text-red-400 bg-red-400/10';
      case 'past_due':
        return 'text-orange-400 bg-orange-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getWhitelistStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-400 bg-emerald-400/10';
      case 'rejected':
        return 'text-red-400 bg-red-400/10';
      case 'pending':
        return 'text-orange-400 bg-orange-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (filterType) {
      case 'subscribed':
        return user.subscription?.status === 'active';
      case 'new':
        const created = new Date(user.created_at);
        const now = new Date();
        return (
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()
        );
      case 'referrals':
        return user.referral_code || user.referred_by;
      case 'whitelist':
        return user.whitelist_request;
      default:
        return true;
    }
  });

  const exportUsers = () => {
    const csvContent = [
      [
        'Email',
        'Created',
        'Last Sign In',
        'Subscription Status',
        'Referral Code',
        'Referred By',
        'Whitelist Status'
      ],
      ...filteredUsers.map((user) => [
        user.email,
        formatDate(user.created_at),
        user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never',
        user.subscription?.status || 'No subscription',
        user.referral_code?.code || '',
        user.referred_by?.referrer_email || '',
        user.whitelist_request?.status || ''
      ])
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">
                {stats.total_users}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Subscriptions</p>
              <p className="text-2xl font-bold text-emerald-400">
                {stats.active_subscriptions}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">New This Month</p>
              <p className="text-2xl font-bold text-orange-400">
                {stats.new_users_this_month}
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Referral Activity</p>
              <p className="text-2xl font-bold text-purple-400">
                {stats.users_with_referral_codes +
                  stats.users_referred_by_others}
              </p>
            </div>
            <Share2 className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(value: string) => setSearchTerm(value)}
                className="pl-10 w-64 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-700/50 border-slate-600 text-white rounded-lg px-3 py-2"
            >
              <option value="all">All Users</option>
              <option value="subscribed">Subscribed</option>
              <option value="new">New This Month</option>
              <option value="referrals">Referral Activity</option>
              <option value="whitelist">Whitelist Requests</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowEmails(!showEmails)}
              variant="secondary"
              size="sm"
              className="bg-slate-600 hover:bg-slate-700 text-white"
            >
              {showEmails ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showEmails ? 'Hide' : 'Show'} Emails
            </Button>

            <Button
              onClick={exportUsers}
              variant="secondary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Users ({filteredUsers.length})
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Referrals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Whitelist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {showEmails
                          ? user.email
                          : `${user.email.substring(0, 3)}***@${user.email.split('@')[1]}`}
                      </div>
                      <div className="text-xs text-slate-400">
                        ID: {user.id.substring(0, 8)}...
                      </div>
                      {user.last_sign_in_at && (
                        <div className="text-xs text-slate-500">
                          Last sign in: {formatDate(user.last_sign_in_at)}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {user.subscription ? (
                      <div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSubscriptionStatusColor(user.subscription.status)}`}
                        >
                          {user.subscription.status}
                        </span>
                        <div className="text-xs text-slate-400 mt-1">
                          Ends:{' '}
                          {formatDate(user.subscription.current_period_end)}
                        </div>
                        {user.subscription.cancel_at_period_end && (
                          <div className="text-xs text-orange-400">
                            Canceling
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">
                        No subscription
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {user.referral_code && (
                        <div className="text-xs">
                          <span className="text-purple-400">Code:</span>{' '}
                          {user.referral_code.code}
                          <br />
                          <span className="text-slate-400">
                            {user.referral_code.clicks} clicks,{' '}
                            {user.referral_code.conversions} conversions
                          </span>
                        </div>
                      )}
                      {user.referred_by && (
                        <div className="text-xs">
                          <span className="text-green-400">Referred by:</span>{' '}
                          {user.referred_by.referrer_email}
                          <br />
                          <span className="text-slate-400">
                            Code: {user.referred_by.code}
                          </span>
                        </div>
                      )}
                      {!user.referral_code && !user.referred_by && (
                        <span className="text-slate-400 text-xs">
                          No referral activity
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {user.whitelist_request ? (
                      <div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getWhitelistStatusColor(user.whitelist_request.status)}`}
                        >
                          {user.whitelist_request.status}
                        </span>
                        <div className="text-xs text-slate-400 mt-1">
                          UID: {user.whitelist_request.bybit_uid}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">No request</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-white">
                      {formatDate(user.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="px-6 py-8 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">
              No users found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
