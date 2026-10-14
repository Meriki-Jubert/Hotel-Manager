import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Room, RoomStatus } from '../types/hms';
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
  SlidersHorizontal
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
  const { rooms, roomTypes, reservations, transactions, updateRoomStatus, formatMoney } = useHMS();

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

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
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

  // Calculate counts for legend
  const counts = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
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
            All ({rooms.length})
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
                    ? `${cfg.bg} text-white shadow-sm`
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
          const cfg = statusConfig[room.status];

          // Calculate running balance for occupied room
          let folioBalance = 0;
          if (currentRes) {
            const charges = transactions
              .filter((t) => t.reservationId === currentRes.id && t.type === 'charge')
              .reduce((s, t) => s + t.amount, 0);
            const payments = transactions
              .filter((t) => t.reservationId === currentRes.id && t.type === 'payment')
              .reduce((s, t) => s + t.amount, 0);
            folioBalance = charges - payments;
          }

          return (
            <div
              key={room.id}
              className={`bg-white rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden group cursor-pointer ${cfg.border}`}
              onClick={() => onSelectRoom(room)}
            >
              {/* Card Header */}
              <div className={`p-3.5 border-b border-slate-100 ${cfg.lightBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-emerald-700 transition-colors">
                      #{room.roomNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Floor {room.floor}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white shadow-xs ${cfg.bg}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {cfg.label}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-medium truncate mt-1 flex items-center justify-between">
                  <span>{type?.name || 'Standard'}</span>
                  <span className="text-slate-900 font-semibold">{formatMoney(room.pricePerNight)}/nt</span>
                </div>
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
                      <span className="text-slate-500">Folio Balance:</span>
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

                {room.status === 'reserved' && currentRes && (
                  <div className="space-y-1 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                    <div className="font-semibold text-blue-900 flex items-center gap-1 truncate">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{currentRes.guestName}</span>
                    </div>
                    <div className="text-[11px] text-blue-700">
                      Check-in: <strong className="font-mono">{currentRes.checkInDate}</strong>
                    </div>
                    <div className="text-[10px] text-blue-600">
                      Paid: {formatMoney(currentRes.amountPaid)} ({currentRes.paymentStatus})
                    </div>
                  </div>
                )}

                {room.status === 'dirty' && (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 space-y-1">
                    <div className="font-semibold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Turnover Cleaning Required
                    </div>
                    <div className="text-[11px] text-amber-700 truncate">
                      Housekeeper: {room.assignedHousekeeper || 'Unassigned'}
                    </div>
                    {room.maintenanceNote && (
                      <div className="text-[10px] text-amber-600 italic line-clamp-1">
                        {room.maintenanceNote}
                      </div>
                    )}
                  </div>
                )}

                {room.status === 'cleaning' && (
                  <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 space-y-1">
                    <div className="font-semibold text-purple-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0 animate-spin" />
                      Cleaning In Progress
                    </div>
                    <div className="text-[11px] text-purple-700 truncate">
                      By {room.assignedHousekeeper || 'Housekeeping Crew'}
                    </div>
                  </div>
                )}

                {room.status === 'maintenance' && (
                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Under Maintenance
                    </div>
                    <div className="text-[11px] text-slate-600 line-clamp-2">
                      {room.maintenanceNote || 'Facility repair ticket in progress.'}
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
                {room.status === 'available' && (
                  <button
                    onClick={() => onOpenCheckInForRoom(room)}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
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
                    <button
                      onClick={() => onOpenCheckOutForRes(currentRes.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                      title="Initiate Check-Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Out</span>
                    </button>
                  </div>
                )}

                {room.status === 'reserved' && currentRes && (
                  <button
                    onClick={() => onOpenCheckInForRoom(room)}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Check In Guest</span>
                  </button>
                )}

                {room.status === 'dirty' && (
                  <button
                    onClick={() => updateRoomStatus(room.id, 'cleaning')}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Cleaning</span>
                  </button>
                )}

                {room.status === 'cleaning' && (
                  <button
                    onClick={() => updateRoomStatus(room.id, 'available')}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Inspect & Release</span>
                  </button>
                )}

                {room.status === 'maintenance' && (
                  <button
                    onClick={() => onSelectRoom(room)}
                    className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Ticket</span>
                  </button>
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
