import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { STAFF_USERS } from '../data/mockData';
import { useT } from '../i18n/LanguageContext';
import { resultMessage } from '../i18n/messages';
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
  EyeOff,
  ShieldCheck,
  Building,
  KeyRound,
  Lock,
  AlertCircle,
  Bell,
  AlertTriangle,
  UserX
} from 'lucide-react';
import { isDemoMode } from '../config/appConfig';
import { useHotelNow, useTimedEvents } from '../context/HotelClockContext';
import { formatHotelDateTime, formatMinutes, parseHHMM } from '../utils/hotelClock';
import { getFolioTotals } from '../utils/folio';
import { addDaysToDateString } from '../utils/noShow';
import { Reservation } from '../types/hms';
import { ExtendStayModal } from './ExtendStayModal';
import { CheckOutModal } from './CheckOutModal';
import { GuestFolioModal } from './GuestFolioModal';
import { ReinstateNoShowModal } from './ReinstateNoShowModal';

interface NavbarProps {
  onOpenCheckIn: () => void;
  onOpenNightAudit: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCheckIn,
  onOpenNightAudit
}) => {
  const { t, lang, setLang, formatDate, formatNumber } = useT();
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
    setActiveBranchId,
    changeMyPassword,
    allReservations,
    allTransactions,
    formatMoney
  } = useHMS();

  const hotelNow = useHotelNow();
  const { reminders, overdue, desktopNotificationsEnabled, requestDesktopNotifications } = useTimedEvents();

  // Auto no-shows from last 24 hours
  const autoNoShowsRecent = allReservations.filter((res) => {
    if (!res.autoNoShow || res.bookingStatus !== 'cancelled' || !res.cancelledAt) return false;
    const cancelledDate = res.cancelledAt.split(' ')[0];
    if (cancelledDate === hotelNow.date) return true;
    const yesterday = addDaysToDateString(hotelNow.date, -1);
    if (cancelledDate === yesterday) {
      const cancelledTime = res.cancelledAt.split(' ')[1] || '00:00';
      return cancelledTime >= hotelNow.time;
    }
    return false;
  });

  const totalAlerts = reminders.length + overdue.length + autoNoShowsRecent.length;

  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [activeAlertFolioRes, setActiveAlertFolioRes] = useState<Reservation | null>(null);
  const [activeAlertExtendRes, setActiveAlertExtendRes] = useState<Reservation | null>(null);
  const [activeAlertCheckOutRes, setActiveAlertCheckOutRes] = useState<Reservation | null>(null);
  const [activeAlertReinstateRes, setActiveAlertReinstateRes] = useState<Reservation | null>(null);

  // Night audit overdue check: hotel's local date later than business date of active branch AND local time past reminder time
  const nightAuditReminderMinutes = parseHHMM(hotelConfig.nightAuditReminderTime || '04:00') ?? 240;
  const isNightAuditOverdue = hotelNow.date > businessDate && hotelNow.minutes >= nightAuditReminderMinutes;

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));
  const occupiedCount = activeRooms.filter((r) => r.status === 'occupied').length;
  const occupancyPercent = activeRooms.length > 0 ? Math.round((occupiedCount / activeRooms.length) * 100) : 0;
  const dirtyCount = activeRooms.filter((r) => r.status === 'dirty').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md no-print">
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
            <span className="font-semibold">{t('common.notice')}</span>
            <span>
              {notification.key ? t(notification.key, notification.vars) : notification.message}
            </span>
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
            {t('navbar.ownerReadOnly')}
          </span>
        </div>
      )}

      {/* Night Audit Overdue Banner */}
      {isNightAuditOverdue && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-amber-700 animate-in fade-in">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              <span>{t('navbar.auditOverdueBanner', { date: formatDate(businessDate) })}</span>
            </div>
            {(currentUser?.role === 'manager' || currentUser?.role === 'owner') && (
              <button
                type="button"
                onClick={onOpenNightAudit}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                {t('navbar.runAuditBtn')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand Logo & Hotel Info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              aria-label={t('navbar.toggleNav')}
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
                  {formatNumber(occupancyPercent)}% {t('navbar.occupancy')} ({formatNumber(occupiedCount)}/{formatNumber(activeRooms.length)})
                </span>
                {dirtyCount > 0 && (
                  <span className="hidden md:inline text-amber-400 font-medium">
                    • {formatNumber(dirtyCount)} {t('navbar.dirty')}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Center Business Status & Live Hotel Clock (Responsive, non-wrapping pill) */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-full border border-slate-700/70 whitespace-nowrap shrink-0 shadow-xs">
            <div
              className="flex items-center gap-1.5 shrink-0"
              title={`${t('navbar.businessDate')}: ${formatDate(businessDate)}`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-400 hidden xl:inline">{t('navbar.businessDate')}:</span>
              <strong className="text-white font-mono">{formatDate(businessDate)}</strong>
            </div>
            <div className="h-3.5 w-px bg-slate-700 shrink-0" />
            <div
              className="flex items-center gap-1.5 shrink-0 cursor-help"
              title={`${t('navbar.hotelTime')} (${hotelConfig.timeZone || 'Africa/Douala'}): ${formatHotelDateTime(hotelNow.date, hotelNow.time, lang)}`}
            >
              <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-slate-400 hidden xl:inline">{t('navbar.hotelTime')}:</span>
              <strong className="text-white font-mono">
                <span className="hidden 2xl:inline">{formatHotelDateTime(hotelNow.date, hotelNow.time, lang)}</span>
                <span className="2xl:hidden">{hotelNow.time}</span>
              </strong>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Branch Switcher (Manager & Owner only, hidden if only 1 active branch) */}
            {hasMultipleActiveBranches && (currentUser?.role === 'manager' || currentUser?.role === 'owner') && (
              <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition-colors shrink-0">
                <Building className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <select
                  value={activeBranchId}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer pr-1 max-w-[120px] sm:max-w-[160px] truncate"
                  aria-label={t('navbar.branchSwitcher')}
                >
                  {currentUser?.role === 'owner' && (
                    <option value="all" className="bg-slate-900 text-white font-medium">
                      {t('common.allBranches')}
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
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 shrink-0">
                <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[140px]">{activeBranch?.name || t('navbar.assignedBranch')}</span>
              </div>
            )}

            {/* Language Switcher "EN | FR" */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-label={t('settings.langEn')}
              >
                EN
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  lang === 'fr'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-label={t('settings.langFr')}
              >
                FR
              </button>
            </div>
            
            {/* Currency Switcher */}
            <button
              onClick={() => setCurrency(currency === 'FCFA' ? 'USD' : 'FCFA')}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title={t('navbar.toggleCurrency')}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{currency}</span>
            </button>

            {/* Departures Bell Icon with Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAlertsPanel(!showAlertsPanel)}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title={t('navbar.alertsTitle')}
                aria-label={t('navbar.alertsTitle')}
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center justify-center animate-pulse">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {/* Alerts Panel Dropdown */}
              {showAlertsPanel && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs">{t('navbar.alertsTitle')}</span>
                      {totalAlerts > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                          {totalAlerts}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAlertsPanel(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Desktop Notifications Toggle */}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      {desktopNotificationsEnabled
                        ? t('navbar.desktopNotifEnabled')
                        : t('navbar.enableDesktopNotif')}
                    </span>
                    {!desktopNotificationsEnabled && (
                      <button
                        type="button"
                        onClick={requestDesktopNotifications}
                        className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all cursor-pointer"
                      >
                        {t('navbar.enableDesktopNotif')}
                      </button>
                    )}
                  </div>

                  <div className="max-h-[380px] overflow-y-auto p-2 space-y-2">
                    {totalAlerts === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">
                        {t('navbar.noAlerts')}
                      </p>
                    ) : (
                      <>
                        {/* Overdue Section */}
                        {overdue.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 px-1">
                              {t('navbar.overdueSection', { count: overdue.length })}
                            </span>
                            {overdue.map((o) => {
                              const res = allReservations.find((r) => r.id === o.reservationId);
                              if (!res) return null;
                              const checkOutTime = (res as any).checkOutTime || hotelConfig.checkOutTime || '12:00';
                              return (
                                <div
                                  key={o.reservationId}
                                  className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="text-rose-950">
                                      #{res.roomNumber} - {res.guestName}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                                      {t('navbar.overdueBy', { time: formatMinutes(o.minutesOverdue) })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">
                                      {checkOutTime}
                                    </span>
                                    {o.credit > 0 ? (
                                      <span className="font-mono font-bold text-amber-700">
                                        {t('navbar.creditRefund', { amount: formatMoney(o.credit) })}
                                      </span>
                                    ) : (
                                      <span className={`font-mono font-bold ${o.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {t('navbar.balanceDue', { amount: formatMoney(o.balance) })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-rose-200/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertFolioRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer text-slate-800"
                                    >
                                      {t('navbar.openFolio')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertExtendRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer text-slate-800"
                                    >
                                      {t('navbar.extendStay')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertCheckOutRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-bold bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                                    >
                                      {t('navbar.checkOut')}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Reminders Section */}
                        {reminders.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 px-1">
                              {t('navbar.remindersSection', { count: reminders.length })}
                            </span>
                            {reminders.map((rem) => {
                              const res = allReservations.find((r) => r.id === rem.reservationId);
                              if (!res) return null;
                              const checkOutTime = (res as any).checkOutTime || hotelConfig.checkOutTime || '12:00';
                              const totals = getFolioTotals(allTransactions, res.id);
                              return (
                                <div
                                  key={rem.key}
                                  className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="text-amber-950">
                                      #{res.roomNumber} - {res.guestName}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                                      {t('navbar.inMin', { minutes: rem.minutesLeft })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">
                                      {checkOutTime}
                                    </span>
                                    <span className={`font-mono font-bold ${totals.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                      {t('navbar.balanceDue', { amount: formatMoney(totals.balance) })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-200/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertFolioRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer text-slate-800"
                                    >
                                      {t('navbar.openFolio')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertExtendRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer text-slate-800"
                                    >
                                      {t('navbar.extendStay')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertCheckOutRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-bold bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                                    >
                                      {t('navbar.checkOut')}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Auto No-Shows Section (Last 24 Hours) */}
                        {autoNoShowsRecent.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 px-1 flex items-center gap-1">
                              <UserX className="w-3 h-3" />
                              {t('navbar.autoNoShowsSection')}
                            </span>
                            {autoNoShowsRecent.map((res) => {
                              const totals = getFolioTotals(allTransactions, res.id);
                              const creditKept = totals.balance < 0 ? Math.abs(totals.balance) : Math.max(0, res.amountPaid - (res.cancellationFee || 0));
                              return (
                                <div
                                  key={res.id}
                                  className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="text-purple-950">
                                      #{res.roomNumber} - {res.guestName}
                                    </span>
                                    <span className="font-mono text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                      {res.bookingCode}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-600 font-medium">
                                      {t('navbar.noShowFeeCharged', { amount: formatMoney(res.cancellationFee || 0) })}
                                    </span>
                                    <span className="font-mono font-bold text-amber-700">
                                      {t('navbar.creditKept', { amount: formatMoney(creditKept) })}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-purple-200/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertFolioRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer text-slate-800"
                                    >
                                      {t('navbar.openFolio')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveAlertReinstateRes(res);
                                        setShowAlertsPanel(false);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded cursor-pointer flex items-center gap-1"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      {t('frontDesk.reinstateBtn')}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Walk-In Check-In Button (If Front Desk or Manager) */}
            {canCheckIn && (
              <button
                onClick={onOpenCheckIn}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t('navbar.checkIn')}</span>
              </button>
            )}

            {/* Night Audit Trigger Button (Manager Only) */}
            {canRunAudit && (
              <button
                onClick={onOpenNightAudit}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 transition-colors"
                title={t('navbar.nightAuditTooltip')}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('navbar.nightAudit')}</span>
              </button>
            )}

            {/* Reset Demo Data Button */}
            <button
              onClick={resetToDemoData}
              className="hidden sm:block p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={t('navbar.resetDemoTooltip')}
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
                      <div className="text-slate-400">{t('navbar.currentOperator')}</div>
                      <div className="font-bold text-white text-sm mt-0.5">{currentUser.name}</div>
                      <div className="text-[11px] text-emerald-400 capitalize">{currentUser.title}</div>
                    </div>

                    {isDemoMode && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t('navbar.demoRoleSwitcher')}
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
                      </>
                    )}

                    <div className="border-t border-slate-700 mt-1 pt-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          setPasswordChangeError(null);
                          setCurrentPasswordInput('');
                          setNewPasswordInput('');
                          setConfirmPasswordInput('');
                          setShowChangePasswordModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/80 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-champagne-gold-400" />
                        <span>{t('navbar.changePassword')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('navbar.logout')}</span>
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
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={t('navbar.logout')}
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
            <span className="text-slate-400">{t('navbar.allowedStaffModules')}</span>
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
              {currentUser?.role.replace('_', ' ')}
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
                  ? t('nav.matrix')
                  : tab === 'reservations'
                  ? t('nav.reservations')
                  : tab === 'folios'
                  ? t('nav.folios')
                  : tab === 'pos'
                  ? t('nav.pos')
                  : tab === 'housekeeping'
                  ? t('nav.housekeeping')
                  : tab === 'maintenance'
                  ? t('nav.maintenance')
                  : tab === 'audit'
                  ? t('nav.audit')
                  : tab === 'analytics'
                  ? t('nav.analytics')
                  : tab === 'reports'
                  ? t('nav.reports')
                  : tab === 'guests'
                  ? t('nav.guests')
                  : t('nav.settings')}
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
              <span>{t('navbar.launchAudit')}</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>{t('navbar.businessDate')}: <strong className="text-white font-mono">{formatDate(businessDate)}</strong></span>
              <span>•</span>
              <span>{t('navbar.hotelTime')}: <strong className="text-white font-mono">{hotelNow.time}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    lang === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  EN
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setLang('fr')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    lang === 'fr' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  FR
                </button>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setPasswordChangeError(null);
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                  setShowChangePasswordModal(true);
                }}
                className="text-slate-300 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-champagne-gold-400" />
                <span>{t('navbar.changePassword')}</span>
              </button>
              <button onClick={logout} className="text-rose-400 font-bold flex items-center gap-1 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('navbar.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal (Available to every authenticated user) */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-champagne-gold-500/20 text-champagne-gold-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{t('navbar.changePassword')}</h3>
                  <p className="text-[11px] text-slate-400">{currentUser?.name} ({currentUser?.username})</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPasswordChangeError(null);
                if (newPasswordInput.length < 8) {
                  setPasswordChangeError('New password must be at least 8 characters long.');
                  return;
                }
                if (newPasswordInput !== confirmPasswordInput) {
                  setPasswordChangeError('New passwords do not match. Please verify.');
                  return;
                }
                setIsChangingPassword(true);
                try {
                  const res = await changeMyPassword(currentPasswordInput, newPasswordInput);
                  if (res.success) {
                    setShowChangePasswordModal(false);
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                  } else {
                    setPasswordChangeError(resultMessage(t, res, 'navbar.errPasswordUpdate'));
                  }
                } finally {
                  setIsChangingPassword(false);
                }
              }}
              className="p-6 space-y-4"
            >
              {passwordChangeError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('navbar.currentPassword')} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('navbar.newPassword')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('navbar.confirmNewPassword')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 text-xs font-bold bg-champagne-gold-500 hover:bg-champagne-gold-400 text-slate-950 rounded-lg shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPassword ? t('navbar.updatingPassword') : t('navbar.updatePassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Panel Modals */}
      {activeAlertFolioRes && (
        <GuestFolioModal
          reservation={activeAlertFolioRes}
          onClose={() => setActiveAlertFolioRes(null)}
        />
      )}

      {activeAlertExtendRes && (
        <ExtendStayModal
          reservation={activeAlertExtendRes}
          onClose={() => setActiveAlertExtendRes(null)}
        />
      )}

      {activeAlertCheckOutRes && (
        <CheckOutModal
          reservation={activeAlertCheckOutRes}
          onClose={() => setActiveAlertCheckOutRes(null)}
          onSuccess={() => setActiveAlertCheckOutRes(null)}
          onOpenFolio={() => {
            const res = activeAlertCheckOutRes;
            setActiveAlertCheckOutRes(null);
            setActiveAlertFolioRes(res);
          }}
        />
      )}

      {activeAlertReinstateRes && (
        <ReinstateNoShowModal
          reservation={activeAlertReinstateRes}
          onClose={() => setActiveAlertReinstateRes(null)}
        />
      )}
    </header>
  );
};
