'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import type { TradingAccount } from '@/types/journal';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: TradingAccount) => void;
}

export default function CreateAccountModal({
  isOpen,
  onClose,
  onAccountCreated
}: CreateAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    initial_balance: '',
    risk_per_trade: '1'
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

      // For now, create a mock account until the migration is run
      // TODO: Uncomment when trading_accounts table is created
      // const { data, error: insertError } = await supabase
      //   .from('trading_accounts')
      //   .insert({
      //     user_id: user.id,
      //     name: formData.name,
      //     currency: formData.currency,
      //     initial_balance: parseFloat(formData.initial_balance),
      //     risk_per_trade: parseFloat(formData.risk_per_trade)
      //   })
      //   .select()
      //   .single();

      // if (insertError) throw insertError;

      const data: TradingAccount = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: formData.name,
        currency: formData.currency,
        initial_balance: parseFloat(formData.initial_balance),
        risk_per_trade: parseFloat(formData.risk_per_trade),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onAccountCreated(data);
      setFormData({
        name: '',
        currency: 'USD',
        initial_balance: '',
        risk_per_trade: '1'
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Create New Account
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Account Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Main Trading Account"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
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
              value={formData.initial_balance}
              onChange={(e) =>
                setFormData({ ...formData, initial_balance: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Risk Per Trade (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={formData.risk_per_trade}
              onChange={(e) =>
                setFormData({ ...formData, risk_per_trade: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1"
              required
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
