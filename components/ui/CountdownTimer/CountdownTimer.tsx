'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const targetDate = new Date('2025-08-01T23:59:59Z');

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const isExpired =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  if (isExpired) {
    return (
      <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          <span className="text-orange-200 font-semibold text-lg">
            Early Bird Discount Expired
          </span>
        </div>
        <p className="text-orange-300 text-sm">
          The early bird discount has ended. Regular pricing now applies.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-200 font-semibold text-lg">
            Early Bird Discount
          </span>
        </div>
        <p className="text-emerald-300 text-sm">
          Limited time offer - only until August 1st, 2025
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-white mb-1">
              {timeLeft.days.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-400">Days</div>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-white mb-1">
              {timeLeft.hours.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-400">Hours</div>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-white mb-1">
              {timeLeft.minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-400">Minutes</div>
          </div>
        </div>
        <div className="text-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-white mb-1">
              {timeLeft.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-400">Seconds</div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30">
          <span className="text-emerald-200 text-sm font-medium">
            🎉 Save up to 20% on Premium & VIP plans
          </span>
        </div>
      </div>
    </div>
  );
}
