import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import { useT } from '../../i18n/LanguageContext';
import { resultMessage } from '../../i18n/messages';
import {
  Building,
  Save,
  DollarSign,
  Sparkles,
  Percent,
  Check,
  Clock,
  Search,
  UserX
} from 'lucide-react';
import { getHotelNow, parseHHMM, COMMON_TIME_ZONES } from '../../utils/hotelClock';

export const ProfileSettings: React.FC = () => {
  const { t } = useT();
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
  const [timeZone, setTimeZone] = useState(hotelConfig.timeZone || 'Africa/Douala');
  const [timeZoneSearch, setTimeZoneSearch] = useState('');
  const [checkOutReminderMinutes, setCheckOutReminderMinutes] = useState<number | string>(
    typeof hotelConfig.checkOutReminderMinutes === 'number' ? hotelConfig.checkOutReminderMinutes : 30
  );
  const [autoCheckOut, setAutoCheckOut] = useState<'off' | 'settled_only'>(
    hotelConfig.autoCheckOut === 'off' ? 'off' : 'settled_only'
  );
  const [nightAuditReminderTime, setNightAuditReminderTime] = useState(
    hotelConfig.nightAuditReminderTime || '04:00'
  );
  const currentAutoNoShow = hotelConfig.autoNoShow || { enabled: true, afterDays: 0, cutoffTime: '23:59' };
  const [autoNoShowEnabled, setAutoNoShowEnabled] = useState(currentAutoNoShow.enabled !== false);
  const [autoNoShowAfterDays, setAutoNoShowAfterDays] = useState<number>(
    typeof currentAutoNoShow.afterDays === 'number' ? currentAutoNoShow.afterDays : 0
  );
  const [autoNoShowCutoffTime, setAutoNoShowCutoffTime] = useState<string>(
    currentAutoNoShow.cutoffTime || '23:59'
  );

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
        setTaxError(t('tax.errLabelRequired'));
        return;
      }
      const numRate = Number(taxRate);
      if (isNaN(numRate) || numRate < 0 || numRate > 100) {
        setTaxError(t('tax.errRateRange'));
        return;
      }
      // Check up to 2 decimal places
      const decimals = String(taxRate).split('.')[1];
      if (decimals && decimals.length > 2) {
        setTaxError(t('tax.errDecimals'));
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
      setTaxError(resultMessage(t, res, 'tax.errSaveFail'));
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
      setProfileError(t('profile.rateWholeNumberErr'));
      return;
    }

    const numReminder = Number(checkOutReminderMinutes);
    if (
      checkOutReminderMinutes === '' ||
      isNaN(numReminder) ||
      !Number.isInteger(numReminder) ||
      numReminder < 0 ||
      numReminder > 180
    ) {
      setProfileError(t('profile.errReminderRange'));
      return;
    }

    if (!parseHHMM(nightAuditReminderTime)) {
      setProfileError(t('profile.errAuditTimeFormat'));
      return;
    }

    if (autoNoShowEnabled) {
      if (!parseHHMM(autoNoShowCutoffTime)) {
        setProfileError(t('profile.errNoShowCutoffFormat'));
        return;
      }
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
      usdExchangeRate: numRate,
      timeZone,
      checkOutReminderMinutes: numReminder,
      autoCheckOut,
      nightAuditReminderTime,
      autoNoShow: {
        enabled: autoNoShowEnabled,
        afterDays: autoNoShowAfterDays,
        cutoffTime: autoNoShowCutoffTime
      }
    });

    if (!res.success) {
      setProfileError(resultMessage(t, res, 'profile.saveFail'));
      return;
    }

    setProfileSuccess(t('profile.saveSuccess'));
    setTimeout(() => setProfileSuccess(null), 4000);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrencyError(null);
    const newCurr = e.target.value as 'FCFA' | 'USD';
    const res = updateHotelConfig({ defaultCurrency: newCurr });
    if (!res.success) {
      setCurrencyError(resultMessage(t, res, 'currency.updateFail'));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Hotel Identity Form */}
      <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            {t('profile.title')}
          </h3>
          <span className="text-[11px] text-slate-400">{t('profile.singleTenant')}</span>
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
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.namePlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.tagline')}</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.taglinePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.city')}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.cityPlaceholder')}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.address')}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.addressPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.phone')}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.phonePlaceholder')}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.emailPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.taxId')}</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.taxIdPlaceholder')}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.registryNumber')}</label>
              <input
                type="text"
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={t('profile.registryNumberPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.checkInTime')}</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.checkOutTime')}</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Hotel Time Zone with search & live preview */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('profile.timeZone')}</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('profile.timeZoneSearch')}
                    value={timeZoneSearch}
                    onChange={(e) => setTimeZoneSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {COMMON_TIME_ZONES.filter((tz) =>
                    !timeZoneSearch.trim() || tz.toLowerCase().includes(timeZoneSearch.toLowerCase()) || tz === timeZone
                  ).map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              {/* Live Preview "Hotel time now: ..." under the time zone select */}
              {(() => {
                const nowPreview = getHotelNow(timeZone);
                return (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{t('profile.hotelTimeNow', { time: `${nowPreview.date} ${nowPreview.time}` })}</span>
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Departure Reminders & Automatic Check-out & Night Audit Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t('profile.checkOutReminderMinutes')}
              </label>
              <input
                type="number"
                min={0}
                max={180}
                step={1}
                value={checkOutReminderMinutes}
                onChange={(e) => setCheckOutReminderMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">{t('profile.checkOutReminderHint')}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t('profile.autoCheckOut')}
              </label>
              <select
                value={autoCheckOut}
                onChange={(e) => setAutoCheckOut(e.target.value as 'off' | 'settled_only')}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="settled_only">{t('profile.autoCheckOutSettledOnly')}</option>
                <option value="off">{t('profile.autoCheckOutOff')}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t('profile.nightAuditReminderTime')}
              </label>
              <input
                type="time"
                value={nightAuditReminderTime}
                onChange={(e) => setNightAuditReminderTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">{t('profile.nightAuditReminderHint')}</p>
            </div>
          </div>

          {/* Automatic No-Show Settings */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-rose-500" />
                  {t('profile.autoNoShowTitle')}
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('profile.autoNoShowNote')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoNoShowEnabled}
                  onChange={(e) => setAutoNoShowEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {autoNoShowEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('profile.autoNoShowAfterDays')}
                  </label>
                  <select
                    value={autoNoShowAfterDays}
                    onChange={(e) => setAutoNoShowAfterDays(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>{t('profile.autoNoShowDays0')}</option>
                    <option value={1}>{t('profile.autoNoShowDays1')}</option>
                    <option value={2}>{t('profile.autoNoShowDays2')}</option>
                    <option value={3}>{t('profile.autoNoShowDays3')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t('profile.autoNoShowCutoffTime')}
                  </label>
                  <input
                    type="time"
                    value={autoNoShowCutoffTime}
                    onChange={(e) => setAutoNoShowCutoffTime(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {/* Live sentence */}
            <p className="text-[11px] text-slate-600 font-medium italic bg-slate-100/70 p-2.5 rounded-lg border border-slate-200">
              {autoNoShowEnabled
                ? (autoNoShowAfterDays === 0
                    ? t('profile.autoNoShowLiveDay0', { time: autoNoShowCutoffTime })
                    : autoNoShowAfterDays === 1
                    ? t('profile.autoNoShowLiveDay1', { time: autoNoShowCutoffTime, days: autoNoShowAfterDays })
                    : t('profile.autoNoShowLiveDays', { time: autoNoShowCutoffTime, days: autoNoShowAfterDays }))
                : t('profile.autoNoShowDisabled')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t('profile.saveBtn')}</span>
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
                {t('currency.title')}
              </h3>
              <p className="text-[11px] text-slate-500">{t('currency.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {currencyError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                {currencyError}
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('currency.defaultDisplay')}</label>
              <select
                value={hotelConfig.defaultCurrency}
                onChange={handleCurrencyChange}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="FCFA">{t('currency.optFcfa')}</option>
                <option value="USD">{t('currency.optUsd')}</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('currency.rateLabel')}</label>
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
                {t('currency.rateHint')}
              </p>
            </div>

            {isManagerOrOwner && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('settings.defaultLanguageTitle')}</label>
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
                      setLanguageError(resultMessage(t, res, 'settings.defaultLanguageFail'));
                    }
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="en">{t('settings.langEn')}</option>
                  <option value="fr">{t('settings.langFr')}</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('settings.defaultLanguageHelp')}
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
                  {t('tax.title')}
                </h3>
                <p className="text-[11px] text-slate-500">{t('tax.subtitle')}</p>
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
              {t('tax.notice')}
            </p>

            {taxError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {taxError}
              </div>
            )}

            {taxSavedNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{t('tax.saveSuccess')}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('tax.labelField')}</label>
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
                <label className="block font-semibold text-slate-700 mb-1">{t('tax.rateField')}</label>
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
                  <span>{t('tax.saveBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-md space-y-3 text-xs">
          <div className="flex items-center gap-2 text-champagne-gold-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>{t('arch.title')}</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {t('arch.description', { name: hotelConfig.name || t('arch.defaultHotel') })}
          </p>
        </div>
      </div>
    </div>
  );
};
