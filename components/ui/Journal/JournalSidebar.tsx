'use client';

import {
  ChartBarIcon,
  CalendarIcon,
  ListBulletIcon,
  Cog6ToothIcon,
  HomeIcon,
  ViewColumnsIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  ChartBarIcon as ChartBarIconSolid,
  CalendarIcon as CalendarIconSolid,
  ListBulletIcon as ListBulletIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  HomeIcon as HomeIconSolid
} from '@heroicons/react/24/solid';
import type { TradingAccount } from '@/types/journal';
import ShareButton from './ShareButton';

interface JournalSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  accounts: (TradingAccount & { stats: any })[];
  selectedAccount: string | null;
  onAccountChange: (accountId: string | null) => void;
  view: 'individual' | 'combined';
  onViewChange: (view: 'individual' | 'combined') => void;
}

const sections = [
  {
    id: 'overview',
    name: 'Overview',
    icon: HomeIcon,
    iconSolid: HomeIconSolid
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid
  },
  {
    id: 'trades',
    name: 'Trades',
    icon: ListBulletIcon,
    iconSolid: ListBulletIconSolid
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: CalendarIcon,
    iconSolid: CalendarIconSolid
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid
  }
];

export default function JournalSidebar({
  currentSection,
  onSectionChange,
  accounts,
  selectedAccount,
  onAccountChange,
  view,
  onViewChange
}: JournalSidebarProps) {
  return (
    <div className="fixed left-8 top-24 w-64 bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col z-40">
      <div className="p-6 border-b border-slate-700/50">
        <h2 className="text-xl font-bold text-white">Trading Journal</h2>
        <p className="text-xs text-slate-400 mt-1">Manage your trades</p>
      </div>

      {/* Account Selection */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="mb-3">
          <button
            onClick={() => onViewChange('combined')}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'combined'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            <ViewColumnsIcon className="h-4 w-4" />
            <span>All Accounts</span>
          </button>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onViewChange('individual');
                onAccountChange(account.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                view === 'individual' && selectedAccount === account.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <UserIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{account.name}</span>
              </div>
              {account.stats && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                    account.stats.totalRR >= 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {account.stats.totalRR >= 0 ? '+' : ''}
                  {account.stats.totalRR?.toFixed(1) || '0.0'}R
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Share Button for selected account */}
        {view === 'individual' && selectedAccount && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <ShareButton
              accountId={selectedAccount}
              accountName={
                accounts.find((acc) => acc.id === selectedAccount)?.name || ''
              }
              isPublic={true}
            />
          </div>
        )}
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {sections.map((section) => {
          const Icon =
            currentSection === section.id ? section.iconSolid : section.icon;
          const isActive = currentSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{section.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
