'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoadingDots from '@/components/ui/LoadingDots';
import { trackEvent } from '@/utils/amplitude';

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

export default function AdminPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string>('');
  const [simulationError, setSimulationError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'signals' | 'manual'>('signals');

  // Form states for new signal
  const [newSignal, setNewSignal] = useState({
    symbol: '',
    side: 'LONG' as 'LONG' | 'SHORT',
    entry_price: '',
    stop_loss: '',
    take_profit: ''
  });

  // Form states for simulation
  const [simulationForm, setSimulationForm] = useState({
    symbol: '',
    action: 'LONG_ENTRY' as
      | 'LONG_ENTRY'
      | 'SHORT_ENTRY'
      | 'LONG_EXIT'
      | 'SHORT_EXIT',
    price: ''
  });

  // Test alert states
  const [testAlertSymbol, setTestAlertSymbol] = useState('BTCUSDT');
  const [testAlertLoading, setTestAlertLoading] = useState(false);
  const [testAlertResult, setTestAlertResult] = useState<string>('');
  const [testAlertError, setTestAlertError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const signalsRes = await fetch('/api/admin/signals');

      if (signalsRes.ok) {
        const signalsData = await signalsRes.json();
        setSignals(signalsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/add-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSignal)
      });

      if (response.ok) {
        setNewSignal({
          symbol: '',
          side: 'LONG',
          entry_price: '',
          stop_loss: '',
          take_profit: ''
        });
        fetchData();
        trackEvent('admin_signal_added', {
          symbol: newSignal.symbol,
          side: newSignal.side
        });
      } else {
        const error = await response.text();
        console.error('Error adding signal:', error);
      }
    } catch (error) {
      console.error('Error adding signal:', error);
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
        trackEvent('admin_signal_updated', { signalId });
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
        trackEvent('admin_signal_deleted', { signalId });
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
    }
  };

  const handleSimulateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimulationResult('');
    setSimulationError('');

    try {
      const response = await fetch('/api/admin/simulate-tradingview-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationForm)
      });

      const result = await response.text();

      if (response.ok) {
        setSimulationResult(result);
        trackEvent('admin_alert_simulated', {
          symbol: simulationForm.symbol,
          action: simulationForm.action
        });
      } else {
        setSimulationError(result);
      }
    } catch (error) {
      setSimulationError('Failed to simulate alert');
      console.error('Error simulating alert:', error);
    } finally {
      setSimulating(false);
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
        body: JSON.stringify({ alert_message: alertMessage })
      });

      const result = await response.text();

      if (response.ok) {
        setTestAlertResult(result);
        trackEvent('admin_test_alert_sent', {
          alertType,
          symbol: testAlertSymbol
        });
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
              Admin Dashboard
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-4 sm:mb-6">
              Manage signals and test TradingView alerts
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('signals')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'signals'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                Signal Management
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                Manual Trading
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'signals' && (
          <div className="space-y-6">
            {/* Current Signals */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">
                  Current Signals
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Currently active trading signals
                </p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Symbol
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Side
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Entry
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Stop Loss
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Take Profit
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Created
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals
                        .filter((s) => s.status === 'ACTIVE')
                        .map((signal) => (
                          <tr
                            key={signal.id}
                            className="border-b border-slate-700 hover:bg-slate-700/50"
                          >
                            <td className="py-3 px-4 font-medium text-white">
                              {signal.symbol}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  signal.side === 'LONG'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {signal.side}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white">
                              {formatPrice(signal.entry_price)}
                            </td>
                            <td className="py-3 px-4 text-white">
                              {formatPrice(signal.stop_loss)}
                            </td>
                            <td className="py-3 px-4 text-white">
                              {formatPrice(signal.take_profit)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                {signal.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-400">
                              {formatDate(signal.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUpdateSignal(signal.id, {
                                      status: 'CLOSED'
                                    })
                                  }
                                  className="text-xs"
                                >
                                  Close
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteSignal(signal.id)}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {signals.filter((s) => s.status === 'ACTIVE').length ===
                    0 && (
                    <div className="text-center py-8 text-slate-400">
                      No active signals found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-6">
            {/* Test Alert Buttons */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">
                  Test Alert Buttons
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Send test alerts to your Bybit TradingView webhook
                </p>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Symbol
                  </label>
                  <Input
                    type="text"
                    placeholder="BTCUSDT"
                    value={testAlertSymbol}
                    onChange={(value) =>
                      setTestAlertSymbol(value.toUpperCase())
                    }
                    className="w-full max-w-xs"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => handleTestAlert('buy_alert')}
                    disabled={testAlertLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {testAlertLoading ? <LoadingDots /> : 'Buy Alert'}
                  </Button>
                  <Button
                    onClick={() => handleTestAlert('sell_alert')}
                    disabled={testAlertLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {testAlertLoading ? <LoadingDots /> : 'Sell Alert'}
                  </Button>
                  <Button
                    onClick={() => handleTestAlert('close_alert')}
                    disabled={testAlertLoading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {testAlertLoading ? <LoadingDots /> : 'Close Long'}
                  </Button>
                  <Button
                    onClick={() => handleTestAlert('close_short_alert')}
                    disabled={testAlertLoading}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {testAlertLoading ? <LoadingDots /> : 'Close Short'}
                  </Button>
                </div>

                {/* Test Alert Results */}
                {(testAlertResult || testAlertError) && (
                  <div className="mt-6 p-4 rounded-lg border border-slate-600">
                    {testAlertResult && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-emerald-400 mb-2">
                          Test Alert Successful
                        </h4>
                        <pre className="text-sm text-emerald-300 bg-slate-800 p-3 rounded overflow-x-auto">
                          {testAlertResult}
                        </pre>
                      </div>
                    )}
                    {testAlertError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-red-400 mb-2">
                          Test Alert Error
                        </h4>
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
        )}
      </div>
    </div>
  );
}
