import React, { useState, useMemo } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { tBookingSource, tPaymentMethod, tVipTier } from '../i18n/labels';
import { Room, PaymentMethod, BookingSource } from '../types/hms';
import { getNextLocalDateString, calculateStayNights, isValidDateString } from '../utils/dateUtils';
import { checkAvailability, getAvailableRoomCount } from '../utils/availability';
import { getGuestStats } from '../utils/guestStats';
import { getCancellationPolicySummary } from '../utils/cancellationPolicy';
import {
  X,
  Calendar,
  User,
  Phone,
  Mail,
  CreditCard,
  DollarSign,
  AlertCircle,
  BookmarkCheck,
  Search,
  ShieldCheck
} from 'lucide-react';

interface NewReservationModalProps {
  onClose: () => void;
  onSuccess?: (resId: string) => void;
  initialRoom?: Room | null;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  onClose,
  onSuccess,
  initialRoom
}) => {
  const { t, formatDate, formatNumber } = useT();
  const {
    roomTypes,
    rooms,
    allRooms,
    allReservations,
    allTransactions,
    branches,
    guests,
    businessDate,
    formatMoney,
    createReservation,
    activeBranchId,
    hotelConfig
  } = useHMS();

  // Active room types in current branch
  const activeRoomTypes = roomTypes.filter((rt) => rt.isActive !== false);

  const initialTypeId = initialRoom
    ? initialRoom.roomTypeId
    : activeRoomTypes[0]?.id || '';

  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('+237 ');
  const [email, setEmail] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [nationality, setNationality] = useState('Cameroonian');

  const [checkInDate, setCheckInDate] = useState(businessDate);
  const [checkOutDate, setCheckOutDate] = useState(getNextLocalDateString(businessDate));
  const [roomTypeId, setRoomTypeId] = useState<string>(initialTypeId);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoom ? initialRoom.id : '');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rateType, setRateType] = useState<'flexible' | 'non_refundable'>('flexible');
  const [source, setSource] = useState<BookingSource>('Phone');
  const [specialRequests, setSpecialRequests] = useState('');
  
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('momo');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveBranchId = useMemo(() => {
    if (activeBranchId !== 'all') return activeBranchId;
    return branches[0]?.id || 'branch-1';
  }, [activeBranchId, branches]);

  const branchRooms = useMemo(() => {
    return allRooms.filter((r) => (r.branchId || branches[0]?.id || 'branch-1') === effectiveBranchId);
  }, [allRooms, effectiveBranchId, branches]);

  const branchReservations = useMemo(() => {
    return allReservations.filter((res) => (res.branchId || branches[0]?.id || 'branch-1') === effectiveBranchId);
  }, [allReservations, effectiveBranchId, branches]);

  // Total bookable room count using getAvailableRoomCount
  const availableRoomCount = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || !roomTypeId) return 0;
    return getAvailableRoomCount(
      effectiveBranchId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      branchRooms,
      branchReservations
    );
  }, [effectiveBranchId, roomTypeId, checkInDate, checkOutDate, branchRooms, branchReservations]);

  // Specific room dropdown options using checkAvailability
  const availableRoomsForRange = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || !roomTypeId) {
      return [];
    }
    return branchRooms.filter((room) => {
      if (room.roomTypeId !== roomTypeId || room.isActive === false) return false;
      const check = checkAvailability({
        branchId: effectiveBranchId,
        roomTypeId,
        checkInDate,
        checkOutDate,
        rooms: branchRooms,
        reservations: branchReservations,
        requestedRoomId: room.id
      });
      return check.available;
    });
  }, [effectiveBranchId, roomTypeId, checkInDate, checkOutDate, branchRooms, branchReservations]);

  // Selected room type object
  const currentRoomType = activeRoomTypes.find((rt) => rt.id === roomTypeId);

  // Selected room object (if specific room chosen)
  const currentRoom = rooms.find((r) => r.id === selectedRoomId);

  // Live Pricing
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return 1;
    return calculateStayNights(checkInDate, checkOutDate);
  }, [checkInDate, checkOutDate]);

  const nightlyRate = currentRoom ? currentRoom.pricePerNight : currentRoomType ? currentRoomType.basePrice : 0;
  const totalStayAmount = nightlyRate * nights;
  const balanceDue = Math.max(0, totalStayAmount - (depositAmount || 0));

  // Filtered repeat guest matches
  const matchedGuests = useMemo(() => {
    if (!guestSearch.trim()) return [];
    const q = guestSearch.toLowerCase();
    return guests
      .filter(
        (g) =>
          g.fullName.toLowerCase().includes(q) ||
          g.phone.toLowerCase().includes(q) ||
          g.idCardNumber.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [guests, guestSearch]);

  const handleSelectExistingGuest = (guest: (typeof guests)[0]) => {
    setSelectedGuestId(guest.id);
    setGuestName(guest.fullName);
    setPhone(guest.phone);
    setEmail(guest.email || '');
    setIdCardNumber(guest.idCardNumber || '');
    setNationality(guest.nationality || 'Cameroonian');
    setGuestSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!guestName.trim() || !phone.trim() || phone.trim() === '+237') {
      setErrorMsg(t('newRes.errNamePhoneRequired'));
      return;
    }
    if (!isValidDateString(checkInDate) || !isValidDateString(checkOutDate)) {
      setErrorMsg(t('newRes.errValidDates'));
      return;
    }
    if (checkOutDate <= checkInDate) {
      setErrorMsg(t('newRes.errCheckOutAfter'));
      return;
    }
    if (checkInDate < businessDate) {
      setErrorMsg(t('newRes.errPastDate', { date: businessDate }));
      return;
    }
    if (adults < 1) {
      setErrorMsg(t('newRes.errAdultRequired'));
      return;
    }
    if (currentRoomType && adults + children > currentRoomType.maxCapacity) {
      setErrorMsg(
        t('newRes.errCapacity', {
          total: adults + children,
          cap: currentRoomType.maxCapacity,
          type: currentRoomType.name
        })
      );
      return;
    }
    if (selectedRoomId) {
      const roomAvailable = availableRoomsForRange.some((r) => r.id === selectedRoomId);
      if (!roomAvailable) {
        setErrorMsg(t('newRes.errRoomNotAvailable'));
        return;
      }
    } else {
      if (availableRoomCount === 0) {
        setErrorMsg(t('newRes.errNoAvailability', { type: currentRoomType?.name || '' }));
        return;
      }
    }

    const res = createReservation({
      guestId: selectedGuestId || undefined,
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      idCardNumber: idCardNumber.trim() || undefined,
      nationality: nationality.trim() || undefined,
      roomTypeId,
      roomId: selectedRoomId || undefined,
      checkInDate,
      checkOutDate,
      adults,
      children,
      source,
      rateType,
      specialRequests: specialRequests.trim() || undefined,
      depositAmount: depositAmount > 0 ? depositAmount : undefined,
      depositMethod: depositAmount > 0 ? depositMethod : undefined
    });

    if (!res.success) {
      setErrorMsg(res.error || t('newRes.errFail'));
      return;
    }

    if (onSuccess && res.reservationId) {
      onSuccess(res.reservationId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-champagne-gold-500/20 text-champagne-gold-400 border border-champagne-gold-500/30">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {t('newRes.title')}
              </h2>
              <p className="text-xs text-slate-300">
                {t('newRes.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-slate-900 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* CRM Repeat Guest Search Banner */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                {t('newRes.guestLookupTitle')}
              </label>
              {selectedGuestId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuestId('');
                    setGuestName('');
                    setPhone('+237 ');
                    setEmail('');
                    setIdCardNumber('');
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  {t('newRes.clearLookup')}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder={t('newRes.searchPlaceholder')}
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
              />
              {matchedGuests.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {matchedGuests.map((g) => {
                    const stats = getGuestStats(g.id, allReservations, allTransactions);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectExistingGuest(g)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{g.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{g.phone} • {g.nationality}</div>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                          {tVipTier(t, g.vipTier)} ({t('crm.visitsCount', { count: stats.visits })})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Guest Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('newRes.fullName')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={t('newRes.fullNamePlaceholder')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('newRes.phone')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={t('newRes.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('newRes.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder={t('newRes.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('newRes.bookingSource')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as BookingSource)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 focus:bg-white font-medium"
              >
                <option value="Phone">{tBookingSource(t, 'Phone')}</option>
                <option value="WhatsApp">{tBookingSource(t, 'WhatsApp')}</option>
                <option value="Walk-In">{tBookingSource(t, 'Walk-In')}</option>
                <option value="Direct Website">{tBookingSource(t, 'Direct Website')}</option>
                <option value="Agency">{tBookingSource(t, 'Agency')}</option>
                <option value="OTA - Booking.com">{tBookingSource(t, 'OTA - Booking.com')}</option>
                <option value="Corporate">{tBookingSource(t, 'Corporate')}</option>
              </select>
            </div>
          </div>

          {/* Section 2: Dates, Room Category & Specific Room */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-champagne-gold-600" />
              {t('newRes.stayHeading')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.checkInDate')}
                </label>
                <input
                  type="date"
                  min={businessDate}
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {t('newRes.todayHotelDate', { date: formatDate(businessDate) })}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.checkOutDate')}
                </label>
                <input
                  type="date"
                  min={checkInDate || businessDate}
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {t('newRes.duration', { nights: formatNumber(nights) })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.roomCategory')}
                </label>
                <select
                  value={roomTypeId}
                  onChange={(e) => {
                    setRoomTypeId(e.target.value);
                    setSelectedRoomId('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-medium"
                >
                  {activeRoomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {t('newRes.roomOption', {
                        name: rt.name,
                        rate: formatMoney(rt.basePrice),
                        cap: rt.maxCapacity
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('newRes.specificRoom')}</span>
                  <span className="text-[10px] font-semibold text-emerald-700">
                    {t('newRes.roomsAvailableCount', {
                      count: availableRoomCount,
                      plural: availableRoomCount === 1 ? t('newRes.roomSingular') : t('newRes.roomPlural')
                    })}
                  </span>
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-medium"
                >
                  <option value="">
                    {t('newRes.autoAssign')}
                  </option>
                  {availableRoomsForRange.map((r) => (
                    <option key={r.id} value={r.id}>
                      {t('newRes.specificRoomOption', { number: r.roomNumber, floor: r.floor })} ({formatMoney(r.pricePerNight)}/nt)
                    </option>
                  ))}
                </select>
                {availableRoomCount === 0 && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">
                    {t('newRes.errNoAvailability', { type: currentRoomType?.name || '' })}
                  </p>
                )}
              </div>
            </div>

            {/* Guest Count */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.adults')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={currentRoomType?.maxCapacity || 10}
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.children')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={children}
                  onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Advance Deposit & Billing */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                {t('newRes.advanceDepositHeading')}
              </h3>
              <span className="text-[11px] text-emerald-800 font-medium">
                {t('newRes.postedImmediately')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.depositAmount')}
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('newRes.depositMethod')}
                </label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                  disabled={depositAmount <= 0}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:opacity-50"
                >
                  <option value="momo">{tPaymentMethod(t, 'momo')}</option>
                  <option value="orange_money">{tPaymentMethod(t, 'orange_money')}</option>
                  <option value="cash">{tPaymentMethod(t, 'cash')}</option>
                  <option value="card">{tPaymentMethod(t, 'card')}</option>
                  <option value="bank_transfer">{tPaymentMethod(t, 'bank_transfer')}</option>
                </select>
              </div>
            </div>

            {/* Live Pricing Breakdown Bar */}
            <div className="bg-white p-3 rounded-lg border border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('newRes.nightlyRate')}</span>
                <span className="font-mono font-bold text-slate-800">{formatMoney(nightlyRate)}</span>
              </div>
              <div className="text-slate-300">•</div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('newRes.nights')}</span>
                <span className="font-mono font-bold text-slate-800">{t('newRes.nightsCount', { count: nights })}</span>
              </div>
              <div className="text-slate-300">•</div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('newRes.totalStayCost')}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{formatMoney(totalStayAmount)}</span>
              </div>
              <div className="text-slate-300">•</div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">{t('newRes.balanceDueCheckIn')}</span>
                <span className={`font-mono font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatMoney(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy Terms & Non-Refundable Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {t('newRes.cancellationTerms')}
              </span>
              <span className="text-slate-600 font-medium text-right">
                {getCancellationPolicySummary(hotelConfig.cancellationPolicy, t)}
              </span>
            </div>

            {hotelConfig.cancellationPolicy?.allowNonRefundable && (
              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="newResNonRefundable" className="font-bold text-slate-800 cursor-pointer block">
                    {t('newRes.nonRefundableLabel')}
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {t('newRes.nonRefundableSub')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="newResNonRefundable"
                  checked={rateType === 'non_refundable'}
                  onChange={(e) => setRateType(e.target.checked ? 'non_refundable' : 'flexible')}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
              </div>
            )}
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('newRes.specialRequests')}
            </label>
            <textarea
              rows={2}
              placeholder={t('newRes.specialRequestsPlaceholder')}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 focus:bg-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={availableRoomsForRange.length === 0}
              className="px-5 py-2.5 bg-champagne-gold-500 hover:bg-champagne-gold-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-champagne-gold-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{t('newRes.confirmBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
