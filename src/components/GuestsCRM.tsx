import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Guest } from '../types/hms';
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
  const { guests, reservations, formatMoney, addGuest } = useHMS();

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
      const matchId = g.idCardNumber.toLowerCase().includes(q);
      const matchEmail = g.email.toLowerCase().includes(q);
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
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@guest.com`,
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
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>New Guest Profile</span>
        </button>
      </div>

      {/* Add Guest Form */}
      {showAddGuest && (
        <form
          onSubmit={handleCreateGuest}
          className="bg-white p-5 rounded-xl border border-slate-300 shadow-md space-y-4 animate-in fade-in"
        >
          <h3 className="font-bold text-sm text-slate-900">Create New Guest Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                placeholder="e.g. Chief Bate Ayuk"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">National ID / Passport # *</label>
              <input
                type="text"
                placeholder="SW-89472610-A"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="guest@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">VIP Tier Status</label>
              <select
                value={vipTier}
                onChange={(e: any) => setVipTier(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room Preferences & Dietary Notes</label>
            <input
              type="text"
              placeholder="e.g. High floor, morning black coffee, corporate billing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddGuest(false)}
              className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guests by name, phone, national ID card #, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Guests Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.map((guest) => {
          const guestReservations = reservations.filter((r) => r.guestId === guest.id);

          return (
            <div
              key={guest.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between space-y-3 hover:border-slate-400 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{guest.fullName}</h3>
                    <div className="text-[11px] text-slate-500">{guest.nationality}</div>
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
                    <span className="truncate text-[11px]">{guest.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-[10px] uppercase">ID: {guest.idCardNumber}</span>
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
                    {guest.totalVisits} visit(s)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Total Spend</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {formatMoney(guest.totalSpent)}
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
