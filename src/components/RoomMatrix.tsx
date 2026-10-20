import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Room, RoomStatus } from '../types/hms';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  Bed,
  User,
  Calendar,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  LogIn,
  LogOut,
  Receipt,
  Wrench,
  SlidersHorizontal,
  Eye
} from 'lucide-react';

interface RoomMatrixProps {
  onSelectRoom: (room: Room) => void;
  onOpenCheckInForRoom: (room: Room) => void;
  onOpenCheckOutForRes: (resId: string) => void;
  onOpenFolioForRes: (resId: string) => void;
}

export const RoomMatrix: React.FC<RoomMatrixProps> = ({
  onSelectRoom,
  onOpenCheckInForRoom,
  onOpenCheckOutForRes,
  onOpenFolioForRes
}) => {
  const {
    rooms,
    roomTypes,
    reservations,
    transactions,
    updateRoomStatus,
    formatMoney,
    businessDate,
    canCheckIn,
    canCheckOut,
    isReadOnly,
    currentUser,
    setActiveTab,
    activeBranchId
  } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName="Room Matrix" />;
  }

  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Status visual mapping
  const statusConfig: Record<
    RoomStatus,
    { label: string; bg: string; border: string; text: string; dot: string; lightBg: string }
  > = {
    available: {
      label: 'Available',
      bg: 'bg-emerald-600',
      border: 'border-emerald-200 hover:border-emerald-400',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      lightBg: 'bg-emerald-50/70'
    },
    occupied: {
      label: 'Occupied',
      bg: 'bg-rose-600',
      border: 'border-rose-200 hover:border-rose-400',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      lightBg: 'bg-rose-50/70'
    },
    reserved: {
      label: 'Reserved',
      bg: 'bg-blue-600',
      border: 'border-blue-200 hover:border-blue-400',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      lightBg: 'bg-blue-50/70'
    },
    dirty: {
      label: 'Dirty / Turnover',
      bg: 'bg-amber-600',
      border: 'border-amber-200 hover:border-amber-400',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      lightBg: 'bg-amber-50/70'
    },
    cleaning: {
      label: 'In Cleaning',
      bg: 'bg-purple-600',
      border: 'border-purple-200 hover:border-purple-400',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
      lightBg: 'bg-purple-50/70'
    },
    maintenance: {
      label: 'Maintenance',
      bg: 'bg-slate-700',
      border: 'border-slate-300 hover:border-slate-500',
      text: 'text-slate-700',
      dot: 'bg-slate-600',
      lightBg: 'bg-slate-100'
    }
  };

  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));

  // Friendly Empty State when no rooms or types exist
  if (activeRooms.length === 0) {
    const isManager = currentUser?.role === 'manager';
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-2xl shadow-2xl border border-champagne-gold-500/40 p-10 sm:p-14 text-center text-slate-100 max-w-xl mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-champagne-gold-500/20 text-champagne-gold-400 mx-auto flex items-center justify-center border border-champagne-gold-500/30">
            <Bed className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Hotel Rooms Found</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {roomTypes.length === 0
              ? 'Your property currently has no room categories or rooms configured.'
              : 'There are no active rooms in the hotel inventory.'}
          </p>

          <div className="pt-2">
            {isManager ? (
              <button
                onClick={() => setActiveTab('settings')}
                className="px-6 py-2.5 bg-champagne-gold-500 hover:bg-champagne-gold-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-champagne-gold-500/20 transition-all hover:scale-[1.02]"
              >
                Open Room Setup
              </button>
            ) : (
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 font-semibold inline-block">
                Ask your manager to add rooms
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredRooms = activeRooms.filter((room) => {
    if (selectedFloor !== 'all' && room.floor !== selectedFloor) return false;
    if (selectedStatus !== 'all' && room.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const rType = roomTypes.find((t) => t.id === room.roomTypeId);
      const res = reservations.find((r) => r.id === room.currentReservationId);
      const matchesNumber = room.roomNumber.toLowerCase().includes(q);
      const matchesType = rType?.name.toLowerCase().includes(q) || false;
      const matchesGuest = res?.guestName.toLowerCase().includes(q) || false;
      if (!matchesNumber && !matchesType && !matchesGuest) return false;
    }
    return true;
  });

  const counts = activeRooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const floors = Array.from(new Set(activeRooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-slate-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-champagne-gold-500/50 p-4 space-y-4 text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Room #, Guest Name, or Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Floor Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Floor:
            </span>
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                selectedFloor === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Floors
            </button>
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                  selectedFloor === floor
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Floor {floor}
              </button>
            ))}
          </div>

        </div>

        {/* Status Pills / Quick Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100 text-xs no-scrollbar">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({activeRooms.length})
          </button>
          {(Object.keys(statusConfig) as RoomStatus[]).map((st) => {
            const cfg = statusConfig[st];
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-all ${
                  isSelected
                    ? `${cfg.bg} text-white shadow-xs`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : cfg.dot}`} />
                <span>{cfg.label}</span>
                <span className="opacity-75 font-mono">({counts[st] || 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRooms.map((room) => {
          const type = roomTypes.find((t) => t.id === room.roomTypeId);
          const currentRes = reservations.find((r) => r.id === room.currentReservationId);
          const arrivingTodayRes = reservations.find(
            (r) => r.roomId === room.id && r.bookingStatus === 'reserved' && r.checkInDate === businessDate
          );
          const cfg = statusConfig[room.status];

          let folioBalance = 0;
          if (currentRes) {
            const charges = transactions
              .filter((t) => !t.voided && t.reservationId === currentRes.id && t.type === 'charge')
              .reduce((s, t) => s + t.amount, 0);
            const payments = transactions
              .filter((t) => !t.voided && t.reservationId === currentRes.id && t.type === 'payment')
              .reduce((s, t) => s + t.amount, 0);
            folioBalance = charges - payments;
          }

          return (
            <div
              key={room.id}
              className={`bg-white rounded-xl border-2 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group cursor-pointer ${cfg.border}`}
              onClick={() => onSelectRoom(room)}
            >
              {/* 4K Architectural Photo Thumbnail Banner */}
              <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                <img
                  src={type?.image || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80'}
                  alt={type?.name || 'Room'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute top-2.5 left-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md ${cfg.bg}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {cfg.label}
                  </span>
                </div>
                {arrivingTodayRes && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-md border border-amber-300 animate-pulse">
                      Arriving today
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
                  <span className="font-mono font-bold text-base drop-shadow-md">
                    #{room.roomNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-200 drop-shadow-md">
                    Floor {room.floor}
                  </span>
                </div>
              </div>

              {/* Card Meta Subheader */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 truncate">{type?.name || 'Standard'}</span>
                <span className="text-slate-900 font-bold font-mono">{formatMoney(room.pricePerNight)}/nt</span>
              </div>

              {/* Card Body Information */}
              <div className="p-3.5 space-y-2.5 flex-1 text-xs">
                {room.status === 'occupied' && currentRes && (
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                      <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{currentRes.guestName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Out: {currentRes.checkOutDate}
                      </span>
                      <span className="font-mono text-slate-700">{currentRes.totalNights} nts</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 font-medium">
                      <span className="text-slate-500">Balance:</span>
                      <span
                        className={`font-semibold font-mono ${
                          folioBalance > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'
                        }`}
                      >
                        {folioBalance > 0 ? formatMoney(folioBalance) : 'Settled'}
                      </span>
                    </div>
                  </div>
                )}

                {arrivingTodayRes && room.status !== 'occupied' && (
                  <div className="space-y-1 bg-amber-50/90 p-2.5 rounded-lg border border-amber-200">
                    <div className="font-bold text-amber-900 flex items-center justify-between text-[11px] truncate">
                      <span className="truncate flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Arrival: {arrivingTodayRes.guestName}
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Stay: {arrivingTodayRes.totalNights} nts • Out: {arrivingTodayRes.checkOutDate}
                    </div>
                  </div>
                )}

                {room.status === 'dirty' && (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 space-y-1">
                    <div className="font-semibold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Turnover Needed
                    </div>
                    <div className="text-[11px] text-amber-700 truncate">
                      Assigned: {room.assignedHousekeeper || 'Housekeeping Crew'}
                    </div>
                  </div>
                )}

                {room.status === 'cleaning' && (
                  <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 space-y-1">
                    <div className="font-semibold text-purple-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0 animate-spin" />
                      Cleaning In Progress
                    </div>
                    <div className="text-[11px] text-purple-700 truncate">
                      {room.assignedHousekeeper || 'Housekeeping Crew'}
                    </div>
                  </div>
                )}

                {room.status === 'maintenance' && (
                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Maintenance Hold
                    </div>
                    <div className="text-[11px] text-slate-600 line-clamp-2">
                      {room.maintenanceNote || 'Facility repair ticket logged.'}
                    </div>
                  </div>
                )}

                {room.status === 'available' && (
                  <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60 text-slate-600 space-y-1">
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Ready for Guest
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Cleaned: {room.lastCleaned?.split(' ')[1] || 'Today'} • {type?.bedType}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Quick Actions */}
              <div
                className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {isReadOnly ? (
                  <button
                    onClick={() => onSelectRoom(room)}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Overview</span>
                  </button>
                ) : (
                  <>
                    {room.status === 'available' && canCheckIn && (
                      <button
                        onClick={() => onOpenCheckInForRoom(room)}
                        className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Check In</span>
                      </button>
                    )}

                    {room.status === 'occupied' && currentRes && (
                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          onClick={() => onOpenFolioForRes(currentRes.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs transition-colors"
                          title="Open Guest Folio & Charges"
                        >
                          <Receipt className="w-3.5 h-3.5 text-slate-500" />
                          <span>Folio</span>
                        </button>
                        {canCheckOut && (
                          <button
                            onClick={() => onOpenCheckOutForRes(currentRes.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                            title="Initiate Check-Out"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Out</span>
                          </button>
                        )}
                      </div>
                    )}

                    {room.status === 'reserved' && currentRes && canCheckIn && (
                      <button
                        onClick={() => onOpenCheckInForRoom(room)}
                        className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Check In Guest</span>
                      </button>
                    )}

                    {room.status === 'dirty' && (
                      <button
                        onClick={() => updateRoomStatus(room.id, 'cleaning')}
                        className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Start Cleaning</span>
                      </button>
                    )}

                    {room.status === 'cleaning' && (
                      <button
                        onClick={() => updateRoomStatus(room.id, 'available')}
                        className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Inspect & Release</span>
                      </button>
                    )}

                    {room.status === 'maintenance' && (
                      <button
                        onClick={() => onSelectRoom(room)}
                        className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        <span>View Ticket</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Bed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No rooms match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query, selected floor, or status criteria.
          </p>
        </div>
      )}
    </div>
  );
};
