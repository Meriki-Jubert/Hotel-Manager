import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import {
  Building,
  Save,
  DollarSign,
  Sparkles,
  Percent,
  Check
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { hotelConfig, updateHotelConfig, currentUser } = useHMS();
  const isManagerOrOwner = currentUser?.role === 'manager' || currentUser?.role === 'owner';

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
  const [usdExchangeRate, setUsdExchangeRate] = useState<number | string>(hotelConfig.usdExchangeRate ?? 600);

  // --- TAX SETTINGS STATE ---
  const currentTax = hotelConfig.taxSettings || { enabled: false, label: 'VAT', ratePercent: 0 };
  const [taxEnabled, setTaxEnabled] = useState(currentTax.enabled);
  const [taxLabel, setTaxLabel] = useState(currentTax.label || 'VAT');
  const [taxRate, setTaxRate] = useState<number | string>(currentTax.ratePercent ?? 0);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [taxSavedNotice, setTaxSavedNotice] = useState(false);

  // --- PROFILE & CURRENCY NOTICES ---
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);

  const handleSaveTaxSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setTaxError(null);
    setTaxSavedNotice(false);

    if (taxEnabled) {
      if (!taxLabel.trim()) {
        setTaxError('Tax label is required (e.g. VAT, TVA, GST).');
        return;
      }
      const numRate = Number(taxRate);
      if (isNaN(numRate) || numRate < 0 || numRate > 100) {
        setTaxError('Tax rate must be between 0 and 100%.');
        return;
      }
      // Check up to 2 decimal places
      const decimals = String(taxRate).split('.')[1];
      if (decimals && decimals.length > 2) {
        setTaxError('Tax rate cannot have more than 2 decimal places.');
        return;
      }
    }

    const finalRate = taxEnabled ? Math.round(Number(taxRate) * 100) / 100 : 0;
    const res = updateHotelConfig({
      taxSettings: {
        enabled: taxEnabled,
        label: taxLabel.trim() || 'VAT',
        ratePercent: finalRate
      }
    });

    if (!res.success) {
      setTaxError(res.error || 'Failed to update tax settings.');
      setTaxSavedNotice(false);
      return;
    }

    setTaxSavedNotice(true);
    setTimeout(() => setTaxSavedNotice(false), 4000);
  };

  const handleSaveHotelProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const numRate = Number(usdExchangeRate);
    if (usdExchangeRate === '' || isNaN(numRate) || !Number.isInteger(numRate) || numRate <= 0) {
      setProfileError('USD Exchange rate must be a whole number greater than 0.');
      return;
    }

    const res = updateHotelConfig({
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
      usdExchangeRate: numRate
    });

    if (!res.success) {
      setProfileError(res.error || 'Failed to save property profile.');
      return;
    }

    setProfileSuccess('Property profile saved successfully.');
    setTimeout(() => setProfileSuccess(null), 4000);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrencyError(null);
    const newCurr = e.target.value as 'FCFA' | 'USD';
    const res = updateHotelConfig({ defaultCurrency: newCurr });
    if (!res.success) {
      setCurrencyError(res.error || 'Failed to update default currency.');
    }
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
          {profileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{profileSuccess}</span>
            </div>
          )}
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

      {/* Right Column: Currency & Taxes & Architecture */}
      <div className="lg:col-span-5 space-y-6">
        {/* Currency Configuration */}
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
            {currencyError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                {currencyError}
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Display Currency</label>
              <select
                value={hotelConfig.defaultCurrency}
                onChange={handleCurrencyChange}
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
                onChange={(e) => setUsdExchangeRate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                min="1"
                step="1"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used when converting rates and folios to USD (e.g. 600 FCFA/USD). Click "Save Property Profile" to persist.
              </p>
            </div>

            {isManagerOrOwner && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default System Language</label>
                {languageError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 mb-2 font-semibold">
                    {languageError}
                  </div>
                )}
                <select
                  value={hotelConfig.defaultLanguage || 'en'}
                  onChange={(e) => {
                    setLanguageError(null);
                    const res = updateHotelConfig({ defaultLanguage: e.target.value as 'en' | 'fr' });
                    if (!res.success) {
                      setLanguageError(res.error || 'Failed to update default language.');
                    }
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="en">English (EN)</option>
                  <option value="fr">Français (FR)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default language for new devices and unauthenticated visitor sessions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Taxes Configuration Card (Manager & Owner Only) */}
        {isManagerOrOwner && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  Taxes & Fiscal Settings
                </h3>
                <p className="text-[11px] text-slate-500">Configure tax-inclusive rate calculation on invoices</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => {
                    setTaxEnabled(e.target.checked);
                    setTaxSavedNotice(false);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              Prices are entered and charged tax-inclusive. The invoice shows the tax portion.
            </p>

            {taxError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {taxError}
              </div>
            )}

            {taxSavedNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Tax configuration saved successfully!</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Label (e.g. VAT, TVA, GST)</label>
                <input
                  type="text"
                  value={taxLabel}
                  onChange={(e) => {
                    setTaxLabel(e.target.value);
                    setTaxSavedNotice(false);
                  }}
                  disabled={!taxEnabled}
                  placeholder="VAT"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Rate (0-100%, up to 2 decimal places)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => {
                      setTaxRate(e.target.value === '' ? '' : Number(e.target.value));
                      setTaxSavedNotice(false);
                    }}
                    disabled={!taxEnabled}
                    placeholder="19.25"
                    className="w-full p-2 pr-8 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveTaxSettings}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Tax Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
