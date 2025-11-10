'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import type { TradeEntry } from '@/types/journal';
import type { TradeEntry as TradeEntryType } from '@/types/journal';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onTradeAdded: (trade: TradeEntry) => void;
}

export default function AddTradeModal({
  isOpen,
  onClose,
  accountId,
  onTradeAdded
}: AddTradeModalProps) {
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entry_date: new Date().toISOString().slice(0, 16),
    exit_date: '',
    entry_price: '',
    exit_price: '',
    size: '',
    pnl: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Calculate PnL percentage and R:R if exit data is provided
      const entryPrice = parseFloat(formData.entry_price);
      const exitPrice = formData.exit_price
        ? parseFloat(formData.exit_price)
        : null;
      const pnlAmount = formData.pnl ? parseFloat(formData.pnl) : null;

      let pnlPercentage = null;
      let rr = null;

      if (exitPrice && pnlAmount) {
        pnlPercentage =
          (pnlAmount / (entryPrice * parseFloat(formData.size))) * 100;
        // Calculate R:R (simplified - would need risk amount in real implementation)
        rr = pnlAmount / (entryPrice * parseFloat(formData.size) * 0.01);
      }

      // Save to Supabase
      const { data, error: insertError } = await supabase
        .from('trade_entries' as any)
        .insert({
          account_id: accountId,
          user_id: user.id,
          symbol: formData.symbol,
          direction: formData.direction,
          entry_date: formData.entry_date,
          exit_date: formData.exit_date || null,
          entry_price: entryPrice,
          exit_price: exitPrice,
          size: parseFloat(formData.size),
          pnl: pnlAmount,
          pnl_percentage: pnlPercentage,
          rr: rr,
          status: formData.exit_date ? 'closed' : 'open',
          notes: formData.notes || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(`Failed to add trade: ${insertError.message}`);
      }

      if (!data) {
        throw new Error('No data returned from database');
      }

      // Note: Copy trading now only executes orders on destination accounts
      // It doesn't create journal entries - those come from syncing destination accounts
      // Real-time copy trade execution is handled by the polling mechanism

      onTradeAdded(data);
      setFormData({
        symbol: '',
        direction: 'long',
        entry_date: new Date().toISOString().slice(0, 16),
        exit_date: '',
        entry_price: '',
        exit_price: '',
        size: '',
        pnl: '',
        notes: ''
      });
      onClose();
    } catch (err) {
      console.error('Error adding trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to add trade');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Add New Trade</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    symbol: e.target.value.toUpperCase()
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., EURUSD, BTCUSD"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Direction
              </label>
              <select
                value={formData.direction}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direction: e.target.value as 'long' | 'short'
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.entry_date}
                onChange={(e) =>
                  setFormData({ ...formData, entry_date: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Date & Time (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.exit_date}
                onChange={(e) =>
                  setFormData({ ...formData, exit_date: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Price
              </label>
              <input
                type="number"
                step="0.00001"
                value={formData.entry_price}
                onChange={(e) =>
                  setFormData({ ...formData, entry_price: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.2345"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Price (optional)
              </label>
              <input
                type="number"
                step="0.00001"
                value={formData.exit_price}
                onChange={(e) =>
                  setFormData({ ...formData, exit_price: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.2456"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Size (Units/Lots)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.size}
                onChange={(e) =>
                  setFormData({ ...formData, size: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                P&L (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.pnl}
                onChange={(e) =>
                  setFormData({ ...formData, pnl: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="150.50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Trade notes, strategy, etc."
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
