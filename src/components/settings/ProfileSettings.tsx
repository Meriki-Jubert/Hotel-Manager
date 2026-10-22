import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import {
  Building,
  Save,
  DollarSign,
  Sparkles
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { hotelConfig, updateHotelConfig } = useHMS();

  // --- HOTEL PROFILE FORM STATE ---
  const [name, setName] = useState(hotelConfig.name);
  const [tagline, setTagline] = useState(hotelConfig.tagline);
  const [city, setCity] = useState(hotelConfig.city);
  const [address, setAddress] = useState(hotelConfig.address);
  const [phone, setPhone] = useState(hotelConfig.phone);
  const [email, setEmail] = useState(hotelConfig.email);
  const [taxId, setTaxId] = useState(hotelConfig.taxId);
  const [registryNumber, setRegistryNumber] = useState(hotelConfig.registryNumber);
  const [checkInTime, setCheckInTime] = useState(hotelConfig.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(hotelConfig.checkOutTime);
  const [usdExchangeRate, setUsdExchangeRate] = useState(hotelConfig.usdExchangeRate || 600);

  const handleSaveHotelProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateHotelConfig({
      name: name.trim(),
      tagline: tagline.trim(),
      city: city.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      taxId: taxId.trim(),
      registryNumber: registryNumber.trim(),
      checkInTime,
      checkOutTime,
      usdExchangeRate: Number(usdExchangeRate) || 600
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Hotel Identity Form */}
      <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            Property Identity & Official Contact Info
          </h3>
          <span className="text-[11px] text-slate-400">Single-Tenant Hotel Profile</span>
        </div>

        <form onSubmit={handleSaveHotelProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hotel Property Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. My Hotel"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Slogan</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Luxury Boutique & Suites"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Buea"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Main Street, Suite 100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reception Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. +237 600 000 000"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Reception Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. frontdesk@myhotel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax ID / NIU (Cameroon)</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. M01234567890X"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Commercial Registry (RCCM)</label>
              <input
                type="text"
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. RC/BUE/2026/B/100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Check-In Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Check-Out Time</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Property Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Currency Configuration */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Currency & USD Exchange Rate
              </h3>
              <p className="text-[11px] text-slate-500">Configure default currency and conversion rate</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Display Currency</label>
              <select
                value={hotelConfig.defaultCurrency}
                onChange={(e) => updateHotelConfig({ defaultCurrency: e.target.value as 'FCFA' | 'USD' })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="FCFA">Central African CFA Franc (FCFA)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">USD Exchange Rate (1 USD = X FCFA)</label>
              <input
                type="number"
                value={usdExchangeRate}
                onChange={(e) => setUsdExchangeRate(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used when converting rates and folios to USD (e.g. 600 FCFA/USD). Click "Save Property Profile" to persist.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-md space-y-3 text-xs">
          <div className="flex items-center gap-2 text-champagne-gold-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Single-Install Architecture</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            This deployment serves exclusively <strong>{hotelConfig.name || 'your hotel'}</strong>.
            All room categories, inventory, folios, and financial reports belong to this single property.
          </p>
        </div>
      </div>
    </div>
  );
};
