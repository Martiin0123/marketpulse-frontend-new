'use client';

import {
  ChartBarIcon,
  CalendarIcon,
  ListBulletIcon,
  Cog6ToothIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import {
  ChartBarIcon as ChartBarIconSolid,
  CalendarIcon as CalendarIconSolid,
  ListBulletIcon as ListBulletIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  HomeIcon as HomeIconSolid
} from '@heroicons/react/24/solid';

interface JournalSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
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
  onSectionChange
}: JournalSidebarProps) {
  return (
    <div className="fixed left-8 top-24 w-64 bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col z-40">
      <div className="p-6 border-b border-slate-700/50">
        <h2 className="text-xl font-bold text-white">Trading Journal</h2>
        <p className="text-xs text-slate-400 mt-1">Manage your trades</p>
      </div>

      <nav className="p-4 space-y-2">
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
