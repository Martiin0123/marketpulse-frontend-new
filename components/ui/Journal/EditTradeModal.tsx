'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { TradeEntry } from '@/types/journal';

interface EditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: TradeEntry | null;
  onTradeUpdated: (updatedTrade: TradeEntry) => void;
}

export default function EditTradeModal({
  isOpen,
  onClose,
  trade,
  onTradeUpdated
}: EditTradeModalProps) {
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    rr: '',
    maxAdverse: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    imageUrl: '',
    riskMultiplier: '1' as '0.5' | '1' | '2'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (trade && isOpen) {
      const entryDate = new Date(trade.entry_date);

      setFormData({
        symbol: trade.symbol || '',
        direction: (trade.side?.toLowerCase() as 'long' | 'short') || 'long',
        rr: trade.rr?.toString() || '',
        maxAdverse: trade.max_adverse?.toString() || '',
        date: entryDate.toISOString().slice(0, 10),
        time: entryDate.toTimeString().slice(0, 5),
        notes: trade.notes || '',
        imageUrl: trade.image_url || '',
        riskMultiplier: (trade.risk_multiplier?.toString() || '1') as
          | '0.5'
          | '1'
          | '2'
      });
    }
  }, [trade, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade) return;

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

      // Combine date and time into a single datetime string
      const entryDateTime = new Date(`${formData.date}T${formData.time}`);
      if (isNaN(entryDateTime.getTime())) {
        throw new Error('Invalid date or time');
      }

      // Parse RR and max adverse
      const rr = parseFloat(formData.rr);
      const maxAdverse = parseFloat(formData.maxAdverse);

      if (isNaN(rr)) {
        throw new Error('RR made must be a valid number');
      }

      // Update trade in database
      const { data, error: updateError } = await supabase
        .from('trade_entries' as any)
        .update({
          symbol: formData.symbol.toUpperCase(),
          side: formData.direction,
          entry_date: entryDateTime.toISOString(),
          rr: rr,
          max_adverse: isNaN(maxAdverse) ? null : maxAdverse,
          risk_multiplier: parseFloat(formData.riskMultiplier),
          status: 'closed', // All manually entered trades are closed
          notes: formData.notes || null,
          image_url: formData.imageUrl || null
        })
        .eq('id', trade.id)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(`Failed to update trade: ${updateError.message}`);
      }

      if (!data) {
        throw new Error('No data returned from database');
      }

      onTradeUpdated(data as unknown as TradeEntry);
      onClose();
    } catch (err) {
      console.error('Error updating trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to update trade');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Edit Trade</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Symbol */}
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
                placeholder="e.g., BTCUSDT, EURUSD"
                required
              />
            </div>

            {/* Direction */}
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
            {/* RR Made */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                RR Made
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rr}
                onChange={(e) =>
                  setFormData({ ...formData, rr: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 2.5"
                required
              />
            </div>

            {/* Max Adverse */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Max Adverse (optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.maxAdverse}
                onChange={(e) =>
                  setFormData({ ...formData, maxAdverse: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 0.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Risk Multiplier */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Risk Multiplier
              </label>
              <select
                value={formData.riskMultiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    riskMultiplier: e.target.value as '0.5' | '1' | '2'
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/chart-image.png"
            />
          </div>

          {/* Notes */}
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
              {isLoading ? 'Updating...' : 'Update Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
