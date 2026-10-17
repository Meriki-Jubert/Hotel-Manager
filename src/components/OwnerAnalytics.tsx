import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Percent,
  Bed,
  CreditCard,
  Calendar,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const OwnerAnalytics: React.FC = () => {
  const {
    rooms,
    reservations,
    transactions,
    nightAuditReports,
    formatMoney,
    businessDate,
    roomTypes
  } = useHMS();

  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'audits'>('metrics');

  // Calculate live KPIs
  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));
  const totalRooms = activeRooms.length;
  const occupiedRooms = activeRooms.filter((r) => r.status === 'occupied').length;
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  const roomRevenueToday = reservations
    .filter((r) => r.bookingStatus === 'checked_in')
    .reduce((s, r) => s + r.nightlyRate, 0);

  const posRevenueToday = transactions
    .filter((t) => t.category === 'restaurant' || t.category === 'beverage' || t.category === 'laundry')
    .reduce((s, t) => s + t.amount, 0);

  const totalRevenue = roomRevenueToday + posRevenueToday;
  const adr = occupiedRooms > 0 ? roomRevenueToday / occupiedRooms : 0;
  const revPar = totalRooms > 0 ? roomRevenueToday / totalRooms : 0;

  // Breakdown by payment method
  const paymentsByMethod = transactions
    .filter((t) => t.type === 'payment')
    .reduce((acc, t) => {
      const m = t.paymentMethod || 'cash';
      acc[m] = (acc[m] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalCollected = Object.values(paymentsByMethod).reduce((s, a) => s + a, 0);

  // Revenue by room type
  const revenueByType = roomTypes.map((rt) => {
    const matchingRooms = rooms.filter((r) => r.roomTypeId === rt.id && r.status === 'occupied');
    const rev = matchingRooms.reduce((s, r) => s + r.pricePerNight, 0);
    return {
      name: rt.name,
      occupied: matchingRooms.length,
      revenue: rev
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Executive Business Intelligence & Owner Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial performance, occupancy yield, and historical audit ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('metrics')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeSubTab === 'metrics'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Real-Time KPIs
            </button>
            <button
              onClick={() => setActiveSubTab('audits')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeSubTab === 'audits'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Night Audit Archive ({nightAuditReports.length})
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'metrics' ? (
        <div className="space-y-6">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Today's Est. Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {formatMoney(totalRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>Rooms: {formatMoney(roomRevenueToday)}</span>
                <span>F&B: {formatMoney(posRevenueToday)}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Occupancy Rate</span>
                <Percent className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                {occupancyRate.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {occupiedRooms} of {totalRooms} rooms occupied in-house
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[11px]">ADR (Avg Daily Rate)</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {formatMoney(adr)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Average yield per sold room tonight
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[11px]">RevPAR</span>
                <Bed className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {formatMoney(revPar)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Total room revenue ÷ {totalRooms} available rooms
              </div>
            </div>
          </div>

          {/* Revenue Breakdown & Payment Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Payment Method Channels */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Cash Flow by Payment Gateway (MTN MoMo, Orange & Cash)
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {formatMoney(totalCollected)}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'momo', label: 'MTN Mobile Money', color: 'bg-yellow-400', amount: paymentsByMethod['momo'] || 0 },
                  { id: 'orange_money', label: 'Orange Money', color: 'bg-orange-500', amount: paymentsByMethod['orange_money'] || 0 },
                  { id: 'cash', label: 'Cash in Hand (FCFA)', color: 'bg-emerald-500', amount: paymentsByMethod['cash'] || 0 },
                  { id: 'card', label: 'Bank Card / POS', color: 'bg-blue-500', amount: paymentsByMethod['card'] || 0 },
                  { id: 'bank_transfer', label: 'Direct Wire Transfer', color: 'bg-indigo-500', amount: paymentsByMethod['bank_transfer'] || 0 }
                ].map((item) => {
                  const pct = totalCollected > 0 ? (item.amount / totalCollected) * 100 : 0;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="font-mono text-slate-900 font-bold">
                          {formatMoney(item.amount)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Category Performance */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Bed className="w-4 h-4 text-indigo-600" />
                  Room Category Revenue Contribution
                </h3>
              </div>

              <div className="space-y-3">
                {revenueByType.map((item, idx) => {
                  const pct = roomRevenueToday > 0 ? (item.revenue / roomRevenueToday) * 100 : 0;
                  return (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatMoney(item.revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{item.occupied} Room(s) Active</span>
                        <span>{pct.toFixed(1)}% of nightly yield</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Night Audit Archive View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">
              End-of-Day Night Audit Historical Reports
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Audits logged: {nightAuditReports.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Audit Date</th>
                  <th className="py-3 px-4">Occupancy %</th>
                  <th className="py-3 px-4">Gross Revenue</th>
                  <th className="py-3 px-4">ADR</th>
                  <th className="py-3 px-4">RevPAR</th>
                  <th className="py-3 px-4">Cash / MoMo Float</th>
                  <th className="py-3 px-4">Discrepancy</th>
                  <th className="py-3 px-4">Audited By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {nightAuditReports.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {audit.date}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                      {audit.occupancyRate}% ({audit.roomsOccupied}/{audit.totalRooms})
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatMoney(audit.totalGrossRevenue)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {formatMoney(audit.adr)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {formatMoney(audit.revPar)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      Cash: {formatMoney(audit.cashCollected)} | MoMo: {formatMoney(audit.momoCollected)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={
                          audit.discrepancy === 0
                            ? 'text-emerald-600'
                            : audit.discrepancy > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }
                      >
                        {audit.discrepancy === 0 ? '0 (Balanced)' : formatMoney(audit.discrepancy)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {audit.auditedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
