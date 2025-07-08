'use client';

import { useState, useEffect } from 'react';
import Card from '../Card';
import Button from '../Button';
import { Tables } from '@/types_db';

interface Signal {
  id: string;
  symbol: string;
  type: string;
  entry_price: number;
  exit_price: number | null;
  exit_timestamp: string | null;
  pnl_percentage: number | null;
  status: string;
  created_at: string;
  exchange: string;
  signal_source: string;
  strategy_name: string;
}

interface PerformanceData {
  totalPnL: number;
  totalPositions: number;
  profitablePositions: number;
  effectiveStartDate: string;
  effectiveEndDate: string;
  isProRated: boolean;
  subscriptionStartDate: string;
  monthKey: string;
  isCurrentMonth: boolean;
  isPeriodEnded: boolean;
  signals: Signal[];
}

interface PerformanceResponse {
  performance: PerformanceData;
  isCurrentMonth: boolean;
  isEligible: boolean;
  refundAmount: number;
  refundPlan: string;
  refundCurrency: string;
  existingRefund: Tables<'performance_refunds'> | null;
  isPeriodEnded: boolean;
  requestId?: string;
  message: string;
}

interface PerformanceGuaranteeWidgetProps {
  existingRefund: Tables<'performance_refunds'> | null;
}

export default function PerformanceGuaranteeWidget() {
  const [performance, setPerformance] = useState<PerformanceResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(true);

  const checkPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/performance-guarantee');
      const data = await response.json();

      if (response.ok) {
        setPerformance(data);
        setMessage('');
      } else {
        setMessage(data.error || 'Failed to load performance data');
        setPerformance(null);
      }
    } catch (error) {
      setMessage('Error loading performance data');
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefunds = async () => {
    setRefundsLoading(true);
    try {
      const res = await fetch('/api/performance-guarantee?all_refunds=1');
      const data = await res.json();
      if (res.ok && data.refunds) {
        setRefunds(data.refunds);
      } else {
        setRefunds([]);
      }
    } catch (e) {
      setRefunds([]);
    } finally {
      setRefundsLoading(false);
    }
  };

  const requestRefund = async () => {
    if (!performance?.isEligible) return;

    try {
      setRequesting(true);
      const response = await fetch('/api/performance-guarantee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Don't pass targetMonth for default refund requests
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Refund request successful! ${data.message}`);
        // Refresh performance data and refunds
        await checkPerformance();
        await fetchRefunds();
      } else {
        setMessage(data.error || 'Failed to request refund');
      }
    } catch (error) {
      setMessage('Error requesting refund');
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    checkPerformance();
    fetchRefunds();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent mb-2">
            No Loss Guarantee
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mx-auto"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent mb-2">
            No Loss Guarantee
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="text-slate-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-slate-300 font-medium text-lg">
            No active subscription found
          </p>
          <p className="text-slate-500 mt-2">
            Subscribe to access No Loss Guarantee
          </p>
        </div>
      </div>
    );
  }

  const {
    performance: perf,
    isCurrentMonth,
    isEligible,
    refundAmount,
    refundPlan,
    refundCurrency,
    existingRefund,
    isPeriodEnded,
    requestId
  } = performance;

  const getStatusColor = () => {
    if (!isPeriodEnded) return 'border-yellow-500/30 bg-yellow-500/5';
    if (isCurrentMonth) return 'border-blue-500/30 bg-blue-500/5';
    if (isEligible) return 'border-emerald-500/30 bg-emerald-500/5';
    if (existingRefund) return 'border-purple-500/30 bg-purple-500/5';
    return 'border-slate-700';
  };

  const getStatusIcon = () => {
    if (!isPeriodEnded) return '⏳';
    if (isCurrentMonth) return '📊';
    if (isEligible) return '💰';
    if (existingRefund) return '✅';
    return '📈';
  };

  // Find approved refund for this month
  const approvedRefundForThisMonth = refunds.find(
    (r) => r.status === 'approved' && r.month_key === perf.monthKey
  );

  return (
    <>
      {/* Approved Refund Message for This Month (hide widget if present) */}
      {approvedRefundForThisMonth ? (
        <div className="mt-8 p-6 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-center text-xl font-bold shadow-lg">
          ✅ Refund Approved!
          <br />
          <span className="text-3xl text-emerald-300">
            ${approvedRefundForThisMonth.refund_amount?.toFixed(2)}
          </span>
          <span className="ml-2 text-lg text-emerald-200">
            {approvedRefundForThisMonth.plan || ''}
          </span>
          <div className="text-slate-300 mt-2">
            for {approvedRefundForThisMonth.month_key}
          </div>
        </div>
      ) : (
        <>
          {/* Main Widget */}
          <div
            className={`w-full bg-slate-800/50 backdrop-blur-sm border rounded-xl shadow-2xl ${getStatusColor()}`}
          >
            <div className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent mb-2">
                  <span className="mr-2">{getStatusIcon()}</span>
                  No Loss Guarantee
                </h3>
              </div>

              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      !isPeriodEnded
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : isCurrentMonth
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : isEligible
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : existingRefund
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {!isPeriodEnded
                      ? 'Period Active'
                      : isCurrentMonth
                        ? 'Current Month'
                        : isEligible
                          ? `Eligible for ${refundPlan} Refund`
                          : existingRefund
                            ? 'Refund Processed'
                            : 'No Refund Available'}
                  </span>
                </div>

                {/* Performance Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-700/30 rounded-xl border border-slate-600/50">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      ${perf.totalPnL.toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-400">Total P&L</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {perf.totalPositions}
                    </div>
                    <div className="text-sm text-slate-400">Signals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {perf.totalPositions > 0
                        ? (
                            (perf.profitablePositions / perf.totalPositions) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-slate-400">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white mb-1">
                      {perf.isProRated ? 'Pro-rated' : 'Full'}
                    </div>
                    <div className="text-sm text-slate-400">Period</div>
                  </div>
                </div>

                {/* Calculation Period */}
                <div className="bg-slate-700/30 p-6 rounded-xl border border-slate-600/50">
                  <div className="text-center">
                    <span className="text-slate-300 font-medium text-sm">
                      Calculation Period:
                    </span>
                    <div className="mt-2 text-white font-semibold text-lg">
                      {new Date(perf.effectiveStartDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }
                      )}{' '}
                      -{' '}
                      {new Date(perf.effectiveEndDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }
                      )}
                    </div>
                    {perf.isProRated && (
                      <div className="text-sm text-cyan-400 mt-2 flex items-center justify-center">
                        <span className="mr-1">⚡</span>
                        Pro-rated based on subscription start date
                      </div>
                    )}
                  </div>
                </div>

                {/* Refund Amount */}
                {refundAmount > 0 && (
                  <div className="bg-emerald-500/10 p-6 rounded-xl border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-emerald-400 font-medium text-lg">
                          Refund Amount
                        </div>
                        <div className="text-emerald-500/70 text-sm">
                          {refundPlan
                            ? `${refundPlan} subscription fee`
                            : 'Available for processing'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-400">
                          ${refundAmount.toFixed(2)}
                        </div>
                        {refundPlan && (
                          <div className="text-sm text-emerald-500/70">
                            {refundCurrency.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Refund Request Status */}
                {requestId && (
                  <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/30">
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-400 text-xl">📋</span>
                      <div className="flex-1">
                        <div className="text-blue-400 font-medium text-lg">
                          Refund Request Submitted
                        </div>
                        <div className="text-blue-500/70 text-sm">
                          ID: {requestId}
                        </div>
                        <div className="text-blue-500/70 text-sm mt-1">
                          Your request is under review
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signals List */}
                {perf.signals && perf.signals.length > 0 ? (
                  <div className="bg-slate-700/30 p-6 rounded-xl border border-slate-600/50">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-white mb-2">
                        📊 Signals During Period ({perf.signals.length})
                      </h4>
                      <p className="text-sm text-slate-400">
                        All signals that were entered and closed during the
                        calculation period
                      </p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {perf.signals.map((signal) => (
                        <div
                          key={signal.id}
                          className={`p-4 rounded-lg border ${
                            signal.pnl_percentage && signal.pnl_percentage > 0
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : signal.pnl_percentage &&
                                  signal.pnl_percentage < 0
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-slate-600/30 border-slate-600/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg font-bold text-white">
                                  {signal.symbol}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    signal.type === 'buy'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}
                                >
                                  {signal.type.toUpperCase()}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {signal.exchange}
                                </span>
                              </div>

                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-400">Entry:</span>
                                  <span className="text-white ml-1">
                                    ${signal.entry_price.toFixed(2)}
                                  </span>
                                </div>

                                {signal.exit_price && (
                                  <div>
                                    <span className="text-slate-400">
                                      Exit:
                                    </span>
                                    <span className="text-white ml-1">
                                      ${signal.exit_price.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                <div>
                                  <span className="text-slate-400">
                                    Strategy:
                                  </span>
                                  <span className="text-white ml-1">
                                    {signal.strategy_name}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400">
                                    Status:
                                  </span>
                                  <span
                                    className={`ml-1 ${
                                      signal.status === 'closed'
                                        ? 'text-emerald-400'
                                        : signal.status === 'active'
                                          ? 'text-yellow-400'
                                          : 'text-slate-400'
                                    }`}
                                  >
                                    {signal.status}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-slate-500">
                                {new Date(signal.created_at).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                                )}
                                {signal.exit_timestamp && (
                                  <span className="ml-2">
                                    →{' '}
                                    {new Date(
                                      signal.exit_timestamp
                                    ).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {signal.pnl_percentage !== null && (
                              <div className="text-right">
                                <div
                                  className={`text-lg font-bold ${
                                    signal.pnl_percentage > 0
                                      ? 'text-emerald-400'
                                      : signal.pnl_percentage < 0
                                        ? 'text-red-400'
                                        : 'text-slate-400'
                                  }`}
                                >
                                  {signal.pnl_percentage > 0 ? '+' : ''}
                                  {signal.pnl_percentage.toFixed(2)}%
                                </div>
                                <div className="text-xs text-slate-400">
                                  P&L
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Stats */}
                    <div className="mt-4 pt-4 border-t border-slate-600/50">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-white">
                            {
                              perf.signals.filter(
                                (s) => s.pnl_percentage && s.pnl_percentage > 0
                              ).length
                            }
                          </div>
                          <div className="text-xs text-emerald-400">
                            Winners
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">
                            {
                              perf.signals.filter(
                                (s) => s.pnl_percentage && s.pnl_percentage < 0
                              ).length
                            }
                          </div>
                          <div className="text-xs text-red-400">Losers</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">
                            {
                              perf.signals.filter(
                                (s) => s.pnl_percentage === null
                              ).length
                            }
                          </div>
                          <div className="text-xs text-slate-400">Pending</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-700/30 p-6 rounded-xl border border-slate-600/50">
                    <div className="text-center py-8">
                      <div className="text-slate-400 mb-4">
                        <svg
                          className="w-12 h-12 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <p className="text-slate-300 font-medium text-lg">
                        No Signals During Period
                      </p>
                      <p className="text-slate-500 mt-2">
                        No signals were entered and closed during this
                        calculation period
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Message */}
                <div
                  className={`p-4 rounded-xl text-sm ${
                    !isPeriodEnded
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                      : isCurrentMonth
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : isEligible
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : existingRefund
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {performance.message}
                </div>

                {/* Action Button */}
                {isEligible &&
                  !isCurrentMonth &&
                  isPeriodEnded &&
                  !existingRefund &&
                  !requestId && (
                    <div className="text-center">
                      <Button
                        onClick={requestRefund}
                        disabled={requesting}
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        {requesting ? (
                          <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Submitting Request...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <span className="text-xl">💰</span>
                            <span>Request Refund</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  )}

                {/* Period Not Ended Notice */}
                {!isPeriodEnded && (
                  <div className="text-center py-4">
                    <div className="text-sm text-yellow-400 bg-yellow-500/10 px-4 py-3 rounded-xl border border-yellow-500/30">
                      <span className="font-medium text-lg">
                        ⏰ Period Active
                      </span>
                      <div className="mt-2">
                        Check back after{' '}
                        {new Date(perf.effectiveEndDate).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Refund Success Message */}
          {refunds.length > 0 && refunds[0].status === 'pending' && (
            <div className="mt-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-lg font-semibold">
              🎉 Your refund request for {refunds[0].month_key} is being
              processed!
            </div>
          )}

          {/* Refunds Table */}
          <div className="mt-10">
            <h4 className="text-xl font-bold text-white mb-4">
              Refund History
            </h4>
            {refundsLoading ? (
              <div className="text-slate-400">Loading refunds...</div>
            ) : refunds.length === 0 ? (
              <div className="text-slate-400">No refund requests yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-slate-800/70 rounded-xl border border-slate-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-slate-300">
                        Month
                      </th>
                      <th className="px-4 py-2 text-left text-slate-300">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-slate-300">
                        Plan
                      </th>
                      <th className="px-4 py-2 text-left text-slate-300">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-slate-300">
                        Requested At
                      </th>
                      <th className="px-4 py-2 text-left text-slate-300">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((r) => (
                      <tr key={r.id} className="border-t border-slate-700">
                        <td className="px-4 py-2 text-white font-mono">
                          {r.month_key}
                        </td>
                        <td className="px-4 py-2 text-emerald-400 font-semibold">
                          ${r.refund_amount?.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-slate-300">
                          {r.plan || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              r.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : r.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : r.status === 'rejected'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            {r.status.charAt(0).toUpperCase() +
                              r.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-400 max-w-xs truncate">
                          {r.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
