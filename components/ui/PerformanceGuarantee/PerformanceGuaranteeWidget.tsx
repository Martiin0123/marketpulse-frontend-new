'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar
} from 'lucide-react';

interface PerformanceGuaranteeData {
  performance: number;
  isNegative: boolean;
  isProRated: boolean;
  effectivePeriod: {
    start: string;
    end: string;
  };
  stats: {
    totalPositions: number;
    profitablePositions: number;
    winRate: string;
  };
  refundEligible: boolean;
  message: string;
}

interface Props {
  initialData?: PerformanceGuaranteeData;
}

export default function PerformanceGuaranteeWidget({ initialData }: Props) {
  const [data, setData] = useState<PerformanceGuaranteeData | null>(
    initialData || null
  );
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/performance-guarantee');
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        console.error('Error fetching performance data:', result);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestRefund = async () => {
    setRefundLoading(true);
    try {
      const response = await fetch('/api/performance-guarantee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      setRefundResult(result);
    } catch (error) {
      console.error('Error requesting refund:', error);
    } finally {
      setRefundLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">
              Performance Guarantee
            </h3>
          </div>
          <Button
            variant="slim"
            onClick={fetchPerformanceData}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Check Status'}
          </Button>
        </div>
        <p className="text-slate-400">
          Click to check your current month's performance guarantee status.
        </p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPerformance = (performance: number) => {
    const sign = performance >= 0 ? '+' : '';
    const color = performance >= 0 ? 'text-green-400' : 'text-red-400';
    return (
      <span className={color}>
        {sign}
        {performance.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">
            Performance Guarantee
          </h3>
        </div>
        <Button
          variant="slim"
          onClick={fetchPerformanceData}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Monthly Performance</span>
            {data.isNegative ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
          </div>
          <div className="text-2xl font-bold">
            {formatPerformance(data.performance)}
          </div>
          <div className="text-slate-400 text-sm mt-1">
            {data.isProRated
              ? 'Pro-rated calculation'
              : 'Full month calculation'}
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Win Rate</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {data.stats.winRate}%
          </div>
          <div className="text-slate-400 text-sm mt-1">
            {data.stats.profitablePositions}/{data.stats.totalPositions} trades
          </div>
        </div>
      </div>

      {/* Effective Period */}
      <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300 font-medium">Calculation Period</span>
        </div>
        <div className="text-sm text-slate-400">
          {formatDate(data.effectivePeriod.start)} -{' '}
          {formatDate(data.effectivePeriod.end)}
        </div>
        {data.isProRated && (
          <div className="text-xs text-blue-400 mt-1">
            Pro-rated based on your subscription start date
          </div>
        )}
      </div>

      {/* Refund Status */}
      <div className="border-t border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-white font-medium mb-1">
              {data.refundEligible ? 'Refund Eligible' : 'No Refund Needed'}
            </h4>
            <p className="text-slate-400 text-sm">{data.message}</p>
          </div>
          {data.refundEligible && (
            <Button
              variant="slim"
              onClick={requestRefund}
              disabled={refundLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {refundLoading ? 'Processing...' : 'Request Refund'}
            </Button>
          )}
        </div>

        {refundResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              refundResult.eligible
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              {refundResult.eligible ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-medium text-white">
                {refundResult.eligible
                  ? 'Refund Request Submitted'
                  : 'Refund Not Eligible'}
              </span>
            </div>
            <p className="text-sm text-slate-300">{refundResult.message}</p>
            {refundResult.note && (
              <p className="text-xs text-slate-400 mt-2">{refundResult.note}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
