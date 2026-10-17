import React, { useState, useEffect } from 'react';
import { useHMS } from '../context/HMSContext';
import { Room, PaymentMethod } from '../types/hms';
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
  AlertCircle
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
  const { rooms, roomTypes, checkInGuest, businessDate, formatMoney, guests, currentUser, setActiveTab } = useHMS();

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
  const tomorrow = new Date(businessDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow.toISOString().split('T')[0]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedRoomId) {
      setErrorMsg('Please select a valid room.');
      return;
    }
    if (!guestName.trim()) {
      setErrorMsg('Guest full name is required.');
      return;
    }
    if (!phone.trim() || phone.trim() === '+237') {
      setErrorMsg('Valid contact phone number is required.');
      return;
    }
    if (!idCardNumber.trim()) {
      setErrorMsg('National ID Card / Passport # is required for police registry.');
      return;
    }

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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Express Guest Check-In</h2>
              <p className="text-xs text-slate-400">
                Front Desk Registration & Immediate Room Allocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {availableRooms.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">No Rooms Available for Check-In</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {activeRooms.length === 0
                  ? 'There are currently no active rooms configured in the hotel inventory.'
                  : 'All rooms in inventory are currently occupied, undergoing cleaning, or under maintenance.'}
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
                  Open Room & Inventory Setup
                </button>
              ) : (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-semibold inline-block border border-slate-200">
                  Ask your manager to add rooms
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Room Selection & Dates */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> Room Assignment & Stay Dates
              </span>
              {selectedRoom && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Rate: {formatMoney(selectedRoom.pricePerNight)} / night
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Room *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  {availableRooms.map((r) => {
                    const rType = roomTypes.find((t) => t.id === r.roomTypeId);
                    return (
                      <option key={r.id} value={r.id}>
                        Room #{r.roomNumber} - {rType?.name || 'Standard'} (Floor {r.floor})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check-In Date *
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check-Out Date *
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-4">
                <span>
                  Stay Duration: <strong className="text-slate-900 font-mono">{totalNights} Night(s)</strong>
                </span>
                <span>
                  Booking Source:
                  <select
                    value={source}
                    onChange={(e: any) => setSource(e.target.value)}
                    className="ml-1.5 text-xs font-medium border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50"
                  >
                    <option value="Walk-In">Walk-In (Direct)</option>
                    <option value="Phone">Phone Booking</option>
                    <option value="Direct Website">Direct Website</option>
                    <option value="OTA - Booking.com">OTA (Booking.com/Expedia)</option>
                    <option value="Corporate">Corporate / Government</option>
                  </select>
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[11px] block">Est. Room Total:</span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  {formatMoney(totalRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Guest Identity Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Guest Information (Police Logbook Compliant)
              </span>

              {/* Quick Select from CRM */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Returning guest?</span>
                <select
                  value={selectedExistingGuestId}
                  onChange={(e) => handleSelectExistingGuest(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-0.5 bg-slate-50"
                >
                  <option value="">-- Choose Existing Guest --</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName} ({g.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Roland Enow"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (MTN / Orange) *
                </label>
                <input
                  type="text"
                  placeholder="+237 6xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  National ID / Passport # *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SW-89472610-A"
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nationality / Country
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="guest@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adults
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Children
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Collection */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Initial Payment & Deposit Collection
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'momo', label: 'MTN MoMo', color: 'bg-yellow-400 text-yellow-950 font-bold' },
                    { id: 'orange_money', label: 'Orange Money', color: 'bg-orange-500 text-white font-bold' },
                    { id: 'cash', label: 'Cash (FCFA)', color: 'bg-emerald-600 text-white font-bold' },
                    { id: 'card', label: 'Bank Card', color: 'bg-blue-600 text-white font-bold' },
                    { id: 'bank_transfer', label: 'Bank Transfer', color: 'bg-indigo-600 text-white font-bold' }
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
                  Amount Received Now (Deposit / Full)
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
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(Math.round(totalRate / 2))}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(0)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                    >
                      0
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[11px] mt-1 text-slate-500">
                  <span>Balance Due at Checkout:</span>
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
              Special Guest Requests / Room Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Quiet room requested, early morning tea, extra towel..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Check-In & Issue Key</span>
            </button>
          </div>
        </form>
      )}

      </div>
    </div>
  );
};
