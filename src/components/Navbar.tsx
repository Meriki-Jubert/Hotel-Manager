import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { STAFF_USERS } from '../data/mockData';
import {
  Hotel,
  Calendar,
  Clock,
  RotateCcw,
  PlusCircle,
  Coins,
  ChevronDown,
  Moon,
  LogOut,
  Menu,
  X,
  Eye,
  ShieldCheck,
  Building
} from 'lucide-react';

interface NavbarProps {
  onOpenCheckIn: () => void;
  onOpenNightAudit: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCheckIn,
  onOpenNightAudit
}) => {
  const {
    currentUser,
    logout,
    currency,
    setCurrency,
    businessDate,
    notification,
    clearNotification,
    resetToDemoData,
    rooms,
    roomTypes,
    hotelConfig,
    canCheckIn,
    canRunAudit,
    isReadOnly,
    fastLogin,
    allowedTabs,
    activeTab,
    setActiveTab,
    branches,
    activeBranchId,
    activeBranch,
    hasMultipleActiveBranches,
    setActiveBranchId
  } = useHMS();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));
  const occupiedCount = activeRooms.filter((r) => r.status === 'occupied').length;
  const occupancyPercent = activeRooms.length > 0 ? Math.round((occupiedCount / activeRooms.length) * 100) : 0;
  const dirtyCount = activeRooms.filter((r) => r.status === 'dirty').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`px-4 py-2 text-xs sm:text-sm flex items-center justify-between transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notification.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
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

      {/* Read-Only Banner for Owner */}
      {isReadOnly && (
        <div className="bg-purple-950/80 border-b border-purple-800/60 px-4 py-1 text-center text-xs text-purple-200 flex items-center justify-center gap-2">
          <Eye className="w-3.5 h-3.5 text-purple-400" />
          <span>
            <strong>Owner Read-Only Mode:</strong> Remote executive dashboard. Booking mutations and financial overrides are restricted.
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Hotel Info */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 shrink-0">
              <Hotel className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-xs sm:text-base tracking-tight text-white truncate max-w-[120px] sm:max-w-xs md:max-w-sm">
                  {hotelConfig.name}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 truncate">
                <span className="truncate max-w-[90px] sm:max-w-none">
                  {hasMultipleActiveBranches && activeBranch && activeBranchId !== 'all'
                    ? activeBranch.city || hotelConfig.city
                    : hotelConfig.city}
                </span>
                <span className="hidden xs:inline">•</span>
                <span className="text-champagne-gold-400 font-semibold shrink-0">
                  {occupancyPercent}% Occ. ({occupiedCount}/{activeRooms.length})
                </span>
                {dirtyCount > 0 && (
                  <span className="hidden md:inline text-amber-400 font-medium">
                    • {dirtyCount} Dirty
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Center Business Status (Medium+ screens) */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-slate-300 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Date:</span>
              <strong className="text-white font-mono">{businessDate}</strong>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-emerald-400 font-medium">Single-Tenant Active</span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">

            {/* Branch Switcher (Manager & Owner only, hidden if only 1 active branch) */}
            {hasMultipleActiveBranches && (currentUser?.role === 'manager' || currentUser?.role === 'owner') && (
              <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition-colors">
                <Building className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer pr-1"
                  aria-label="Active Branch Switcher"
                >
                  {currentUser?.role === 'owner' && (
                    <option value="all" className="bg-slate-900 text-white font-medium">
                      All Branches (Consolidated)
                    </option>
                  )}
                  {branches.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white font-medium">
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assigned Branch Indicator for Staff (Cannot switch) */}
            {hasMultipleActiveBranches && (currentUser?.role === 'front_desk' || currentUser?.role === 'housekeeping') && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
                <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[130px]">{activeBranch?.name || 'Assigned Branch'}</span>
              </div>
            )}
            
            {/* Currency Switcher */}
            <button
              onClick={() => setCurrency(currency === 'FCFA' ? 'USD' : 'FCFA')}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Toggle Display Currency (FCFA / USD)"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{currency}</span>
            </button>

            {/* Quick Walk-In Check-In Button (If Front Desk or Manager) */}
            {canCheckIn && (
              <button
                onClick={onOpenCheckIn}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Check-In</span>
              </button>
            )}

            {/* Night Audit Trigger Button (Manager Only) */}
            {canRunAudit && (
              <button
                onClick={onOpenNightAudit}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 transition-colors"
                title="Run End-of-Day Night Audit & Ledger Rollover"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Night Audit</span>
              </button>
            )}

            {/* Reset Demo Data Button */}
            <button
              onClick={resetToDemoData}
              className="hidden sm:block p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset sample hotel demo data for this property"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Staff User Badge & Fast Switcher */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/40"
                  />
                  <div className="hidden xl:block text-xs leading-tight">
                    <div className="font-semibold text-white">{currentUser.name}</div>
                    <div className="text-[10px] text-emerald-400 capitalize font-medium">
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-700 text-xs">
                      <div className="text-slate-400">Current Operator:</div>
                      <div className="font-bold text-white text-sm mt-0.5">{currentUser.name}</div>
                      <div className="text-[11px] text-emerald-400 capitalize">{currentUser.title}</div>
                    </div>

                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Role Terminal:
                    </div>

                    {STAFF_USERS.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          fastLogin(user.role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-slate-700/80 transition-colors ${
                          currentUser.id === user.id ? 'bg-slate-700 text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                        <div className="text-xs">
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</div>
                        </div>
                      </button>
                    ))}

                    <div className="border-t border-slate-700 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out & Exit Terminal</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logout button */}
            {currentUser && (
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation (When open) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="text-slate-400">Allowed Staff Modules:</span>
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
              Role: {currentUser?.role.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {allowedTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg text-left font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab === 'matrix'
                  ? 'Room Matrix'
                  : tab === 'reservations'
                  ? 'Front Desk'
                  : tab === 'folios'
                  ? 'Folios & Billing'
                  : tab === 'pos'
                  ? 'Restaurant POS'
                  : tab === 'housekeeping'
                  ? 'Housekeeping'
                  : tab === 'maintenance'
                  ? 'Maintenance'
                  : tab === 'audit'
                  ? 'Night Audit'
                  : tab === 'analytics'
                  ? 'Owner BI'
                  : tab === 'guests'
                  ? 'Guest CRM'
                  : 'Property Settings'}
              </button>
            ))}
          </div>

          {canRunAudit && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenNightAudit();
              }}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Launch Night Audit Wizard</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Date: {businessDate}</span>
            <button onClick={logout} className="text-rose-400 font-bold flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
