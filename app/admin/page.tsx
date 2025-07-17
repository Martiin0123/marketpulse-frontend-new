'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoadingDots from '@/components/ui/LoadingDots';
import Card from '@/components/ui/Card';
import { trackEvent } from '@/utils/amplitude';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Settings,
  MessageCircle,
  BarChart3,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Edit,
  Lock,
  Shield
} from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  created_at: string;
  closed_at?: string;
  pnl?: number;
  pnl_percentage?: number;
}

interface TabSwitcherProps {
  activeTab: 'signals' | 'manual';
  onTabChange: (tab: 'signals' | 'manual') => void;
}

function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  const tabs = [
    {
      id: 'signals' as const,
      label: 'Signal Management',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: 'manual' as const,
      label: 'Manual Trading',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  return (
    <div className="flex flex-wrap sm:flex-nowrap bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-slate-700/50 mb-6 sm:mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex-1 sm:flex-none ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// Admin Login Component
function AdminLogin({ onLogin }: { onLogin: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        onLogin(password);
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid password');
      }
    } catch (error) {
      setError('Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-slate-400">Enter admin password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Admin Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(value) => setPassword(value)}
                  className="w-full bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                  <span className="text-red-200 text-sm">{error}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !password.trim()}
              variant="primary"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <LoadingDots />
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Access Admin Panel
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SignalsTab({
  signals,
  onUpdateSignal,
  onDeleteSignal
}: {
  signals: Signal[];
  onUpdateSignal: (signalId: string, updates: Partial<Signal>) => void;
  onDeleteSignal: (signalId: string) => void;
}) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const activeSignals = signals.filter((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                Total Signals
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {signals.length}
              </p>
              <p className="text-xs text-slate-500">
                {activeSignals.length} active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                Active Signals
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {activeSignals.length}
              </p>
              <p className="text-xs text-slate-500">Currently running</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                Closed Signals
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {signals.filter((s) => s.status === 'CLOSED').length}
              </p>
              <p className="text-xs text-slate-500">Completed trades</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                Cancelled
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {signals.filter((s) => s.status === 'CANCELLED').length}
              </p>
              <p className="text-xs text-slate-500">Cancelled signals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Signals Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Active Signals</h3>
          <p className="text-slate-400 text-sm mt-1">
            Currently active trading signals
          </p>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Stop Loss
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Take Profit
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {activeSignals.map((signal) => (
                  <tr
                    key={signal.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {signal.symbol}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          signal.side === 'LONG'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {signal.side === 'LONG' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {signal.side}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      ${formatPrice(signal.entry_price)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      ${formatPrice(signal.stop_loss)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      ${formatPrice(signal.take_profit)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {signal.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {formatDate(signal.created_at)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateSignal(signal.id, { status: 'CLOSED' })
                          }
                          className="text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Close
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteSignal(signal.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeSignals.length === 0 && (
              <div className="text-center py-12">
                <Zap className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-500" />
                <h3 className="mt-4 text-base sm:text-lg font-medium text-slate-300">
                  No active signals
                </h3>
                <p className="mt-2 text-sm sm:text-base text-slate-500">
                  No active trading signals found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualTradingTab({
  testAlertSymbol,
  setTestAlertSymbol,
  testAlertLoading,
  testAlertResult,
  testAlertError,
  onTestAlert,
  positionSizing,
  setPositionSizing,
  onUpdateSizing
}: {
  testAlertSymbol: string;
  setTestAlertSymbol: (value: string) => void;
  testAlertLoading: boolean;
  testAlertResult: string;
  testAlertError: string;
  onTestAlert: (alertType: string) => void;
  positionSizing: number;
  setPositionSizing: (value: number) => void;
  onUpdateSizing: (sizing: number) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Position Sizing Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Position Sizing Configuration
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Configure the percentage of wallet balance to use per trade
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium text-white mb-1">
                Position Size (% of Wallet)
              </h4>
              <p className="text-sm text-slate-400">
                Set the percentage of your wallet balance to use for each trade
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-4">
              <div className="flex items-center space-x-3">
                <Input
                  type="number"
                  placeholder="5"
                  value={positionSizing.toString()}
                  onChange={(value) => {
                    const num = parseFloat(value) || 0;
                    setPositionSizing(Math.min(Math.max(num, 0), 100));
                  }}
                  className="w-24 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
                />
                <span className="text-white font-medium">%</span>
                <Button
                  onClick={() => onUpdateSizing(positionSizing)}
                  variant="primary"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Update Sizing
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Target className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-blue-200 text-sm font-medium">
                Current Setting
              </span>
            </div>
            <p className="text-sm text-slate-300">
              Each trade will use{' '}
              <strong className="text-blue-400">{positionSizing}%</strong> of
              your wallet balance.
              {positionSizing > 20 && (
                <span className="text-orange-400 ml-2">
                  ⚠️ High risk setting
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Test Alert Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Test TradingView Alerts
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Send test alerts to your Bybit TradingView webhook
          </p>
        </div>
        <div className="p-6">
          {/* Symbol Input Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-medium text-white mb-1">
                  Trading Symbol
                </h4>
                <p className="text-sm text-slate-400">
                  Enter the symbol for test alerts (e.g., BTCUSDT, ETHUSDT)
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="BTCUSDT"
                    value={testAlertSymbol}
                    onChange={(value) =>
                      setTestAlertSymbol(value.toUpperCase())
                    }
                    className="w-full sm:w-48 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Target className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Buttons Section */}
          <div className="mb-6">
            <h4 className="text-base font-medium text-white mb-4">
              Test Alert Types
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => onTestAlert('buy_alert')}
                disabled={testAlertLoading}
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {testAlertLoading ? (
                  <LoadingDots />
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Buy Alert
                  </>
                )}
              </Button>
              <Button
                onClick={() => onTestAlert('sell_alert')}
                disabled={testAlertLoading}
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {testAlertLoading ? (
                  <LoadingDots />
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Sell Alert
                  </>
                )}
              </Button>
              <Button
                onClick={() => onTestAlert('close_alert')}
                disabled={testAlertLoading}
                variant="primary"
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {testAlertLoading ? (
                  <LoadingDots />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Close Long
                  </>
                )}
              </Button>
              <Button
                onClick={() => onTestAlert('close_short_alert')}
                disabled={testAlertLoading}
                variant="primary"
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {testAlertLoading ? (
                  <LoadingDots />
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Close Short
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Test Alert Results */}
          {(testAlertResult || testAlertError) && (
            <div className="mt-8">
              <h4 className="text-base font-medium text-white mb-4">
                Test Results
              </h4>
              {testAlertResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" />
                    <h5 className="text-sm font-medium text-emerald-400">
                      Test Alert Successful
                    </h5>
                  </div>
                  <pre className="text-sm text-emerald-300 bg-slate-800 p-3 rounded overflow-x-auto">
                    {testAlertResult}
                  </pre>
                </div>
              )}
              {testAlertError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <XCircle className="w-5 h-5 text-red-400 mr-2" />
                    <h5 className="text-sm font-medium text-red-400">
                      Test Alert Error
                    </h5>
                  </div>
                  <pre className="text-sm text-red-300 bg-slate-800 p-3 rounded overflow-x-auto">
                    {testAlertError}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'signals' | 'manual'>('signals');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Test alert states
  const [testAlertSymbol, setTestAlertSymbol] = useState('BTCUSDT');
  const [testAlertLoading, setTestAlertLoading] = useState(false);
  const [testAlertResult, setTestAlertResult] = useState<string>('');
  const [testAlertError, setTestAlertError] = useState<string>('');

  // Position sizing states
  const [positionSizing, setPositionSizing] = useState(5); // Default to 5%, will be updated from database

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await fetch('/api/admin/auth/check');
        if (response.ok) {
          setIsAuthenticated(true);
          fetchData();
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuthentication();
  }, []);

  const handleLogin = async (password: string) => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Invalid password');
      }
    } catch (error) {
      alert('Failed to authenticate');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST'
      });
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchData = async () => {
    try {
      const signalsRes = await fetch('/api/admin/signals');

      if (signalsRes.ok) {
        const signalsData = await signalsRes.json();
        setSignals(signalsData);
      }

      // Fetch current position sizing from database
      try {
        const sizingResponse = await fetch(
          '/api/admin/get-sizing?exchange=bybit',
          {
            method: 'GET'
          }
        );

        if (sizingResponse.ok) {
          const sizingData = await sizingResponse.json();
          setPositionSizing(sizingData.positionSizing || 5);
          console.log(
            '📊 Loaded current position sizing from database:',
            sizingData.positionSizing
          );
          // Clear any stale localStorage value
          if (typeof window !== 'undefined') {
            localStorage.removeItem('positionSizing');
          }
        } else {
          console.log(
            '⚠️ Could not fetch current sizing from database, using default'
          );
        }
      } catch (sizingError) {
        console.log(
          '⚠️ Error fetching current sizing from database:',
          sizingError
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSignal = async (
    signalId: string,
    updates: Partial<Signal>
  ) => {
    try {
      const response = await fetch('/api/admin/update-signal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: signalId, ...updates })
      });

      if (response.ok) {
        fetchData();
        trackEvent();
      }
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Are you sure you want to delete this signal?')) return;

    try {
      const response = await fetch('/api/admin/delete-signal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: signalId })
      });

      if (response.ok) {
        fetchData();
        trackEvent();
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
    }
  };

  const handleTestAlert = async (alertType: string) => {
    setTestAlertLoading(true);
    setTestAlertResult('');
    setTestAlertError('');

    try {
      let alertMessage = '';

      switch (alertType) {
        case 'buy_alert':
          alertMessage = `Primescope LONG Entry! Symbol: ${testAlertSymbol}, Price: 45000`;
          break;
        case 'sell_alert':
          alertMessage = `Primescope SHORT Entry! Symbol: ${testAlertSymbol}, Price: 45000`;
          break;
        case 'close_alert':
          alertMessage = `Primescope LONG Exit! Symbol: ${testAlertSymbol}, MA Cross`;
          break;
        case 'close_short_alert':
          alertMessage = `Primescope SHORT Exit! Symbol: ${testAlertSymbol}, MA Cross`;
          break;
        default:
          throw new Error('Invalid alert type');
      }

      const response = await fetch('/api/bybit/tradingview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_message: alertMessage,
          test: true // Mark as test signal
        })
      });

      const result = await response.text();

      if (response.ok) {
        setTestAlertResult(result);
        trackEvent();
      } else {
        setTestAlertError(result);
      }
    } catch (error) {
      setTestAlertError('Failed to send test alert');
      console.error('Error sending test alert:', error);
    } finally {
      setTestAlertLoading(false);
    }
  };

  const handleUpdateSizing = async (sizing: number) => {
    try {
      const response = await fetch('/api/admin/update-sizing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          positionSizing: sizing,
          exchangeName: 'bybit'
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Position sizing updated successfully:', sizing);
        trackEvent();
      } else {
        console.error('Failed to update position sizing:', data.error);
      }
    } catch (error) {
      console.error('Error updating position sizing:', error);
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-400 font-medium">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="pt-16 sm:pt-20 pb-8 sm:pb-12 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
                Admin Dashboard
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-4 sm:mb-6">
                Manage signals and test TradingView alerts
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Tabs */}
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'signals' && (
          <SignalsTab
            signals={signals}
            onUpdateSignal={handleUpdateSignal}
            onDeleteSignal={handleDeleteSignal}
          />
        )}

        {activeTab === 'manual' && (
          <ManualTradingTab
            testAlertSymbol={testAlertSymbol}
            setTestAlertSymbol={setTestAlertSymbol}
            testAlertLoading={testAlertLoading}
            testAlertResult={testAlertResult}
            testAlertError={testAlertError}
            onTestAlert={handleTestAlert}
            positionSizing={positionSizing}
            setPositionSizing={setPositionSizing}
            onUpdateSizing={handleUpdateSizing}
          />
        )}
      </div>
    </div>
  );
}
