import React, { useState, useEffect } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { tPaymentMethod, tBookingSource } from '../i18n/labels';
import { Room, PaymentMethod } from '../types/hms';
import { getNextLocalDateString } from '../utils/dateUtils';
import {
  X,
  UserCheck,
  Calendar,
  CreditCard,
  Phone,
  FileText,
  DollarSign,
  Sparkles,
  Building,
  CheckCircle2,
  AlertCircle,
  BookmarkCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface CheckInModalProps {
  initialRoom?: Room | null;
  onClose: () => void;
  onSuccess: (resId: string) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  initialRoom,
  onClose,
  onSuccess
}) => {
  const { t, formatDate } = useT();
  const {
    rooms,
    roomTypes,
    checkInGuest,
    createReservation,
    businessDate,
    formatMoney,
    guests,
    currentUser,
    setActiveTab
  } = useHMS();

  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));

  // Find all available active rooms
  const availableRooms = activeRooms.filter(
    (r) => r.status === 'available' || (initialRoom && r.id === initialRoom.id)
  );

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    initialRoom ? initialRoom.id : availableRooms[0]?.id || ''
  );

  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('+237 ');
  const [email, setEmail] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [nationality, setNationality] = useState('Cameroonian');
  const [checkInDate, setCheckInDate] = useState(businessDate);
  
  // Default check-out tomorrow
  const [checkOutDate, setCheckOutDate] = useState(getNextLocalDateString(businessDate));

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [source, setSource] = useState<'Walk-In' | 'Phone' | 'Direct Website' | 'OTA - Booking.com' | 'Corporate'>('Walk-In');
  const [specialRequests, setSpecialRequests] = useState('');
  const [selectedExistingGuestId, setSelectedExistingGuestId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute stay duration and cost
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const start = new Date(checkInDate).getTime();
  const end = new Date(checkOutDate).getTime();
  const totalNights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  const totalRate = selectedRoom ? selectedRoom.pricePerNight * totalNights : 0;

  // Auto-fill amount paid to total or 50% deposit
  useEffect(() => {
    if (totalRate > 0 && amountPaid === 0) {
      setAmountPaid(totalRate); // default full payment
    }
  }, [totalRate]);

  // Handle picking an existing guest
  const handleSelectExistingGuest = (guestId: string) => {
    setSelectedExistingGuestId(guestId);
    if (!guestId) return;
    const g = guests.find((item) => item.id === guestId);
    if (g) {
      setGuestName(g.fullName);
      setPhone(g.phone);
      setEmail(g.email);
      setIdCardNumber(g.idCardNumber);
      setNationality(g.nationality);
    }
  };

  const isFutureArrival = checkInDate > businessDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedRoomId) {
      setErrorMsg(t('checkInModal.valErrRoom'));
      return;
    }
    if (!guestName.trim()) {
      setErrorMsg(t('checkInModal.valErrName'));
      return;
    }
    if (!phone.trim() || phone.trim() === '+237') {
      setErrorMsg(t('checkInModal.valErrPhone'));
      return;
    }
    if (!idCardNumber.trim()) {
      setErrorMsg(t('checkInModal.valErrId'));
      return;
    }

    if (isFutureArrival) {
      // Future Arrival Valve: Routed to createReservation so room is NOT occupied prematurely!
      const targetRoom = rooms.find((r) => r.id === selectedRoomId);
      const res = createReservation({
        guestName,
        phone,
        email,
        idCardNumber,
        nationality,
        roomTypeId: targetRoom?.roomTypeId || '',
        roomId: selectedRoomId,
        checkInDate,
        checkOutDate,
        adults,
        children,
        depositAmount: Number(amountPaid),
        depositMethod: paymentMethod,
        source,
        specialRequests
      });

      if (res.success && res.reservationId) {
        onSuccess(res.reservationId);
      } else {
        setErrorMsg(res.error || 'Failed to create reservation.');
      }
      return;
    }

    // Immediate Check-In (today)
    const res = checkInGuest({
      guestName,
      phone,
      email,
      idCardNumber,
      nationality,
      roomId: selectedRoomId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      paymentMethod,
      amountPaid: Number(amountPaid),
      source,
      specialRequests
    });

    if (res.success && res.reservationId) {
      onSuccess(res.reservationId);
    } else {
      setErrorMsg(res.error || 'Failed to complete check-in.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Modal Header - pinned at top */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isFutureArrival ? 'bg-champagne-gold-500/20 text-champagne-gold-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isFutureArrival ? <BookmarkCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isFutureArrival ? t('checkInModal.futureTitle') : t('checkInModal.expressTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {isFutureArrival
                  ? t('checkInModal.futureSubtitle', { date: formatDate(checkInDate), today: formatDate(businessDate) })
                  : t('checkInModal.expressSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {availableRooms.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4 overflow-y-auto flex-1">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">{t('checkInModal.noRoomsTitle')}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {activeRooms.length === 0
                  ? t('checkInModal.noRoomsDescEmpty')
                  : t('checkInModal.noRoomsDesc')}
              </p>
            </div>
            <div className="pt-2">
              {currentUser?.role === 'manager' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveTab('settings');
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:scale-[1.02]"
                >
                  {t('checkInModal.openInventory')}
                </button>
              ) : (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-semibold inline-block border border-slate-200">
                  {t('checkInModal.askManager')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Room Selection & Dates */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> {t('checkInModal.roomAndDates')}
                </span>
                {selectedRoom && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {t('checkInModal.perNight', { rate: formatMoney(selectedRoom.pricePerNight) })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.roomAssigned')}
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                    required
                  >
                    {availableRooms.map((r) => {
                      const rType = roomTypes.find((t) => t.id === r.roomTypeId);
                      return (
                        <option key={r.id} value={r.id} className="text-slate-900 font-semibold">
                          {t('checkInModal.roomOption', { number: r.roomNumber, type: rType?.name || 'Standard', floor: r.floor })}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.checkInDate')}
                  </label>
                  <input
                    type="date"
                    min={businessDate}
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-semibold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.checkOutDate')}
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={checkInDate || businessDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Check-In Valve Blocker Banner */}
              {isFutureArrival && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950">
                      {t('checkInModal.valveHeader', { date: formatDate(checkInDate) })}
                    </p>
                    <p className="text-amber-800 leading-relaxed">
                      {t('checkInModal.valveBody', { date: formatDate(checkInDate), today: formatDate(businessDate) })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>
                    {t('checkInModal.stayDuration', { nights: totalNights })}
                  </span>
                  <span>
                    {t('checkInModal.sourceLabel')}
                    <select
                      value={source}
                      onChange={(e: any) => setSource(e.target.value)}
                      className="ml-1.5 text-xs font-semibold border border-slate-200 rounded px-2 py-0.5 bg-slate-50 text-slate-900"
                    >
                      <option value="Walk-In" className="text-slate-900">{tBookingSource(t, 'Walk-In')}</option>
                      <option value="Phone" className="text-slate-900">{tBookingSource(t, 'Phone')}</option>
                      <option value="WhatsApp" className="text-slate-900">{tBookingSource(t, 'WhatsApp')}</option>
                      <option value="Direct Website" className="text-slate-900">{tBookingSource(t, 'Direct Website')}</option>
                      <option value="OTA - Booking.com" className="text-slate-900">{tBookingSource(t, 'OTA - Booking.com')}</option>
                      <option value="Corporate" className="text-slate-900">{tBookingSource(t, 'Corporate')}</option>
                      <option value="Agency" className="text-slate-900">{tBookingSource(t, 'Agency')}</option>
                    </select>
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-slate-500 text-[11px] block">{t('checkInModal.estTotal')}</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    {formatMoney(totalRate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest Identity Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> {t('checkInModal.guestInfoHeading')}
                </span>
                {guests.length > 0 && (
                  <select
                    value={selectedExistingGuestId}
                    onChange={(e) => handleSelectExistingGuest(e.target.value)}
                    className="text-xs bg-slate-100 text-slate-800 font-semibold px-2 py-1 rounded border border-slate-200 focus:outline-none"
                  >
                    <option value="">{t('checkInModal.lookupReturning')}</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.fullName} ({g.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.fullName')}
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t('checkInModal.namePlaceholder')}
                    className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.phone')}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('checkInModal.phonePlaceholder')}
                    className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 font-mono placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.idCard')}
                  </label>
                  <input
                    type="text"
                    value={idCardNumber}
                    onChange={(e) => setIdCardNumber(e.target.value)}
                    placeholder={t('checkInModal.idPlaceholder')}
                    className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 font-mono placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.nationality')}
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder={t('checkInModal.nationalityPlaceholder')}
                    className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('checkInModal.emailPlaceholder')}
                    className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 placeholder-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('checkInModal.adults')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('checkInModal.children')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Collection */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> {t('checkInModal.paymentHeading')}
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.paymentMethod')}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'momo', label: tPaymentMethod(t, 'momo'), color: 'bg-yellow-400 text-yellow-950 font-bold' },
                      { id: 'orange_money', label: tPaymentMethod(t, 'orange_money'), color: 'bg-orange-500 text-white font-bold' },
                      { id: 'cash', label: tPaymentMethod(t, 'cash'), color: 'bg-emerald-600 text-white font-bold' },
                      { id: 'card', label: tPaymentMethod(t, 'card'), color: 'bg-blue-600 text-white font-bold' },
                      { id: 'bank_transfer', label: tPaymentMethod(t, 'bank_transfer'), color: 'bg-indigo-600 text-white font-bold' }
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                        className={`px-2 py-1.5 rounded-lg text-xs transition-all border ${
                          paymentMethod === pm.id
                            ? `${pm.color} border-transparent shadow-xs scale-[1.02]`
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('checkInModal.amountReceived')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="w-full text-sm font-bold font-mono pl-3 pr-20 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAmountPaid(totalRate)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold"
                      >
                        {t('checkInModal.fullBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPaid(Math.round(totalRate / 2))}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold"
                      >
                        {t('checkInModal.btn50')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountPaid(0)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold"
                      >
                        {t('checkInModal.btn0')}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] mt-1 text-slate-500">
                    <span>{t('checkInModal.balanceDueCheckout')}</span>
                    <strong className="font-mono text-slate-800">
                      {formatMoney(Math.max(0, totalRate - amountPaid))}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('checkInModal.specialRequests')}
              </label>
              <input
                type="text"
                placeholder={t('checkInModal.specialRequestsPlaceholder')}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 placeholder-slate-400"
              />
            </div>

            {/* Form Actions - sticky bottom */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isFutureArrival
                    ? 'bg-champagne-gold-500 hover:bg-champagne-gold-400 text-slate-950 shadow-champagne-gold-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/20'
                }`}
              >
                {isFutureArrival ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>{t('checkInModal.submitAdvance', { date: formatDate(checkInDate) })}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('checkInModal.submitExpress')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
