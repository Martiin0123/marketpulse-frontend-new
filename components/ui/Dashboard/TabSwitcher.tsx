'use client';

import { useState } from 'react';
import { Activity, TrendingUp, BarChart3, Shield } from 'lucide-react';

interface TabSwitcherProps {
  activeTab: 'overview' | 'signals' | 'positions' | 'performance-guarantee';
  onTabChange: (
    tab: 'overview' | 'signals' | 'positions' | 'performance-guarantee'
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
      id: 'positions' as const,
      label: 'Positions',
      icon: <Activity className="w-4 h-4" />
    },
    {
      id: 'performance-guarantee' as const,
      label: 'Performance Guarantee',
      icon: <Shield className="w-4 h-4" />
    }
  ];

  return (
    <div className="flex bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-slate-700/50 mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
            activeTab === tab.id
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
