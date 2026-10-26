import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Room } from '../types/hms';
import { ExtendStayModal } from './ExtendStayModal';
import { ShortenStayModal } from './ShortenStayModal';
import { ChangeRoomModal } from './ChangeRoomModal';
import { useT } from '../i18n/LanguageContext';
import { tRoomStatus, tBookingSource } from '../i18n/labels';
import {
  X,
  Bed,
  User,
  Calendar,
  Sparkles,
  Wrench,
  Receipt,
  LogOut,
  LogIn,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Layers,
  Tag,
  PlusCircle,
  MinusCircle,
  Shuffle
} from 'lucide-react';

interface RoomDetailModalProps {
  room: Room;
  onClose: () => void;
  onCheckIn: (room: Room) => void;
  onCheckOut: (resId: string) => void;
  onOpenFolio: (resId: string) => void;
  onReportMaintenance: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onCheckIn,
  onCheckOut,
  onOpenFolio,
  onReportMaintenance
}) => {
  const { t, formatDate, formatNumber } = useT();
  const { roomTypes, reservations, updateRoomStatus, formatMoney, maintenanceTickets, getNextUpcomingReservationForRoom, currentUser } = useHMS();
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showShortenModal, setShowShortenModal] = useState(false);
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);

  const type = roomTypes.find((t) => t.id === room.roomTypeId);
  const currentRes = reservations.find((r) => r.id === room.currentReservationId);
  const nextReservation = getNextUpcomingReservationForRoom(room.id);
  const activeTicket = maintenanceTickets.find(
    (t) => t.roomId === room.id && t.status !== 'Resolved'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header - shrink-0 pinned at top */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-mono">{t('roomDetail.roomHeader', { number: room.roomNumber })}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {t('roomDetail.floorHeader', { floor: room.floor })}
                </span>
              </div>
              <p className="text-xs text-slate-400">{type?.name || 'Standard'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Status & Pricing Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                {t('roomDetail.currentState')}
              </span>
              <span className="text-sm font-bold capitalize text-slate-900 mt-0.5 inline-flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    room.status === 'available'
                      ? 'bg-emerald-500'
                      : room.status === 'occupied'
                      ? 'bg-rose-500'
                      : room.status === 'reserved'
                      ? 'bg-blue-500'
                      : room.status === 'dirty'
                      ? 'bg-amber-500'
                      : room.status === 'cleaning'
                      ? 'bg-purple-500'
                      : 'bg-slate-600'
                  }`}
                />
                {tRoomStatus(t, room.status).toUpperCase()}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                {t('roomDetail.nightlyRate')}
              </span>
              <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">
                {formatMoney(room.pricePerNight)}
              </span>
            </div>
          </div>

          {/* Occupancy Info if Occupied or Reserved */}
          {currentRes && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {t('roomDetail.guestStayRecord')}
                </span>
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                  {currentRes.bookingCode}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">{currentRes.guestName}</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  {t('roomDetail.phone')} <strong className="font-mono text-slate-800">{currentRes.guestPhone}</strong>
                </div>
                <div>
                  {t('roomDetail.source')} <strong className="text-slate-800">{tBookingSource(t, currentRes.source)}</strong>
                </div>
                <div>
                  {t('roomDetail.checkIn')} <strong className="font-mono text-slate-800">{formatDate(currentRes.checkInDate)}</strong>
                </div>
                <div>
                  {t('roomDetail.checkOut')} <strong className="font-mono text-slate-800">{formatDate(currentRes.checkOutDate)}</strong>
                </div>
              </div>
              {currentRes.specialRequests && (
                <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-200 italic">
                  {t('roomDetail.specialNote', { note: currentRes.specialRequests })}
                </div>
              )}

              {/* In-House Stay Management Actions */}
              {currentRes.bookingStatus === 'checked_in' && (
                <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowExtendModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
                    title={t('roomDetail.extendStay')}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('roomDetail.extendStay')}</span>
                  </button>

                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setShowShortenModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                      title={t('roomDetail.shortenStay')}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('roomDetail.shortenStay')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowChangeRoomModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 transition-colors cursor-pointer"
                    title={t('roomDetail.changeRoom')}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('roomDetail.changeRoom')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Next Upcoming Reservation */}
          {nextReservation && (
            <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> {t('roomDetail.nextUpcoming')}
                </span>
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800 font-bold">
                  {nextReservation.bookingCode}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">{nextReservation.guestName}</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  {t('roomDetail.phone')} <strong className="font-mono text-slate-800">{nextReservation.guestPhone}</strong>
                </div>
                <div>
                  {t('roomDetail.source')} <strong className="text-slate-800">{tBookingSource(t, nextReservation.source)}</strong>
                </div>
                <div>
                  {t('roomDetail.arrival')} <strong className="font-mono text-slate-800">{formatDate(nextReservation.checkInDate)}</strong>
                </div>
                <div>
                  {t('roomDetail.departure')} <strong className="font-mono text-slate-800">{formatDate(nextReservation.checkOutDate)}</strong>
                </div>
              </div>
              {nextReservation.specialRequests && (
                <div className="text-xs text-slate-500 bg-white p-2 rounded border border-blue-100 italic">
                  {t('roomDetail.specialNoteUpcoming', { note: nextReservation.specialRequests })}
                </div>
              )}
            </div>
          )}

          {/* Active Maintenance Ticket if any */}
          {activeTicket && (
            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-rose-600" /> {t('roomDetail.maintenanceIncident')}
                </span>
                <span className="font-mono text-[11px]">{activeTicket.ticketNumber}</span>
              </div>
              <div className="text-xs text-rose-700">{activeTicket.description}</div>
              <div className="text-[10px] text-rose-500">
                {t('roomDetail.severityTech', { severity: activeTicket.severity, tech: activeTicket.assignedTechnician || t('roomDetail.unassignedTech') })}
              </div>
            </div>
          )}

          {/* Amenities & Features */}
          {type && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                {t('roomDetail.amenitiesConfig')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                  {t('roomDetail.bedType', { type: type.bedType })}
                </span>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                  {t('roomDetail.maxCapacity', { count: formatNumber(type.maxCapacity) })}
                </span>
                {type.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Direct Status Override Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {t('roomDetail.housekeepingActions')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => updateRoomStatus(room.id, 'available')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('roomDetail.markAvailable')}</span>
              </button>
              <button
                onClick={() => updateRoomStatus(room.id, 'dirty')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('roomDetail.markDirty')}</span>
              </button>
              <button
                onClick={() => updateRoomStatus(room.id, 'cleaning')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('roomDetail.inCleaning')}</span>
              </button>
            </div>
          </div>

          {/* Main Action Bar */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                onClose();
                onReportMaintenance(room);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('roomDetail.reportIssue')}</span>
            </button>

            <div className="flex items-center gap-2">
              {room.status === 'available' && (
                <button
                  onClick={() => {
                    onClose();
                    onCheckIn(room);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('matrix.checkInGuest')}</span>
                </button>
              )}

              {room.status === 'occupied' && currentRes && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFolio(currentRes.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg shadow-xs cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>{t('matrix.folio')}</span>
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onCheckOut(currentRes.id);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('frontDesk.checkOut')}</span>
                  </button>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Stay Management Sub-Modals */}
      {showExtendModal && currentRes && (
        <ExtendStayModal
          reservation={currentRes}
          onClose={() => setShowExtendModal(false)}
        />
      )}

      {showShortenModal && currentRes && (
        <ShortenStayModal
          reservation={currentRes}
          onClose={() => setShowShortenModal(false)}
        />
      )}

      {showChangeRoomModal && currentRes && (
        <ChangeRoomModal
          reservation={currentRes}
          onClose={() => setShowChangeRoomModal(false)}
        />
      )}
    </div>
  );
};
