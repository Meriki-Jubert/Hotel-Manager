import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, BookingStatus } from '../types/hms';
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
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FrontDeskViewProps {
  onOpenCheckIn: () => void;
  onOpenFolio: (resId: string) => void;
  onOpenCheckOut: (resId: string) => void;
}

export const FrontDeskView: React.FC<FrontDeskViewProps> = ({
  onOpenCheckIn,
  onOpenFolio,
  onOpenCheckOut
}) => {
  const { reservations, formatMoney, businessDate } = useHMS();

  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.bookingStatus !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = r.guestName.toLowerCase().includes(q);
      const matchCode = r.bookingCode.toLowerCase().includes(q);
      const matchPhone = r.guestPhone.toLowerCase().includes(q);
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone && !matchRoom) return false;
    }
    return true;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Checked In (In-House)
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Reserved (Upcoming)
          </span>
        );
      case 'checked_out':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Checked Out
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/85 backdrop-blur-xl p-4 rounded-2xl border border-champagne-gold-500/30 shadow-xl text-slate-100">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-champagne-gold-400" />
            Front Desk Reservation Roster
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Active in-house stays, expected arrivals, and historical guest records
          </p>
        </div>

        <button
          onClick={onOpenCheckIn}
          className="flex items-center gap-1.5 px-4 py-2 bg-champagne-gold-500 hover:bg-champagne-gold-600 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Walk-In / Booking</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/85 backdrop-blur-xl p-4 rounded-2xl border border-champagne-gold-500/30 shadow-xl space-y-3 text-slate-100">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Guest Name, Booking Code (BK-...), Room # or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {(['all', 'checked_in', 'reserved', 'checked_out'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'checked_in' ? 'In-House' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reservation Cards / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Booking Code</th>
                <th className="py-3 px-4">Guest Information</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Dates & Nights</th>
                <th className="py-3 px-4">Total Rate</th>
                <th className="py-3 px-4">Paid / Payment Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((res) => {
                const isDueToday = res.checkOutDate === businessDate && res.bookingStatus === 'checked_in';

                return (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{res.bookingCode}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{res.source}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{res.guestName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{res.guestPhone}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{res.roomNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{res.checkInDate} ➔ {res.checkOutDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {res.totalNights} Night(s) • Adults: {res.adults}
                      </div>
                      {isDueToday && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                          Departing Today
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatMoney(res.totalAmount)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-emerald-700">
                        {formatMoney(res.amountPaid)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-semibold">
                        {res.paymentMethod.replace('_', ' ')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(res.bookingStatus)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenFolio(res.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                          title="Open Billing Folio"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Folio</span>
                        </button>

                        {res.bookingStatus === 'checked_in' && (
                          <button
                            onClick={() => onOpenCheckOut(res.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
                            title="Check-Out Guest"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Check Out</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No reservations found matching the current search query or filter.
          </div>
        )}
      </div>
    </div>
  );
};
