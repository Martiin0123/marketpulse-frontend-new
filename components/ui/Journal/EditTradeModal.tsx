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
    side: 'long' as 'long' | 'short',
    entry_price: '',
    exit_price: '',
    pnl_amount: '',
    rr: '',
    status: 'closed' as 'open' | 'closed',
    entry_date: '',
    entry_time: '',
    exit_date: '',
    exit_time: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (trade && isOpen) {
      const entryDate = new Date(trade.entry_date);
      const exitDate = trade.exit_date ? new Date(trade.exit_date) : null;

      setFormData({
        symbol: trade.symbol || '',
        side: (trade.side?.toLowerCase() as 'long' | 'short') || 'long',
        entry_price: trade.entry_price?.toString() || '',
        exit_price: trade.exit_price?.toString() || '',
        pnl_amount: trade.pnl_amount?.toString() || '',
        rr: trade.rr?.toString() || '',
        status: (trade.status?.toLowerCase() as 'open' | 'closed') || 'closed',
        entry_date: entryDate.toISOString().slice(0, 10),
        entry_time: entryDate.toTimeString().slice(0, 5),
        exit_date: exitDate ? exitDate.toISOString().slice(0, 10) : '',
        exit_time: exitDate ? exitDate.toTimeString().slice(0, 5) : '',
        notes: trade.notes || ''
      });
    }
  }, [trade, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade) return;

    try {
      setIsLoading(true);
      setError(null);

      // Validate required fields
      if (
        !formData.symbol ||
        !formData.entry_price ||
        !formData.entry_date ||
        !formData.entry_time
      ) {
        setError('Please fill in all required fields');
        return;
      }

      const entryPrice = parseFloat(formData.entry_price);
      const exitPrice = formData.exit_price
        ? parseFloat(formData.exit_price)
        : null;
      const pnlAmount = formData.pnl_amount
        ? parseFloat(formData.pnl_amount)
        : null;
      const rr = formData.rr ? parseFloat(formData.rr) : null;

      // Create entry datetime
      const entryDateTime = new Date(
        `${formData.entry_date}T${formData.entry_time}`
      ).toISOString();

      // Create exit datetime if provided
      let exitDateTime = null;
      if (formData.exit_date && formData.exit_time) {
        exitDateTime = new Date(
          `${formData.exit_date}T${formData.exit_time}`
        ).toISOString();
      }

      // Calculate P&L if not provided but we have prices
      let calculatedPnl = pnlAmount;
      if (!calculatedPnl && exitPrice) {
        calculatedPnl =
          formData.side === 'long'
            ? exitPrice - entryPrice
            : entryPrice - exitPrice;
      }

      // Calculate R:R if not provided but we have P&L
      let calculatedRr = rr;
      if (!calculatedRr && calculatedPnl && entryPrice) {
        calculatedRr = Math.abs(calculatedPnl) / entryPrice;
      }

      // Update trade in database
      const { data, error: updateError } = await supabase
        .from('trade_entries' as any)
        .update({
          symbol: formData.symbol,
          side: formData.side,
          entry_price: entryPrice,
          exit_price: exitPrice,
          pnl_amount: calculatedPnl,
          rr: calculatedRr,
          status: formData.status,
          entry_date: entryDateTime,
          exit_date: exitDateTime,
          notes: formData.notes || null
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Edit Trade</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Symbol *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., BTCUSD, EURUSD"
                required
              />
            </div>

            {/* Side */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Direction *
              </label>
              <select
                value={formData.side}
                onChange={(e) => handleInputChange('side', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entry_price}
                onChange={(e) =>
                  handleInputChange('entry_price', e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            {/* Exit Price */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.exit_price}
                onChange={(e) =>
                  handleInputChange('exit_price', e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* P&L Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                P&L Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.pnl_amount}
                onChange={(e) =>
                  handleInputChange('pnl_amount', e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* R:R */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Risk:Reward
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rr}
                onChange={(e) => handleInputChange('rr', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* Entry Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Date *
              </label>
              <input
                type="date"
                value={formData.entry_date}
                onChange={(e) =>
                  handleInputChange('entry_date', e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Entry Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entry Time *
              </label>
              <input
                type="time"
                value={formData.entry_time}
                onChange={(e) =>
                  handleInputChange('entry_time', e.target.value)
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Exit Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Date
              </label>
              <input
                type="date"
                value={formData.exit_date}
                onChange={(e) => handleInputChange('exit_date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Exit Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Exit Time
              </label>
              <input
                type="time"
                value={formData.exit_time}
                onChange={(e) => handleInputChange('exit_time', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this trade..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isLoading ? 'Updating...' : 'Update Trade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
