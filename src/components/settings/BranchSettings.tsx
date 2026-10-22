import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import { Branch } from '../../types/hms';
import { DeactivatePromptModal, DeactivatePromptState } from './shared';
import {
  GitBranch,
  PlusCircle,
  MapPin,
  Power,
  Edit3,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';

export const BranchSettings: React.FC = () => {
  const {
    branches,
    activeBranchId,
    branchBusinessDates,
    businessDate,
    allRooms,
    allReservations,
    addBranch,
    updateBranch,
    deleteBranch,
    toggleBranchActive
  } = useHMS();

  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormCity, setBranchFormCity] = useState('');
  const [branchFormAddress, setBranchFormAddress] = useState('');
  const [branchFormPhone, setBranchFormPhone] = useState('');
  const [branchFormActive, setBranchFormActive] = useState(true);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);

  const [deactivatePrompt, setDeactivatePrompt] = useState<DeactivatePromptState | null>(null);

  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchFormName('');
    setBranchFormCity('');
    setBranchFormAddress('');
    setBranchFormPhone('');
    setBranchFormActive(true);
    setBranchFormError(null);
    setShowAddBranchModal(true);
  };

  const openEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchFormName(b.name);
    setBranchFormCity(b.city);
    setBranchFormAddress(b.address);
    setBranchFormPhone(b.phone);
    setBranchFormActive(b.isActive);
    setBranchFormError(null);
    setShowAddBranchModal(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchFormError(null);

    const bName = branchFormName.trim();
    const bCity = branchFormCity.trim();

    if (!bName) {
      setBranchFormError('Branch name is required.');
      return;
    }
    if (!bCity) {
      setBranchFormError('Branch city is required.');
      return;
    }

    if (editingBranch) {
      const res = updateBranch(editingBranch.id, {
        name: bName,
        city: bCity,
        address: branchFormAddress.trim(),
        phone: branchFormPhone.trim(),
        isActive: branchFormActive
      });
      if (!res.success) {
        setBranchFormError(res.error || 'Failed to update branch.');
        return;
      }
    } else {
      const res = addBranch({
        name: bName,
        city: bCity,
        address: branchFormAddress.trim(),
        phone: branchFormPhone.trim(),
        isActive: branchFormActive
      });
      if (!res.success) {
        setBranchFormError(res.error || 'Failed to create branch.');
        return;
      }
    }

    setShowAddBranchModal(false);
  };

  const handleDeleteBranch = (b: Branch) => {
    const res = deleteBranch(b.id);
    if (!res.success) {
      if (res.canDeactivateInstead) {
        setDeactivatePrompt({
          isOpen: true,
          type: 'branch',
          id: b.id,
          title: `Cannot Delete "${b.name}"`,
          message: `${res.error} Would you like to deactivate this branch instead? Deactivated branches are preserved in historical records and invoices but will be hidden from new reservations.`
        });
      }
    }
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatePrompt) return;
    toggleBranchActive(deactivatePrompt.id, false);
    setDeactivatePrompt(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-teal-600" />
            Hotel Branch Locations & Multi-Property Network
          </h3>
          <p className="text-xs text-slate-500">
            Manage branch properties in different cities. Each branch has its own independent rooms inventory, Business Date, and Night Audit ledger.
          </p>
        </div>

        <button
          onClick={openAddBranch}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => {
          const bRooms = allRooms.filter((r) => r.branchId === b.id);
          const bOcc = bRooms.filter((r) => r.status === 'occupied').length;
          const bRes = allReservations.filter((r) => r.branchId === b.id);
          const bDate = branchBusinessDates[b.id] || businessDate;
          const isCurrent = activeBranchId === b.id;

          return (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                !b.isActive
                  ? 'border-slate-200 opacity-60 bg-slate-50/50'
                  : isCurrent
                  ? 'border-teal-500 ring-2 ring-teal-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.city || 'No city set'}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {b.address && (
                    <div className="truncate">
                      <strong className="text-slate-700">Address:</strong> {b.address}
                    </div>
                  )}
                  {b.phone && (
                    <div>
                      <strong className="text-slate-700">Phone:</strong> {b.phone}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Business Date:</span>
                    <span className="font-mono font-bold text-slate-800">{bDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100">
                    <div className="text-sm font-bold font-mono text-purple-900">{bRooms.length}</div>
                    <div className="text-[10px] text-purple-700">Rooms ({bOcc} Occ)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100">
                    <div className="text-sm font-bold font-mono text-blue-900">{bRes.length}</div>
                    <div className="text-[10px] text-blue-700">Reservations</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => toggleBranchActive(b.id, !b.isActive)}
                  className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded transition-colors cursor-pointer ${
                    !b.isActive
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                  title={!b.isActive ? 'Activate branch' : 'Deactivate from new bookings'}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{!b.isActive ? 'Activate' : 'Deactivate'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditBranch(b)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                    title="Edit Branch Information"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteBranch(b)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                    title="Delete Branch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT BRANCH */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Branch Location'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {branchFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{branchFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={branchFormName}
                  onChange={(e) => setBranchFormName(e.target.value)}
                  placeholder="e.g. Limbe Oceanview, Douala Business Suites"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Location *</label>
                <input
                  type="text"
                  value={branchFormCity}
                  onChange={(e) => setBranchFormCity(e.target.value)}
                  placeholder="e.g. Limbe, Douala, Yaoundé"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={branchFormAddress}
                  onChange={(e) => setBranchFormAddress(e.target.value)}
                  placeholder="e.g. Down Beach Road, Limbe"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Direct Phone</label>
                <input
                  type="tel"
                  value={branchFormPhone}
                  onChange={(e) => setBranchFormPhone(e.target.value)}
                  placeholder="e.g. +237 670 11 22 33"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="branchActiveCheckbox"
                  checked={branchFormActive}
                  onChange={(e) => setBranchFormActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="branchActiveCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                  Branch is Active (Available for bookings & check-ins)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingBranch ? 'Save Branch Details' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate prompt modal */}
      {deactivatePrompt && (
        <DeactivatePromptModal
          prompt={deactivatePrompt}
          onCancel={() => setDeactivatePrompt(null)}
          onConfirm={handleConfirmDeactivate}
        />
      )}
    </div>
  );
};
