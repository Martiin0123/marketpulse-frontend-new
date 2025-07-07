'use client';

import { useState } from 'react';
import { Activity, TrendingUp, BarChart3, Shield } from 'lucide-react';

interface TabSwitcherProps {
  activeTab:
    | 'overview'
    | 'signals'
    | 'strategy-analysis'
    | 'performance-guarantee';
  onTabChange: (
    tab: 'overview' | 'signals' | 'strategy-analysis' | 'performance-guarantee'
  ) => void;
}

export default function TabSwitcher({
  activeTab,
  onTabChange
}: TabSwitcherProps) {
  const tabs = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'signals' as const,
      label: 'Signals',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: 'performance-guarantee' as const,
      label: 'No Loss Guarantee',
      icon: <Shield className="w-4 h-4" />
    }
  ];

  return (
    <div className="flex flex-wrap sm:flex-nowrap bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-slate-700/50 mb-6 sm:mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex-1 sm:flex-none ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
