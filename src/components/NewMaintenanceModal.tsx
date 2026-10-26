import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { useT } from '../i18n/LanguageContext';
import { tMaintenanceCategory, tMaintenancePriority, tRoomStatus } from '../i18n/labels';
import { Room, MaintenanceTicket } from '../types/hms';
import { X, Wrench, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface NewMaintenanceModalProps {
  initialRoom?: Room | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewMaintenanceModal: React.FC<NewMaintenanceModalProps> = ({
  initialRoom,
  onClose,
  onSuccess
}) => {
  const { t } = useT();
  const { rooms, createMaintenanceTicket, currentUser } = useHMS();

  const [roomId, setRoomId] = useState<string>(initialRoom ? initialRoom.id : rooms[0]?.id || '');
  const [category, setCategory] = useState<MaintenanceTicket['category']>('Air Conditioning');
  const [severity, setSeverity] = useState<MaintenanceTicket['severity']>('Medium');
  const [description, setDescription] = useState('');
  const [blocksRoom, setBlocksRoom] = useState(true);
  const [assignedTechnician, setAssignedTechnician] = useState('Brice Ngale (HVAC Lead)');

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !description.trim() || !selectedRoom) return;

    createMaintenanceTicket({
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.roomNumber,
      category,
      severity,
      description: description.trim(),
      blocksRoom,
      status: 'Reported',
      reportedBy: currentUser ? `${currentUser.name} (${currentUser.title})` : 'Staff Member',
      assignedTechnician
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('newMaintenance.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('newMaintenance.subtitle')}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('newMaintenance.affectedRoom')}
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t('newMaintenance.roomOption', {
                      number: r.roomNumber,
                      floor: r.floor,
                      status: tRoomStatus(t, r.status)
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('newMaintenance.category')}
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Air Conditioning">{tMaintenanceCategory(t, 'Air Conditioning')}</option>
                <option value="Plumbing">{tMaintenanceCategory(t, 'Plumbing')}</option>
                <option value="Electrical">{tMaintenanceCategory(t, 'Electrical')}</option>
                <option value="Television">{tMaintenanceCategory(t, 'Television')}</option>
                <option value="Door Lock">{tMaintenanceCategory(t, 'Door Lock')}</option>
                <option value="Furniture">{tMaintenanceCategory(t, 'Furniture')}</option>
                <option value="Other">{tMaintenanceCategory(t, 'Other')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('newMaintenance.urgencySeverity')}
              </label>
              <select
                value={severity}
                onChange={(e: any) => setSeverity(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="Low">{tMaintenancePriority(t, 'Low')}</option>
                <option value="Medium">{tMaintenancePriority(t, 'Medium')}</option>
                <option value="High">{tMaintenancePriority(t, 'High')}</option>
                <option value="Emergency">{tMaintenancePriority(t, 'Emergency')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('newMaintenance.assignedTechnician')}
              </label>
              <input
                type="text"
                value={assignedTechnician}
                onChange={(e) => setAssignedTechnician(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('newMaintenance.detailedDescription')}
            </label>
            <textarea
              rows={3}
              placeholder={t('newMaintenance.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Block Room Toggle */}
          <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={blocksRoom}
                onChange={(e) => setBlocksRoom(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
              <div className="text-xs text-rose-900">
                <span className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  {t('newMaintenance.blockRoom', { number: selectedRoom?.roomNumber || '' })}
                </span>
                <span className="text-[11px] text-rose-700 block mt-0.5">
                  {t('newMaintenance.blockRoomSub')}
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t('newMaintenance.createTicketBtn')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
