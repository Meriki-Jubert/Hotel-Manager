import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Room } from '../types/hms';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Bed,
  Check,
  RefreshCw,
  Wrench,
  Package,
  Layers
} from 'lucide-react';

interface HousekeepingViewProps {
  onReportMaintenance: (room: Room) => void;
}

export const HousekeepingView: React.FC<HousekeepingViewProps> = ({ onReportMaintenance }) => {
  const { rooms, updateRoomStatus, roomTypes, showNotification, activeBranchId } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName="Housekeeping" />;
  }

  // Housekeeping supply stock counter (in-memory demo)
  const [supplies, setSupplies] = useState([
    { name: 'Fresh King & Queen Bedsheets', stock: 42, unit: 'sets' },
    { name: 'Bath & Hand Towels', stock: 88, unit: 'pcs' },
    { name: 'Shampoo & Shower Gel Bottles', stock: 120, unit: 'bottles' },
    { name: 'Room Slippers & Laundry Bags', stock: 65, unit: 'pairs' },
    { name: 'Mineral Water (Welcome Amenity)', stock: 95, unit: 'bottles' }
  ]);

  const handleUseSupply = (index: number) => {
    setSupplies((prev) =>
      prev.map((item, i) =>
        i === index && item.stock > 0 ? { ...item, stock: item.stock - 1 } : item
      )
    );
    showNotification(`Restocked 1 ${supplies[index].unit} of ${supplies[index].name}`, 'info');
  };

  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const activeRooms = rooms.filter((r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId));

  const dirtyRooms = activeRooms.filter((r) => r.status === 'dirty');
  const cleaningRooms = activeRooms.filter((r) => r.status === 'cleaning');
  const availableRooms = activeRooms.filter((r) => r.status === 'available');
  const occupiedRooms = activeRooms.filter((r) => r.status === 'occupied');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Housekeeping Dispatch & Room Hygiene Control
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Turnover queue, sanitation verification, and room linen replenishment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Rooms Requiring Turnover:</span>
            <span className="text-sm font-bold text-amber-600 font-mono">
              {dirtyRooms.length + cleaningRooms.length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Main Kanban / Workflow Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Dirty / Needs Cleaning */}
        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              1. Turnover Needed ({dirtyRooms.length})
            </h3>
            <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
              High Priority
            </span>
          </div>

          <div className="space-y-3">
            {dirtyRooms.map((room) => {
              const type = roomTypes.find((t) => t.id === room.roomTypeId);
              return (
                <div
                  key={room.id}
                  className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-mono font-bold text-slate-900">
                      Room #{room.roomNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Floor {room.floor}</span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <div>{type?.name}</div>
                    <div className="text-[11px] text-amber-700 italic mt-0.5">
                      {room.maintenanceNote || 'Guest checked out • Needs linen swap & vacuuming'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onReportMaintenance(room)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg text-xs"
                      title="Report Maintenance Issue"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => updateRoomStatus(room.id, 'cleaning')}
                      className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Start Cleaning</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {dirtyRooms.length === 0 && (
              <div className="p-8 text-center bg-white/70 rounded-xl border border-dashed border-amber-200 text-amber-800 text-xs">
                All rooms cleaned and turned over!
              </div>
            )}
          </div>
        </div>

        {/* Column 2: In Cleaning / In Progress */}
        <div className="bg-purple-50/50 rounded-xl border border-purple-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              2. In Cleaning ({cleaningRooms.length})
            </h3>
            <span className="text-[10px] text-purple-700 font-semibold bg-purple-100 px-2 py-0.5 rounded-full">
              Active Crew
            </span>
          </div>

          <div className="space-y-3">
            {cleaningRooms.map((room) => {
              const type = roomTypes.find((t) => t.id === room.roomTypeId);
              return (
                <div
                  key={room.id}
                  className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-mono font-bold text-slate-900">
                      Room #{room.roomNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">Floor {room.floor}</span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <div>{type?.name}</div>
                    <div className="text-[11px] text-purple-700 flex items-center gap-1 mt-1 font-medium">
                      <User className="w-3 h-3" /> Assigned: {room.assignedHousekeeper || 'Therese Mbi'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onReportMaintenance(room)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg text-xs"
                      title="Report Maintenance Issue"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => updateRoomStatus(room.id, 'available')}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Inspect & Mark Available</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {cleaningRooms.length === 0 && (
              <div className="p-8 text-center bg-white/70 rounded-xl border border-dashed border-purple-200 text-purple-800 text-xs">
                No rooms currently undergoing cleaning.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Ready & Available */}
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              3. Inspected & Available ({availableRooms.length})
            </h3>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
              Ready for Front Desk
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {availableRooms.map((room) => {
              const type = roomTypes.find((t) => t.id === room.roomTypeId);
              return (
                <div
                  key={room.id}
                  className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      Room #{room.roomNumber}
                    </span>
                    <div className="text-[11px] text-slate-500">{type?.name} (Fl. {room.floor})</div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Sanitized
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {room.lastCleaned?.split(' ')[1] || 'Today'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Housekeeping Supplies Inventory Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Housekeeping Consumables & Linens Stock Log
            </h3>
          </div>
          <span className="text-xs text-slate-500">Auto-replenishment tracking</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {supplies.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2"
            >
              <div>
                <span className="text-xs font-semibold text-slate-700 block line-clamp-1">
                  {item.name}
                </span>
                <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                  {item.stock} <span className="text-xs text-slate-500 font-normal">{item.unit}</span>
                </span>
              </div>

              <button
                onClick={() => handleUseSupply(idx)}
                className="w-full py-1 text-[11px] font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg shadow-2xs transition-colors"
              >
                Log 1 Restocked
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
