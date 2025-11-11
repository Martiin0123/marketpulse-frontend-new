'use client';

import {
  ChartBarIcon,
  CalendarIcon,
  ListBulletIcon,
  Cog6ToothIcon,
  HomeIcon,
  ViewColumnsIcon,
  UserIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  ChartBarIcon as ChartBarIconSolid,
  CalendarIcon as CalendarIconSolid,
  ListBulletIcon as ListBulletIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  HomeIcon as HomeIconSolid,
  DocumentDuplicateIcon as DocumentDuplicateIconSolid
} from '@heroicons/react/24/solid';
import type { TradingAccount } from '@/types/journal';
import { ShareIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';
import ShareButton from './ShareButton';
import { createClient } from '@/utils/supabase/client';

// Helper function to generate account hash (same as in ShareButton)
const generateAccountHash = async (accountId: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(accountId + 'marketpulse-share');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
};

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
    id: 'copy-trade',
    name: 'Copy Trade',
    icon: DocumentDuplicateIcon,
    iconSolid: DocumentDuplicateIconSolid
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
  const [shareAccountId, setShareAccountId] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: number;
    errors: number;
    total: number;
  } | null>(null);
  const supabase = createClient();

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareRef.current &&
        !shareRef.current.contains(event.target as Node)
      ) {
        setShareAccountId(null);
      }
    };

    if (shareAccountId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [shareAccountId]);

  const handleSyncAll = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      // Get all broker connections for all accounts
      const accountIds = accounts.map((acc) => acc.id);

      if (accountIds.length === 0) {
        setSyncStatus({ success: 0, errors: 0, total: 0 });
        setIsSyncing(false);
        return;
      }

      const { data: connections, error: connError } = await supabase
        .from('broker_connections' as any)
        .select('id, trading_account_id, broker_type, broker_account_name')
        .in('trading_account_id', accountIds);

      if (connError) {
        console.error('Error fetching broker connections:', connError);
        setSyncStatus({ success: 0, errors: 1, total: 0 });
        setIsSyncing(false);
        return;
      }

      if (!connections || connections.length === 0) {
        setSyncStatus({ success: 0, errors: 0, total: 0 });
        setIsSyncing(false);
        return;
      }

      // Sync each broker connection
      let successCount = 0;
      let errorCount = 0;

      for (const connection of connections as any[]) {
        try {
          const response = await fetch(
            `/api/broker/sync?broker_connection_id=${connection.id}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(
              `Failed to sync connection ${connection.id}:`,
              await response.text()
            );
          }
        } catch (error) {
          errorCount++;
          console.error(`Error syncing connection ${connection.id}:`, error);
        }
      }

      setSyncStatus({
        success: successCount,
        errors: errorCount,
        total: connections.length
      });

      // Clear status after 3 seconds
      setTimeout(() => {
        setSyncStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error syncing accounts:', error);
      setSyncStatus({ success: 0, errors: 1, total: 0 });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed left-8 top-24 w-64 bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col z-40">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">Trading Journal</h2>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className={`p-2 rounded-lg transition-all ${
              isSyncing
                ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300'
            }`}
            title="Sync all broker accounts"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Manage your trades</p>
        {syncStatus && (
          <div
            className={`mt-2 text-xs px-2 py-1 rounded ${
              syncStatus.errors === 0
                ? 'bg-green-500/20 text-green-400'
                : syncStatus.success > 0
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}
          >
            {syncStatus.total === 0
              ? 'No broker connections found'
              : syncStatus.errors === 0
                ? `✓ Synced ${syncStatus.success}/${syncStatus.total} accounts`
                : `⚠ ${syncStatus.success}/${syncStatus.total} synced, ${syncStatus.errors} failed`}
          </div>
        )}
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
          {accounts.map((account) => {
            const isSelected =
              view === 'individual' && selectedAccount === account.id;
            return (
              <div key={account.id} className="relative group">
                <button
                  onClick={() => {
                    onViewChange('individual');
                    onAccountChange(account.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <UserIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{account.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {account.stats && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          account.stats.totalRR >= 0
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {account.stats.totalRR >= 0 ? '+' : ''}
                        {account.stats.totalRR?.toFixed(1) || '0.0'}R
                      </span>
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // If account is public, open share link directly
                        // Otherwise, open share settings modal
                        const isPublic = true; // TODO: Get from account data if we add is_public field

                        if (isPublic) {
                          // Generate share URL and open it
                          try {
                            const shareId = await generateAccountHash(
                              account.id
                            );
                            const baseUrl = window.location.origin;
                            const shareUrl = `${baseUrl}/share/${shareId}`;
                            window.open(shareUrl, '_blank');
                          } catch (error) {
                            console.error(
                              'Error generating share link:',
                              error
                            );
                            // Fallback: open share settings
                            setShareAccountId(
                              shareAccountId === account.id ? null : account.id
                            );
                          }
                        } else {
                          // Open share settings modal
                          setShareAccountId(
                            shareAccountId === account.id ? null : account.id
                          );
                        }
                      }}
                      className={`p-1 rounded hover:bg-opacity-20 transition-all ${
                        isSelected
                          ? 'text-white hover:bg-white/20'
                          : 'text-slate-400 hover:text-slate-300 hover:bg-slate-600/50'
                      }`}
                      title="Share account"
                    >
                      <ShareIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
                {/* Share dropdown for this account (only shown if not public) */}
                {shareAccountId === account.id && (
                  <div
                    ref={shareRef}
                    className="absolute right-0 top-full mt-1 z-50"
                  >
                    <ShareButton
                      id={`share-${account.id}`}
                      accountId={account.id}
                      accountName={account.name}
                      isPublic={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
