import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { ProfileSettings } from './settings/ProfileSettings';
import { BranchSettings } from './settings/BranchSettings';
import { RoomTypeSettings } from './settings/RoomTypeSettings';
import { RoomSettings } from './settings/RoomSettings';
import { StaffSettings } from './settings/StaffSettings';
import { CancellationPolicySettings } from './settings/CancellationPolicySettings';
import { MenuSettings } from './settings/MenuSettings';
import {
  Settings,
  Building,
  GitBranch,
  Layers,
  Bed,
  Users,
  Clock,
  UtensilsCrossed
} from 'lucide-react';

export const HotelSettingsView: React.FC = () => {
  const { t } = useT();
  const {
    branches,
    roomTypes,
    allRooms,
    staffUsers,
    posItems
  } = useHMS();

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'branches' | 'room_types' | 'rooms' | 'staff' | 'cancellation' | 'menu'>('profile');

  return (
    <div className="space-y-6">
      {/* Top Banner with Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            {t('settings.shellTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('settings.shellSubtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveSettingsTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'profile'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('settings.tabProfile')}</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('branches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'branches'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-teal-600" />
            <span>{t('settings.tabBranches', { count: branches.length })}</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('room_types')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'room_types'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('settings.tabRoomTypes', { count: roomTypes.length })}</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('rooms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'rooms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bed className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('settings.tabRooms', { count: allRooms.length })}</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('staff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'staff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('settings.tabStaff', { count: staffUsers.length })}</span>
          </button>
          <button
            onClick={() => setActiveSettingsTab('cancellation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'cancellation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span>{t('settings.tabCancellation')}</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('menu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'menu'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('settings.tabMenu', { count: posItems.length })}</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeSettingsTab === 'profile' && <ProfileSettings />}
      {activeSettingsTab === 'branches' && <BranchSettings />}
      {activeSettingsTab === 'room_types' && <RoomTypeSettings />}
      {activeSettingsTab === 'rooms' && (
        <RoomSettings onNavigateToRoomTypes={() => setActiveSettingsTab('room_types')} />
      )}
      {activeSettingsTab === 'staff' && <StaffSettings />}
      {activeSettingsTab === 'cancellation' && <CancellationPolicySettings />}
      {activeSettingsTab === 'menu' && <MenuSettings />}
    </div>
  );
};
