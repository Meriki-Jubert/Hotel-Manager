import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, BookingStatus } from '../types/hms';
import { getFolioTotals } from '../utils/folio';
import { SelectBranchNotice } from './SelectBranchNotice';
import { NewReservationModal } from './NewReservationModal';
import { EditReservationModal } from './EditReservationModal';
import { CancelReservationModal } from './CancelReservationModal';
import { ConvertCheckInModal } from './ConvertCheckInModal';
import { ExtendStayModal } from './ExtendStayModal';
import { ShortenStayModal } from './ShortenStayModal';
import { ChangeRoomModal } from './ChangeRoomModal';
import {
  CalendarCheck2,
  Search,
  Filter,
  User,
  Phone,
  Building,
  Calendar,
  CreditCard,
  Receipt,
  LogOut,
  LogIn,
  PlusCircle,
  MinusCircle,
  Shuffle,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookmarkCheck,
  Edit,
  UserX,
  XCircle,
  ArrowRight
} from 'lucide-react';

interface FrontDeskViewProps {
  onOpenCheckIn: () => void;
  onOpenFolio: (resId: string) => void;
  onOpenCheckOut: (resId: string) => void;
}

type ReservationTab =
  | 'all'
  | 'arriving_today'
  | 'departing_today'
  | 'in_house'
  | 'upcoming'
  | 'cancelled';

export const FrontDeskView: React.FC<FrontDeskViewProps> = ({
  onOpenCheckIn,
  onOpenFolio,
  onOpenCheckOut
}) => {
  const {
    reservations,
    formatMoney,
    businessDate,
    rooms,
    roomTypes,
    currentUser,
    setActiveTab,
    activeBranchId,
    transactions
  } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName="Reservations & Front Desk" />;
  }

  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));
  const hasRooms = activeRooms.length > 0;

  // Modals state
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(null);
  const [cancelIsNoShow, setCancelIsNoShow] = useState(false);
  const [checkInReservation, setCheckInReservation] = useState<Reservation | null>(null);
  const [extendingReservation, setExtendingReservation] = useState<Reservation | null>(null);
  const [shorteningReservation, setShorteningReservation] = useState<Reservation | null>(null);
  const [movingReservation, setMovingReservation] = useState<Reservation | null>(null);

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';

  // Filters state
  const [activeTabFilter, setActiveTabFilter] = useState<ReservationTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [arrivalDateFrom, setArrivalDateFrom] = useState('');
  const [arrivalDateTo, setArrivalDateTo] = useState('');

  if (!hasRooms) {
    const isManager = currentUser?.role === 'manager';
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-2xl shadow-2xl border border-champagne-gold-500/40 p-10 sm:p-14 text-center text-slate-100 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-champagne-gold-500/20 text-champagne-gold-400 mx-auto flex items-center justify-center border border-champagne-gold-500/30">
            <CalendarCheck2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Rooms Configured</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {roomTypes.length === 0
              ? 'Your property currently has no room categories or rooms configured to take reservations.'
              : 'Add rooms to your inventory before creating reservations or checking guests in.'}
          </p>

          <div className="pt-2">
            {isManager ? (
              <button
                onClick={() => setActiveTab('settings')}
                className="px-6 py-2.5 bg-champagne-gold-500 hover:bg-champagne-gold-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-champagne-gold-500/20 transition-all hover:scale-[1.02]"
              >
                Configure Rooms in Settings
              </button>
            ) : (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 font-semibold inline-block">
                Ask your manager to add rooms
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtered reservations
  const filtered = reservations.filter((r) => {
    // 1. Tab filter
    if (activeTabFilter === 'arriving_today') {
      if (r.checkInDate !== businessDate || r.bookingStatus !== 'reserved') return false;
    } else if (activeTabFilter === 'departing_today') {
      if (r.checkOutDate !== businessDate || r.bookingStatus !== 'checked_in') return false;
    } else if (activeTabFilter === 'in_house') {
      if (r.bookingStatus !== 'checked_in') return false;
    } else if (activeTabFilter === 'upcoming') {
      if (r.bookingStatus !== 'reserved' || r.checkInDate <= businessDate) return false;
    } else if (activeTabFilter === 'cancelled') {
      if (r.bookingStatus !== 'cancelled') return false;
    }

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = r.guestName.toLowerCase().includes(q);
      const matchCode = r.bookingCode.toLowerCase().includes(q);
      const matchPhone = r.guestPhone.toLowerCase().includes(q);
      const matchRoom = (r.roomNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone && !matchRoom) return false;
    }

    // 3. Arrival date range filter
    if (arrivalDateFrom && r.checkInDate < arrivalDateFrom) return false;
    if (arrivalDateTo && r.checkInDate > arrivalDateTo) return false;

    return true;
  });

  // Calculate live tab counts
  const tabCounts = {
    all: reservations.length,
    arriving_today: reservations.filter((r) => r.checkInDate === businessDate && r.bookingStatus === 'reserved').length,
    departing_today: reservations.filter((r) => r.checkOutDate === businessDate && r.bookingStatus === 'checked_in').length,
    in_house: reservations.filter((r) => r.bookingStatus === 'checked_in').length,
    upcoming: reservations.filter((r) => r.bookingStatus === 'reserved' && r.checkInDate > businessDate).length,
    cancelled: reservations.filter((r) => r.bookingStatus === 'cancelled').length
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Checked In (In-House)
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Reserved (Upcoming)
          </span>
        );
      case 'checked_out':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Checked Out
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
            <XCircle className="w-3 h-3 text-gray-500" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-champagne-gold-500/50 shadow-2xl text-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-champagne-gold-400" />
            Reservations & Front Desk Roster
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Manage advance reservations, in-house guests, expected arrivals, and departures
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dedicated New Reservation Button */}
          <button
            onClick={() => setShowNewReservationModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-champagne-gold-500 hover:bg-champagne-gold-600 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-champagne-gold-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>New Reservation</span>
          </button>

          {/* Quick Walk-In Check-In */}
          <button
            onClick={onOpenCheckIn}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Walk-In Check-In</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-slate-900/50 backdrop-blur-2xl p-4 rounded-2xl border border-champagne-gold-500/50 shadow-2xl space-y-4 text-slate-100">
        
        {/* Quick Tabs: Arriving Today, Departing Today, In House, Upcoming, Cancelled, All */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(
            [
              { key: 'all', label: 'All Bookings', count: tabCounts.all },
              { key: 'arriving_today', label: 'Arriving Today', count: tabCounts.arriving_today, highlight: 'amber' },
              { key: 'departing_today', label: 'Departing Today', count: tabCounts.departing_today, highlight: 'indigo' },
              { key: 'in_house', label: 'In House', count: tabCounts.in_house, highlight: 'rose' },
              { key: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming, highlight: 'blue' },
              { key: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled }
            ] as const
          ).map((tab) => {
            const isSelected = activeTabFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTabFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-champagne-gold-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-slate-950 text-champagne-gold-400' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Date Range Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-slate-800">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Guest Name, Booking Code (BK-...), Room #, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 text-white placeholder-slate-400 transition-all"
            />
          </div>

          {/* Arrival Date From */}
          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">From:</span>
            <input
              type="date"
              value={arrivalDateFrom}
              onChange={(e) => setArrivalDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-800/90 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 text-white"
            />
          </div>

          {/* Arrival Date To */}
          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">To:</span>
            <input
              type="date"
              value={arrivalDateTo}
              onChange={(e) => setArrivalDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-800/90 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 text-white"
            />
            {(arrivalDateFrom || arrivalDateTo) && (
              <button
                onClick={() => {
                  setArrivalDateFrom('');
                  setArrivalDateTo('');
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reservation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Booking Code</th>
                <th className="py-3.5 px-4">Guest Details</th>
                <th className="py-3.5 px-4">Room / Category</th>
                <th className="py-3.5 px-4">Dates & Duration</th>
                <th className="py-3.5 px-4">Total Stay</th>
                <th className="py-3.5 px-4">Paid / Balance Due</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((res) => {
                const isArrivingToday = res.checkInDate === businessDate && res.bookingStatus === 'reserved';
                const isDepartingToday = res.checkOutDate === businessDate && res.bookingStatus === 'checked_in';

                // Calculate accurate folio transactions balance using shared getFolioTotals
                const totals = getFolioTotals(transactions, res.id);
                const totalCharged = totals.charges > 0 ? totals.charges : (res.bookingStatus === 'cancelled' ? (res.cancellationFee || 0) : res.totalAmount);
                const netPayments = totals.netPaid !== 0 || totals.charges > 0 ? totals.netPaid : res.amountPaid;
                const actualBalanceDue = Math.max(0, totals.balance);
                const isCredit = totals.balance < 0;

                const typeObj = roomTypes.find((t) => t.id === res.roomTypeId);

                return (
                  <tr key={res.id} className="hover:bg-slate-50/90 transition-colors">
                    {/* Booking Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-900">{res.bookingCode}</span>
                        {res.rateType === 'non_refundable' && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                            Non-refundable
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                        <span className="font-semibold">{res.source}</span>
                      </div>
                    </td>

                    {/* Guest Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{res.guestName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{res.guestPhone}</span>
                      </div>
                    </td>

                    {/* Room or Room Category */}
                    <td className="py-3.5 px-4">
                      {res.roomId ? (
                        <div>
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            #{res.roomNumber}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            {typeObj?.name || 'Standard'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Hold {typeObj?.name || 'Category'}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Room unassigned
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Dates & Duration */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-800 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{res.checkInDate}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{res.checkOutDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {res.totalNights} Night(s) • Adults: {res.adults}
                      </div>

                      {/* Arriving / Departing Badges */}
                      {isArrivingToday && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 mt-1 animate-pulse">
                          Arriving Today
                        </span>
                      )}
                      {isDepartingToday && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 mt-1">
                          Departing Today
                        </span>
                      )}
                    </td>

                    {/* Total Rate */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatMoney(res.totalAmount)}
                    </td>

                    {/* Paid & Balance Due */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs text-emerald-700 font-semibold">
                        Paid: {formatMoney(netPayments)}
                      </div>
                      <div className="mt-0.5">
                        {isCredit ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Credit: {formatMoney(netPayments - totalCharged)}
                          </span>
                        ) : actualBalanceDue > 0 ? (
                          <span className="text-[11px] font-mono font-bold text-rose-600">
                            Due: {formatMoney(actualBalanceDue)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Settled
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(res.bookingStatus)}
                      {res.bookingStatus === 'cancelled' && res.cancellationReason && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-[140px] truncate" title={res.cancellationReason}>
                          "{res.cancellationReason}"
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Check-In Action for Reserved bookings */}
                        {res.bookingStatus === 'reserved' && (
                          <button
                            onClick={() => setCheckInReservation(res)}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                            title="Check-in guest pre-filling details"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Check In</span>
                          </button>
                        )}

                        {/* Edit Booking (Reserved only) */}
                        {res.bookingStatus === 'reserved' && (
                          <button
                            onClick={() => setEditingReservation(res)}
                            className="px-2 py-1 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                            title="Edit booking dates, room or guests"
                          >
                            <Edit className="w-3 h-3 text-blue-600" />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Cancel / No-Show (Reserved only) */}
                        {res.bookingStatus === 'reserved' ? (
                          <button
                            onClick={() => {
                              setCancelIsNoShow(isArrivingToday);
                              setCancellingReservation(res);
                            }}
                            className="px-2 py-1 text-xs font-semibold bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-rose-700 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                            title="Cancel booking or record no-show"
                          >
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>Cancel</span>
                          </button>
                        ) : res.bookingStatus === 'checked_in' ? (
                          <span
                            className="px-2 py-1 text-[10px] text-slate-500 font-medium italic border border-dashed border-slate-200 rounded-lg bg-slate-50 flex items-center whitespace-nowrap"
                            title="Cannot cancel a checked-in guest. Use Check-Out to settle folio."
                          >
                            Use Check-Out instead
                          </span>
                        ) : null}

                        {/* In-House Stay Management Actions */}
                        {res.bookingStatus === 'checked_in' && (
                          <>
                            <button
                              onClick={() => setExtendingReservation(res)}
                              className="px-2 py-1 text-xs font-semibold bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-emerald-800 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                              title="Extend Stay"
                            >
                              <PlusCircle className="w-3 h-3 text-emerald-600" />
                              <span>Extend Stay</span>
                            </button>

                            {isManager && (
                              <button
                                onClick={() => setShorteningReservation(res)}
                                className="px-2 py-1 text-xs font-semibold bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 text-amber-800 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                                title="Shorten Stay (Early Departure)"
                              >
                                <MinusCircle className="w-3 h-3 text-amber-600" />
                                <span>Shorten Stay</span>
                              </button>
                            )}

                            <button
                              onClick={() => setMovingReservation(res)}
                              className="px-2 py-1 text-xs font-semibold bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-blue-800 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                              title="Change Room"
                            >
                              <Shuffle className="w-3 h-3 text-blue-600" />
                              <span>Change Room</span>
                            </button>
                          </>
                        )}

                        {/* In-House Check-Out */}
                        {res.bookingStatus === 'checked_in' && (
                          <button
                            onClick={() => onOpenCheckOut(res.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                            title="Check-Out Guest & Settle Balance"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Check Out</span>
                          </button>
                        )}

                        {/* Billing Folio */}
                        <button
                          onClick={() => onOpenFolio(res.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                          title="Open Billing Folio"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Folio</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-xs space-y-2">
            <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No reservations found matching the current criteria.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your tab selection, search keywords or date range filters.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewReservationModal && (
        <NewReservationModal
          onClose={() => setShowNewReservationModal(false)}
        />
      )}

      {editingReservation && (
        <EditReservationModal
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
        />
      )}

      {cancellingReservation && (
        <CancelReservationModal
          reservation={cancellingReservation}
          onClose={() => setCancellingReservation(null)}
        />
      )}

      {checkInReservation && (
        <ConvertCheckInModal
          reservation={checkInReservation}
          onClose={() => setCheckInReservation(null)}
        />
      )}

      {extendingReservation && (
        <ExtendStayModal
          reservation={extendingReservation}
          onClose={() => setExtendingReservation(null)}
        />
      )}

      {shorteningReservation && (
        <ShortenStayModal
          reservation={shorteningReservation}
          onClose={() => setShorteningReservation(null)}
        />
      )}

      {movingReservation && (
        <ChangeRoomModal
          reservation={movingReservation}
          onClose={() => setMovingReservation(null)}
        />
      )}
    </div>
  );
};
