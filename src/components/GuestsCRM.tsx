import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Guest } from '../types/hms';
import { getGuestStats } from '../utils/guestStats';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  Mail,
  CreditCard,
  Crown,
  FileText,
  Calendar,
  Building,
  Car
} from 'lucide-react';

export const GuestsCRM: React.FC = () => {
  const { guests, allReservations, allTransactions, formatMoney, addGuest } = useHMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showAddGuest, setShowAddGuest] = useState(false);

  // New guest inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+237 ');
  const [email, setEmail] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [nationality, setNationality] = useState('Cameroonian');
  const [vipTier, setVipTier] = useState<Guest['vipTier']>('Standard');
  const [notes, setNotes] = useState('');

  const filteredGuests = guests.filter((g) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = g.fullName.toLowerCase().includes(q);
      const matchPhone = g.phone.toLowerCase().includes(q);
      const matchId = (g.idCardNumber || '').toLowerCase().includes(q);
      const matchEmail = (g.email || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId && !matchEmail) return false;
    }
    return true;
  });

  const handleCreateGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !idCardNumber.trim()) return;

    addGuest({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || '',
      idCardNumber: idCardNumber.trim(),
      nationality: nationality.trim(),
      vipTier,
      notes: notes.trim()
    });

    setFullName('');
    setPhone('+237 ');
    setEmail('');
    setIdCardNumber('');
    setNotes('');
    setShowAddGuest(false);
  };

  const getVipBadge = (tier: Guest['vipTier']) => {
    switch (tier) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      case 'Gold':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'Silver':
        return 'bg-slate-200 text-slate-800 border-slate-300 font-semibold';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Guest Profile CRM & Guest History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Police registry records, lifetime spend, VIP tiers, and guest preferences
          </p>
        </div>

        <button
          onClick={() => setShowAddGuest(!showAddGuest)}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>New Guest Profile</span>
        </button>
      </div>

      {/* Add Guest Modal / Expandable Form */}
      {showAddGuest && (
        <form onSubmit={handleCreateGuest} className="bg-white p-5 rounded-xl border border-slate-200 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Add New Guest Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 ..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID Card / Passport # *</label>
              <input
                type="text"
                required
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="ID or Passport Number"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">VIP Tier</label>
              <select
                value={vipTier}
                onChange={(e) => setVipTier(e.target.value as Guest['vipTier'])}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold"
              >
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Preferences</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Guest preferences, room allergies, etc."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddGuest(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
            >
              Save Guest Profile
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search guests by name, phone, email, or ID number..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-xs"
        />
      </div>

      {/* Guests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.map((guest) => {
          const stats = getGuestStats(guest.id, allReservations, allTransactions);
          return (
            <div
              key={guest.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{guest.fullName}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {guest.nationality} • Added {guest.createdAt}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${getVipBadge(
                      guest.vipTier
                    )}`}
                  >
                    {guest.vipTier}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-[11px]">{guest.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate text-[11px]">
                      {guest.email ? guest.email : <span className="text-slate-400 italic">No email</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-[10px] uppercase">
                      {guest.idCardNumber ? `ID: ${guest.idCardNumber}` : <span className="text-slate-400 italic">No ID provided</span>}
                    </span>
                  </div>
                  {guest.vehicleReg && (
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-[11px]">Plate: {guest.vehicleReg}</span>
                    </div>
                  )}
                </div>

                {guest.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                    "{guest.notes}"
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Lifetime Stays</span>
                  <span className="font-bold font-mono text-slate-800">
                    {stats.visits} visit(s)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Total Spend</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {formatMoney(stats.totalSpent)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
