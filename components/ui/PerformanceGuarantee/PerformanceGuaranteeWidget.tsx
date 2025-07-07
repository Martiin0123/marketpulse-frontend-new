'use client';

import { useState, useEffect } from 'react';
import Card from '../Card';
import Button from '../Button';

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
}

interface PerformanceResponse {
  performance: PerformanceData;
  isCurrentMonth: boolean;
  isEligible: boolean;
  refundAmount: number;
  existingRefund: any;
  isPeriodEnded: boolean;
  requestId?: string;
  message: string;
}

export default function PerformanceGuaranteeWidget() {
  const [performance, setPerformance] = useState<PerformanceResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');

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
        // Refresh performance data
        await checkPerformance();
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

  return (
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
                    ? 'Eligible for Refund'
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
                {new Date(perf.effectiveStartDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}{' '}
                -{' '}
                {new Date(perf.effectiveEndDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
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
                    Available for processing
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  ${refundAmount.toFixed(2)}
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
                <span className="font-medium text-lg">⏰ Period Active</span>
                <div className="mt-2">
                  Check back after{' '}
                  {new Date(perf.effectiveEndDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
