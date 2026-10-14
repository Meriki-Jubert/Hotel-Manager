import React from 'react';
import { useHMS, NavTab } from '../context/HMSContext';
import {
  LayoutGrid,
  CalendarCheck2,
  Receipt,
  UtensilsCrossed,
  Sparkles,
  Wrench,
  Moon,
  BarChart3,
  Users,
  Settings
} from 'lucide-react';

interface TabItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

export const NavigationTabs: React.FC = () => {
  const { activeTab, setActiveTab, rooms, reservations, maintenanceTickets, allowedTabs } = useHMS();

  const dirtyRoomsCount = rooms.filter((r) => r.status === 'dirty' || r.status === 'cleaning').length;
  const activeReservationsCount = reservations.filter((r) => r.bookingStatus === 'checked_in').length;
  const activeTicketsCount = maintenanceTickets.filter((t) => t.status !== 'Resolved').length;

  const allTabsConfig: Record<NavTab, TabItem> = {
    matrix: {
      id: 'matrix',
      label: 'Room Matrix',
      icon: LayoutGrid,
    },
    reservations: {
      id: 'reservations',
      label: 'Front Desk',
      icon: CalendarCheck2,
      badge: activeReservationsCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-700'
    },
    folios: {
      id: 'folios',
      label: 'Folios & Billing',
      icon: Receipt,
    },
    pos: {
      id: 'pos',
      label: 'Restaurant POS',
      icon: UtensilsCrossed,
    },
    housekeeping: {
      id: 'housekeeping',
      label: 'Housekeeping',
      icon: Sparkles,
      badge: dirtyRoomsCount > 0 ? dirtyRoomsCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-700'
    },
    maintenance: {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      badge: activeTicketsCount > 0 ? activeTicketsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-700'
    },
    audit: {
      id: 'audit',
      label: 'Night Audit',
      icon: Moon,
    },
    analytics: {
      id: 'analytics',
      label: 'Executive Analytics',
      icon: BarChart3,
    },
    guests: {
      id: 'guests',
      label: 'Guest CRM',
      icon: Users,
    },
    settings: {
      id: 'settings',
      label: 'Property Settings',
      icon: Settings,
    }
  };

  // Filter only allowed tabs for current role
  const visibleTabs = allowedTabs.map((tabId) => allTabsConfig[tabId]).filter(Boolean);

  return (
    <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-emerald-500 text-slate-900' : tab.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
