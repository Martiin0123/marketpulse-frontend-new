'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import type { TradingAccount } from '@/types/journal';

interface ConnectBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brokerType: 'projectx';
  onAccountCreated: (account: TradingAccount) => Promise<void>;
}

interface BrokerAccount {
  id: string;
  name: string;
  balance?: number;
  currency?: string;
}

export default function ConnectBrokerModal({
  isOpen,
  onClose,
  brokerType,
  onAccountCreated
}: ConnectBrokerModalProps) {
  const [step, setStep] = useState<
    'credentials' | 'select-account' | 'account-details'
  >('credentials');
  const [apiKey, setApiKey] = useState('');
  const [apiUsername, setApiUsername] = useState(''); // Project X: username + API key
  const [apiServiceType, setApiServiceType] = useState<
    'topstepx' | 'alphaticks'
  >('topstepx'); // Project X service type
  const [customApiUrl, setCustomApiUrl] = useState(''); // Custom API URL override
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [selectedBrokerAccount, setSelectedBrokerAccount] =
    useState<BrokerAccount | null>(null);
  const [accountDetails, setAccountDetails] = useState({
    name: '',
    currency: 'USD',
    initial_balance: '',
    fixed_risk: '1'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const brokerNames = {
    projectx: 'Project X'
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiUsername) {
      setError('Please enter your Username and API Key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (brokerType === 'projectx') {
        // Fetch accounts via API route (server-side proxy to avoid CORS)
        const response = await fetch('/api/broker/projectx/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKey,
            apiUsername,
            apiServiceType,
            customApiUrl
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch accounts');
        }

        const { accounts } = await response.json();

        if (accounts.length === 0) {
          setError('No accounts found. Please check your API credentials.');
          return;
        }

        setBrokerAccounts(accounts);
        setStep('select-account');
      }
    } catch (err: any) {
      console.error('Error fetching broker accounts:', err);
      setError(
        err.message || 'Failed to connect. Please check your API credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = (account: BrokerAccount) => {
    setSelectedBrokerAccount(account);
    // Pre-fill account details
    setAccountDetails({
      name: account.name || `Project X ${account.id.slice(0, 8)}`,
      currency: account.currency || 'USD',
      initial_balance: account.balance?.toString() || '',
      fixed_risk: '1'
    });
    setStep('account-details');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrokerAccount) return;

    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Create trading account
      const { data: tradingAccount, error: accountError } = await supabase
        .from('trading_accounts' as any)
        .insert({
          user_id: user.id,
          name: accountDetails.name,
          currency: accountDetails.currency,
          initial_balance: parseFloat(accountDetails.initial_balance) || 0,
          fixed_risk: parseFloat(accountDetails.fixed_risk) || 1
        })
        .select()
        .single();

      if (accountError || !tradingAccount) {
        throw new Error(
          accountError?.message || 'Failed to create trading account'
        );
      }

      // Create broker connection
      // Build insert object, only include api_base_url if customApiUrl is provided
      // (handles case where column might not exist if migration hasn't run)
      const insertData: any = {
        user_id: user.id,
        trading_account_id: tradingAccount.id,
        broker_type: brokerType,
        auth_method: 'api_key',
        api_key: apiKey,
        api_username: apiUsername, // Project X: username + API key
        api_secret: null, // Not needed for Project X
        api_service_type: apiServiceType, // TopStepX or AlphaTicks
        broker_account_name: selectedBrokerAccount.id,
        broker_username: selectedBrokerAccount.name || selectedBrokerAccount.id,
        auto_sync_enabled: true,
        access_token: null,
        refresh_token: null,
        token_expires_at: null
      };

      // Only include api_base_url if provided (and column exists)
      if (customApiUrl) {
        insertData.api_base_url = customApiUrl;
      }

      const { error: connError } = await supabase
        .from('broker_connections' as any)
        .insert(insertData);

      if (connError) {
        // Rollback: delete the trading account if connection fails
        await supabase
          .from('trading_accounts' as any)
          .delete()
          .eq('id', tradingAccount.id);
        throw new Error(
          connError.message || 'Failed to create broker connection'
        );
      }

      // Trigger automatic sync after connection is created
      // This will import all historical trades
      if (brokerType === 'projectx') {
        try {
          // Get the connection ID from the insert result
          const { data: insertedConnection } = await supabase
            .from('broker_connections' as any)
            .select('id')
            .eq('trading_account_id', tradingAccount.id)
            .eq('broker_type', brokerType)
            .single();

          if (insertedConnection) {
            // Trigger sync in background (don't wait for it)
            fetch(
              `/api/broker/sync?broker_connection_id=${insertedConnection.id}`,
              {
                method: 'POST'
              }
            ).catch((err) => {
              console.warn(
                'Background sync triggered but may complete later:',
                err
              );
            });
          }
        } catch (syncError) {
          // Don't fail the connection if sync fails - user can sync manually
          console.warn('Failed to trigger automatic sync:', syncError);
        }
      }

      // Success!
      await onAccountCreated(tradingAccount);

      // Reset form
      setStep('credentials');
      setApiKey('');
      setApiUsername('');
      setApiServiceType('topstepx');
      setCustomApiUrl('');
      setBrokerAccounts([]);
      setSelectedBrokerAccount(null);
      setAccountDetails({
        name: '',
        currency: 'USD',
        initial_balance: '',
        fixed_risk: '1'
      });
      onClose();
    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('credentials');
    setApiKey('');
    setApiUsername('');
    setApiServiceType('topstepx');
    setCustomApiUrl('');
    setBrokerAccounts([]);
    setSelectedBrokerAccount(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            Connect {brokerNames[brokerType]}
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Service Type
                </label>
                <select
                  value={apiServiceType}
                  onChange={(e) =>
                    setApiServiceType(
                      e.target.value as 'topstepx' | 'alphaticks'
                    )
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="topstepx">TopStepX</option>
                  <option value="alphaticks">AlphaTicks</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={apiUsername}
                  onChange={(e) => setApiUsername(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your API Key"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Custom API URL (optional)
                </label>
                <input
                  type="text"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., https://api.topstepx.com/api"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Leave empty to use default. Only set if you know the correct
                  API endpoint.
                </p>
              </div>

              <p className="text-xs text-slate-400">
                Your API credentials are stored securely and only used to sync
                your trades.
              </p>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Connecting...' : 'Next'}
                </button>
              </div>
            </form>
          )}

          {step === 'select-account' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Select the broker account to connect:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {brokerAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account)}
                    className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600 hover:border-blue-500"
                  >
                    <div className="font-medium text-white">
                      {account.name || account.id}
                    </div>
                    {account.balance !== undefined && (
                      <div className="text-xs text-slate-400 mt-1">
                        Balance: {account.balance.toLocaleString()}{' '}
                        {account.currency || 'USD'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('credentials')}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {step === 'account-details' && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <p className="text-sm text-slate-300">
                Configure your journal account:
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountDetails.name}
                  onChange={(e) =>
                    setAccountDetails({
                      ...accountDetails,
                      name: e.target.value
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Currency
                </label>
                <select
                  value={accountDetails.currency}
                  onChange={(e) =>
                    setAccountDetails({
                      ...accountDetails,
                      currency: e.target.value
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={accountDetails.initial_balance}
                  onChange={(e) =>
                    setAccountDetails({
                      ...accountDetails,
                      initial_balance: e.target.value
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fixed Risk (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={accountDetails.fixed_risk}
                  onChange={(e) =>
                    setAccountDetails({
                      ...accountDetails,
                      fixed_risk: e.target.value
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Percentage of account balance to risk per trade (used for RR
                  calculations)
                </p>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('select-account')}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Account & Connect'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
