import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState('10000');
  const [currency, setCurrency] = useState('USD');
  const [riskPerTrade, setRiskPerTrade] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('trading_accounts')
        .insert({
          user_id: user.id,
          name,
          description,
          initial_balance: parseFloat(initialBalance),
          currency,
          risk_per_trade: parseFloat(riskPerTrade)
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('No data returned');

      onAccountCreated(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-6">
          Create Trading Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-400"
            >
              Account Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-400"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="balance"
                className="block text-sm font-medium text-slate-400"
              >
                Initial Balance
              </label>
              <input
                type="number"
                id="balance"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-slate-400"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="risk"
              className="block text-sm font-medium text-slate-400"
            >
              Risk per Trade (%)
            </label>
            <input
              type="number"
              id="risk"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(e.target.value)}
              min="0.01"
              max="100"
              step="0.01"
              className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">Error: {error}</p>}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
