import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation } from '../types/hms';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  Receipt,
  Search,
  User,
  CreditCard,
  Building,
  Calendar,
  Printer,
  PlusCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { getFolioTotals } from '../utils/folio';

interface FoliosListViewProps {
  onOpenFolio: (resId: string) => void;
  onOpenCheckOut: (resId: string) => void;
}

export const FoliosListView: React.FC<FoliosListViewProps> = ({ onOpenFolio, onOpenCheckOut }) => {
  const { reservations, transactions, formatMoney, activeBranchId } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName="Guest Folios & Invoicing" />;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'unsettled' | 'settled'>('all');

  const folioList = reservations.map((res) => {
    const totals = getFolioTotals(transactions, res.id);
    return {
      reservation: res,
      totals
    };
  });

  const filtered = folioList.filter(({ reservation, totals }) => {
    if (filterBalance === 'unsettled' && totals.balance === 0) return false;
    if (filterBalance === 'settled' && totals.balance !== 0) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = reservation.guestName.toLowerCase().includes(q);
      const matchCode = reservation.bookingCode.toLowerCase().includes(q);
      const matchRoom = reservation.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchRoom) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-2xl p-4 rounded-2xl border border-champagne-gold-500/50 shadow-2xl text-slate-100">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-champagne-gold-400" />
            Guest Master Folios & Billing Center
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Single-ledger guest accounting, tax invoices, and real-time room charges
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/50 backdrop-blur-2xl p-4 rounded-2xl border border-champagne-gold-500/50 shadow-2xl space-y-3 text-slate-100">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Guest Name, Folio # (BK-...), or Room #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            {(['all', 'unsettled', 'settled'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterBalance(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterBalance === mode
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mode === 'unsettled' ? 'Pending Balance' : mode === 'settled' ? 'Settled (0)' : 'All Folios'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Folios Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Folio / Code</th>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Stay Dates</th>
                <th className="py-3 px-4 text-right">Total Debit</th>
                <th className="py-3 px-4 text-right">Total Credit (Paid)</th>
                <th className="py-3 px-4 text-right">Net Balance Due</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(({ reservation: res, totals }) => (
                <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900">{res.bookingCode}</span>
                    <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5 mt-0.5">
                      {res.bookingStatus === 'cancelled' ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Cancelled
                        </span>
                      ) : (
                        <span>{res.bookingStatus.replace('_', ' ')}</span>
                      )}
                    </div>
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

                  <td className="py-3 px-4 text-slate-600">
                    <div>{res.checkInDate} to {res.checkOutDate}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{res.totalNights} nights</div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatMoney(totals.charges)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    {formatMoney(totals.netPaid)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        totals.balance < 0
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : totals.balance > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {totals.balance < 0
                        ? `Credit: ${formatMoney(Math.abs(totals.balance))}`
                        : totals.balance > 0
                        ? formatMoney(totals.balance)
                        : '0 FCFA Settled'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenFolio(res.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 ml-auto"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Manage Folio</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No folios matching the criteria.
          </div>
        )}
      </div>
    </div>
  );
};
