'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/utils/auth-context';
import Button from '@/components/ui/Button';
import { Trash2, Plus, Edit, Eye, AlertTriangle } from 'lucide-react';

interface Signal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  status: 'active' | 'closed';
  entry_price: number;
  exit_price?: number;
  pnl_percentage?: number;
  created_at: string;
  exit_timestamp?: string;
  order_id?: string;
  exchange: string;
}

interface Position {
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  unrealisedPnl: string;
  markPrice: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<
    'signals' | 'positions' | 'manual'
  >('signals');

  const supabase = createClient();

  // Check admin authentication
  const checkAdminAuth = async () => {
    if (!password) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setMessage('✅ Admin access granted');
        loadData();
      } else {
        setMessage('❌ Invalid admin password');
      }
    } catch (error) {
      setMessage('❌ Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Load signals and positions
  const loadData = async () => {
    setLoading(true);
    try {
      // Load signals
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data: signalsData } = await supabase
        .from('signals')
        .select('*')
        .eq('exchange', 'bybit')
        .order('created_at', { ascending: false });

      // Type-safe conversion
      const typedSignals: Signal[] = (signalsData || []).map((signal) => ({
        id: signal.id,
        symbol: signal.symbol,
        type: signal.type as 'buy' | 'sell',
        status: signal.status as 'active' | 'closed',
        entry_price: signal.entry_price,
        exit_price: signal.exit_price || undefined,
        pnl_percentage: signal.pnl_percentage || undefined,
        created_at: signal.created_at,
        exit_timestamp: signal.exit_timestamp || undefined,
        order_id: (signal as any).order_id || undefined,
        exchange: signal.exchange
      }));

      setSignals(typedSignals);

      // Load current positions
      const response = await fetch('/api/admin/positions');
      if (response.ok) {
        const positionsData = await response.json();
        setPositions(positionsData.positions || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('❌ Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Close position manually
  const closePosition = async (symbol: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, password })
      });

      if (response.ok) {
        setMessage('✅ Position closed successfully');
        loadData();
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to close position: ${error.error}`);
      }
    } catch (error) {
      setMessage('❌ Error closing position');
    } finally {
      setLoading(false);
    }
  };

  // Add manual signal (now opens position on Bybit)
  const addManualSignal = async (formData: FormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/add-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.get('symbol'),
          type: formData.get('type'),
          entry_price: parseFloat(formData.get('entry_price') as string),
          password
        })
      });

      if (response.ok) {
        setMessage('✅ Position opened and signal added successfully');
        loadData();
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to open position: ${error.error}`);
      }
    } catch (error) {
      setMessage('❌ Error opening position');
    } finally {
      setLoading(false);
    }
  };

  // Quick open position
  const quickOpenPosition = async (symbol: string, action: 'BUY' | 'SELL') => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/open-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, action, password })
      });

      if (response.ok) {
        setMessage(`✅ ${action} position opened successfully for ${symbol}`);
        loadData();
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to open position: ${error.error}`);
      }
    } catch (error) {
      setMessage('❌ Error opening position');
    } finally {
      setLoading(false);
    }
  };

  // Update signal
  const updateSignal = async (signalId: string, updates: Partial<Signal>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/update-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, updates, password })
      });

      if (response.ok) {
        setMessage('✅ Signal updated successfully');
        loadData();
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to update signal: ${error.error}`);
      }
    } catch (error) {
      setMessage('❌ Error updating signal');
    } finally {
      setLoading(false);
    }
  };

  // Delete signal
  const deleteSignal = async (signalId: string) => {
    if (!confirm('Are you sure you want to delete this signal?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/delete-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, password })
      });

      if (response.ok) {
        setMessage('✅ Signal deleted successfully');
        loadData();
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to delete signal: ${error.error}`);
      }
    } catch (error) {
      setMessage('❌ Error deleting signal');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">Admin Access</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin password"
                onKeyPress={(e) => e.key === 'Enter' && checkAdminAuth()}
              />
            </div>

            <Button
              onClick={checkAdminAuth}
              disabled={loading || !password}
              className="w-full"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </Button>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                message.includes('✅')
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <Button
            onClick={() => setIsAuthenticated(false)}
            variant="secondary"
            size="sm"
          >
            Logout
          </Button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes('✅')
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'signals'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Signals ({signals.length})
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'positions'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'manual'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Manual Actions
          </button>
        </div>

        {/* Signals Tab */}
        {activeTab === 'signals' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                Trading Signals
              </h2>
              <Button onClick={loadData} disabled={loading}>
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-300">Symbol</th>
                    <th className="text-left p-3 text-slate-300">Type</th>
                    <th className="text-left p-3 text-slate-300">Status</th>
                    <th className="text-left p-3 text-slate-300">
                      Entry Price
                    </th>
                    <th className="text-left p-3 text-slate-300">Exit Price</th>
                    <th className="text-left p-3 text-slate-300">P&L %</th>
                    <th className="text-left p-3 text-slate-300">Created</th>
                    <th className="text-left p-3 text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((signal) => (
                    <tr
                      key={signal.id}
                      className="border-b border-slate-700/50"
                    >
                      <td className="p-3 text-white font-medium">
                        {signal.symbol}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            signal.type === 'buy'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {signal.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            signal.status === 'active'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {signal.status}
                        </span>
                      </td>
                      <td className="p-3 text-white">${signal.entry_price}</td>
                      <td className="p-3 text-white">
                        {signal.exit_price ? `$${signal.exit_price}` : '-'}
                      </td>
                      <td className="p-3">
                        {signal.pnl_percentage !== null &&
                        signal.pnl_percentage !== undefined ? (
                          <span
                            className={`font-medium ${
                              signal.pnl_percentage >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {signal.pnl_percentage >= 0 ? '+' : ''}
                            {signal.pnl_percentage.toFixed(2)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {new Date(signal.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              updateSignal(signal.id, { status: 'closed' })
                            }
                            className="p-1 text-blue-400 hover:text-blue-300"
                            title="Close Signal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSignal(signal.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Delete Signal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                Current Positions
              </h2>
              <Button onClick={loadData} disabled={loading}>
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-300">Symbol</th>
                    <th className="text-left p-3 text-slate-300">Side</th>
                    <th className="text-left p-3 text-slate-300">Size</th>
                    <th className="text-left p-3 text-slate-300">Avg Price</th>
                    <th className="text-left p-3 text-slate-300">Mark Price</th>
                    <th className="text-left p-3 text-slate-300">
                      Unrealised P&L
                    </th>
                    <th className="text-left p-3 text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr key={index} className="border-b border-slate-700/50">
                      <td className="p-3 text-white font-medium">
                        {position.symbol}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            position.side === 'Buy'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {position.side}
                        </span>
                      </td>
                      <td className="p-3 text-white">{position.size}</td>
                      <td className="p-3 text-white">${position.avgPrice}</td>
                      <td className="p-3 text-white">${position.markPrice}</td>
                      <td className="p-3">
                        <span
                          className={`font-medium ${
                            parseFloat(position.unrealisedPnl) >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          ${position.unrealisedPnl}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button
                          onClick={() => closePosition(position.symbol)}
                          disabled={loading}
                          size="sm"
                          variant="secondary"
                        >
                          Close
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Actions Tab */}
        {activeTab === 'manual' && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              Manual Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add Signal Form */}
              <div className="bg-slate-700 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">
                  Open Position & Add Signal
                </h3>
                <form action={addManualSignal} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Symbol
                    </label>
                    <input
                      name="symbol"
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., BTCUSDT"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Entry Price
                    </label>
                    <input
                      name="entry_price"
                      type="number"
                      step="0.01"
                      required
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading
                      ? 'Opening Position...'
                      : 'Open Position & Add Signal'}
                  </Button>
                </form>
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-700 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-4">
                  <Button
                    onClick={() => loadData()}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Loading...' : 'Refresh All Data'}
                  </Button>

                  {/* Quick Open Position */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-300">
                      Quick Open Position
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => quickOpenPosition('BTCUSDT', 'BUY')}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        BTC BUY
                      </Button>
                      <Button
                        onClick={() => quickOpenPosition('BTCUSDT', 'SELL')}
                        disabled={loading}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        BTC SELL
                      </Button>
                      <Button
                        onClick={() => quickOpenPosition('ETHUSDT', 'BUY')}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ETH BUY
                      </Button>
                      <Button
                        onClick={() => quickOpenPosition('ETHUSDT', 'SELL')}
                        disabled={loading}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        ETH SELL
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-300 text-sm">
                        Admin actions are logged and cannot be undone.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
