import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Room, MaintenanceTicket } from '../types/hms';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  Wrench,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Clock,
  Building,
  User,
  ShieldAlert,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';

interface MaintenanceViewProps {
  onOpenNewTicket: (preselectedRoom?: Room) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onOpenNewTicket }) => {
  const { maintenanceTickets, updateMaintenanceStatus, formatMoney, activeBranchId } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName="Maintenance & Engineering" />;
  }

  const [statusFilter, setStatusFilter] = useState<'All' | 'Reported' | 'In Progress' | 'Resolved'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = maintenanceTickets.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNum = t.ticketNumber.toLowerCase().includes(q);
      const matchRoom = t.roomNumber.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      if (!matchNum && !matchRoom && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: MaintenanceTicket['severity']) => {
    switch (sev) {
      case 'Emergency':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-rose-600" />
            Facility Maintenance & Work Orders
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Repair tickets, room blocking, HVAC, plumbing, and technician dispatch
          </p>
        </div>

        <button
          onClick={() => onOpenNewTicket()}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Log Repair Ticket</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Ticket #, Room #, Category (AC, Plumbing...), or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['All', 'Reported', 'In Progress', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTickets.map((ticket) => {
          return (
            <div
              key={ticket.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-500">
                    {ticket.ticketNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${getSeverityBadge(
                      ticket.severity
                    )}`}
                  >
                    {ticket.severity} Priority
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" />
                    Room #{ticket.roomNumber}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {ticket.category}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {ticket.description}
                </p>

                {ticket.blocksRoom && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Room is blocked from Front Desk reservations</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Reported: {ticket.reportedAt}</span>
                  <span>By: {ticket.reportedBy?.split(' ')[0]}</span>
                </div>

                {ticket.assignedTechnician && (
                  <div className="text-[11px] text-slate-700 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Tech: <strong className="font-medium">{ticket.assignedTechnician}</strong>
                  </div>
                )}

                {ticket.repairCost && (
                  <div className="text-[11px] text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    Part / Repair Cost: <strong>{formatMoney(ticket.repairCost)}</strong>
                  </div>
                )}

                {/* State Controls */}
                <div className="pt-2 flex items-center gap-2">
                  {ticket.status === 'Reported' && (
                    <button
                      onClick={() => updateMaintenanceStatus(ticket.id, 'In Progress')}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Assign / In Progress</span>
                    </button>
                  )}

                  {ticket.status === 'In Progress' && (
                    <button
                      onClick={() => updateMaintenanceStatus(ticket.id, 'Resolved', 5000)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete & Unblock Room</span>
                    </button>
                  )}

                  {ticket.status === 'Resolved' && (
                    <span className="w-full py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Resolved on {ticket.resolvedAt?.split(' ')[0] || 'Today'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTickets.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No maintenance tickets found for the selected status.
        </div>
      )}
    </div>
  );
};
