'use client';

import { useState } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';

interface AIAnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
}

export default function AIAnalyzeModal({
  isOpen,
  onClose,
  accountId,
  accountName
}: AIAnalyzeModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Fetch trades for this account
      const { data: trades, error: tradesError } = await supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (tradesError) {
        throw new Error(`Failed to fetch trades: ${tradesError.message}`);
      }

      if (!trades || trades.length === 0) {
        setAnalysis(
          'No trades found for this account. Start adding trades to get AI analysis!'
        );
        setIsAnalyzing(false);
        return;
      }

      // Call AI analysis API
      const response = await fetch('/api/chat/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Analyze these trading data for account "${accountName}": ${JSON.stringify(trades.slice(0, 20))}. Provide insights on win rate, risk management, best/worst performing trades, patterns, and recommendations for improvement.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const data = await response.json();
      setAnalysis(
        data.response || 'Analysis completed but no insights were generated.'
      );
    } catch (err) {
      console.error('Error analyzing trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze trades');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-6 w-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">
              AI Analysis - {accountName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {!analysis && !isAnalyzing && (
            <div className="text-center py-8">
              <SparklesIcon className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                AI Trading Analysis
              </h3>
              <p className="text-slate-400 mb-6">
                Get AI-powered insights into your trading performance, patterns,
                and recommendations.
              </p>
              <button
                onClick={handleAnalyze}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Start Analysis
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Analyzing Your Trades...
              </h3>
              <p className="text-slate-400">
                Our AI is examining your trading patterns and performance.
              </p>
            </div>
          )}

          {analysis && (
            <div className="bg-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Analysis Results
              </h3>
              <div className="prose prose-invert max-w-none">
                <div className="text-slate-300 whitespace-pre-wrap">
                  {analysis}
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleAnalyze}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Re-analyze
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(analysis)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Copy Analysis
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-4 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
