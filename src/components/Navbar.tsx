import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { STAFF_USERS } from '../data/mockData';
import {
  Hotel,
  Calendar,
  Clock,
  UserCheck,
  RotateCcw,
  PlusCircle,
  Coins,
  ChevronDown,
  Moon,
  ShieldAlert,
  Bell,
  X
} from 'lucide-react';

interface NavbarProps {
  onOpenCheckIn: () => void;
  onOpenNightAudit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCheckIn, onOpenNightAudit }) => {
  const {
    currentUser,
    setCurrentUser,
    currency,
    setCurrency,
    businessDate,
    notification,
    clearNotification,
    resetToDemoData,
    rooms,
    reservations
  } = useHMS();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const occupancyPercent = Math.round((occupiedCount / rooms.length) * 100);
  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`px-4 py-2 text-sm flex items-center justify-between transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notification.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <span className="font-semibold">Notice:</span>
            <span>{notification.message}</span>
            <button
              onClick={clearNotification}
              className="ml-auto hover:bg-black/20 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Hotel Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">Grand Mountain Resort</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  HMS Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Molyko, Buea</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">
                  {occupancyPercent}% Occupancy ({occupiedCount}/{rooms.length} Rms)
                </span>
                {dirtyCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-medium">{dirtyCount} Dirty</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Center Business Status */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-300 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700/60">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Business Date:</span>
              <strong className="text-white font-mono">{businessDate}</strong>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Shift:</span>
              <span className="text-emerald-400 font-medium">Day Operations</span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Currency Switcher */}
            <button
              onClick={() => setCurrency(currency === 'FCFA' ? 'USD' : 'FCFA')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Toggle Display Currency (FCFA / USD)"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{currency}</span>
            </button>

            {/* Quick Walk-In Check-In Button */}
            <button
              onClick={onOpenCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Check-In</span>
            </button>

            {/* Night Audit Trigger Button */}
            <button
              onClick={onOpenNightAudit}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 transition-colors"
              title="Run End-of-Day Night Audit & Ledger Rollover"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Night Audit</span>
            </button>

            {/* Reset Demo Data Button */}
            <button
              onClick={resetToDemoData}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset sample hotel demo data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Staff User Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/40"
                />
                <div className="hidden xl:block text-xs leading-tight">
                  <div className="font-semibold text-white">{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-400 capitalize">{currentUser.role.replace('_', ' ')}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-700 text-xs">
                    <div className="text-slate-400">Switch Active Operator:</div>
                    <div className="font-bold text-white mt-0.5">Role-Based Access Simulation</div>
                  </div>
                  {STAFF_USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setCurrentUser(user);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 transition-colors ${
                        currentUser.id === user.id ? 'bg-slate-700 text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                      <div className="text-xs">
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{user.title} ({user.role.replace('_', ' ')})</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
