import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import { StaffUser, UserRole } from '../../types/hms';
import {
  Users,
  PlusCircle,
  ShieldCheck,
  KeyRound,
  Edit3,
  Power,
  X,
  AlertCircle,
  GitBranch,
  History
} from 'lucide-react';

export const StaffSettings: React.FC = () => {
  const {
    staffUsers,
    staffActivityLogs,
    currentUser,
    branches,
    toggleStaffActive,
    addStaff,
    updateStaff,
    resetStaffPassword
  } = useHMS();

  const defaultBranchId = branches[0]?.id || 'branch-1';

  // --- STAFF STATE & MODALS ---
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffUser | null>(null);

  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormUsername, setStaffFormUsername] = useState('');
  const [staffFormPassword, setStaffFormPassword] = useState('');
  const [staffFormRole, setStaffFormRole] = useState<UserRole>('front_desk');
  const [staffFormBranchId, setStaffFormBranchId] = useState<string>(defaultBranchId);
  const [staffFormTitle, setStaffFormTitle] = useState('');
  const [staffFormEmail, setStaffFormEmail] = useState('');
  const [staffFormPhone, setStaffFormPhone] = useState('');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);
  const [staffFormSubmitting, setStaffFormSubmitting] = useState(false);

  // Reset password state
  const [resetPwValue, setResetPwValue] = useState('');
  const [resetPwConfirm, setResetPwConfirm] = useState('');
  const [resetPwError, setResetPwError] = useState<string | null>(null);
  const [resetPwSubmitting, setResetPwSubmitting] = useState(false);

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffFormName('');
    setStaffFormUsername('');
    setStaffFormPassword('');
    const defaultRole: UserRole = 'front_desk';
    setStaffFormRole(defaultRole);
    setStaffFormBranchId(branches[0]?.id || 'branch-1');
    setStaffFormTitle('');
    setStaffFormEmail('');
    setStaffFormPhone('');
    setStaffFormError(null);
    setShowAddStaffModal(true);
  };

  const openEditStaff = (staff: StaffUser) => {
    setEditingStaff(staff);
    setStaffFormName(staff.name);
    setStaffFormUsername(staff.username);
    setStaffFormPassword('');
    setStaffFormRole(staff.role);
    setStaffFormBranchId(staff.branchId || branches[0]?.id || 'branch-1');
    setStaffFormTitle(staff.title || '');
    setStaffFormEmail(staff.email || '');
    setStaffFormPhone(staff.phone || '');
    setStaffFormError(null);
    setShowAddStaffModal(true);
  };

  const openResetPasswordModal = (staff: StaffUser) => {
    setResetPasswordStaff(staff);
    setResetPwValue('');
    setResetPwConfirm('');
    setResetPwError(null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);

    if (editingStaff) {
      const res = updateStaff(editingStaff.id, {
        name: staffFormName,
        username: staffFormUsername,
        role: staffFormRole,
        branchId: staffFormRole === 'owner' ? undefined : staffFormBranchId,
        title: staffFormTitle,
        email: staffFormEmail,
        phone: staffFormPhone
      });
      if (!res.success) {
        setStaffFormError(res.error || 'Failed to update staff member.');
        return;
      }
      setShowAddStaffModal(false);
    } else {
      if (!staffFormPassword || staffFormPassword.length < 8) {
        setStaffFormError('Password must be at least 8 characters long.');
        return;
      }
      setStaffFormSubmitting(true);
      try {
        const res = await addStaff({
          name: staffFormName,
          username: staffFormUsername,
          password: staffFormPassword,
          role: staffFormRole,
          branchId: staffFormRole === 'owner' ? undefined : staffFormBranchId,
          title: staffFormTitle,
          email: staffFormEmail,
          phone: staffFormPhone
        });
        if (!res.success) {
          setStaffFormError(res.error || 'Failed to add staff member.');
          return;
        }
        setShowAddStaffModal(false);
      } finally {
        setStaffFormSubmitting(false);
      }
    }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordStaff) return;
    setResetPwError(null);

    if (!resetPwValue || resetPwValue.length < 8) {
      setResetPwError('Password must be at least 8 characters long.');
      return;
    }
    if (resetPwValue !== resetPwConfirm) {
      setResetPwError('Passwords do not match.');
      return;
    }

    setResetPwSubmitting(true);
    try {
      const res = await resetStaffPassword(resetPasswordStaff.id, resetPwValue);
      if (!res.success) {
        setResetPwError(res.error || 'Failed to reset password.');
        return;
      }
      setResetPasswordStaff(null);
    } finally {
      setResetPwSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Staff Accounts & Role Permissions
          </h3>
          <p className="text-xs text-slate-500">
            Manage property staff, assign secure roles (Owner, Manager, Front Desk, Housekeeping), and monitor browser-side accounts.
          </p>
        </div>

        <button
          onClick={openAddStaff}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Browser Storage Notice:</strong> Accounts are stored in this browser for now. Server-side authentication will replace this when the backend is added.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Role & Title</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {staffUsers.map((staff) => {
                const staffBranch = branches.find((b) => b.id === staff.branchId);
                const isDeactivated = !staff.isActive;
                const isSelf = currentUser?.id === staff.id;

                return (
                  <tr key={staff.id} className={`hover:bg-slate-50/80 transition-colors ${isDeactivated ? 'bg-slate-50/50 opacity-60' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {staff.name}
                        {isSelf && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{staff.phone || 'No phone'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800 font-semibold">{staff.username}</div>
                      <span className="text-[10px] text-slate-500">{staff.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        staff.role === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : staff.role === 'manager'
                          ? 'bg-indigo-100 text-indigo-800'
                          : staff.role === 'front_desk'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {staff.role.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{staff.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {staff.role === 'owner' ? 'All Branches (Owner)' : (staffBranch?.name || 'Main Branch')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isDeactivated ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isDeactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openResetPasswordModal(staff)}
                          className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center gap-1"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Reset Pw</span>
                        </button>

                        <button
                          onClick={() => toggleStaffActive(staff.id, isDeactivated)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                            isDeactivated
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {isDeactivated ? 'Reactivate' : 'Deactivate'}
                        </button>

                        <button
                          onClick={() => openEditStaff(staff)}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="Edit Staff"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          Staff Activity Log & Sign-In History
        </h4>
        {staffActivityLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No staff activity recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {staffActivityLogs.map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span>{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({log.actorName})</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD / EDIT STAFF ================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Add New Staff Member'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {staffFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{staffFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={staffFormName}
                  onChange={(e) => setStaffFormName(e.target.value)}
                  placeholder="e.g. Marie Claire"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={staffFormUsername}
                    onChange={(e) => setStaffFormUsername(e.target.value)}
                    placeholder="e.g. marie"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono lowercase font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {!editingStaff && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password (min 8) *</label>
                    <input
                      type="password"
                      value={staffFormPassword}
                      onChange={(e) => setStaffFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={staffFormRole}
                    onChange={(e) => setStaffFormRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="front_desk" className="text-slate-900">Front Desk</option>
                    <option value="housekeeping" className="text-slate-900">Housekeeping</option>
                    <option value="manager" className="text-slate-900">Manager</option>
                    <option value="owner" className="text-slate-900">Owner</option>
                  </select>
                </div>

                {staffFormRole !== 'owner' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Branch *</label>
                    <select
                      value={staffFormBranchId}
                      onChange={(e) => setStaffFormBranchId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {branches.filter((b) => b.isActive).map((b) => (
                        <option key={b.id} value={b.id} className="text-slate-900">
                          {b.name} ({b.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={staffFormTitle}
                    onChange={(e) => setStaffFormTitle(e.target.value)}
                    placeholder="e.g. Senior Receptionist"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={staffFormPhone}
                    onChange={(e) => setStaffFormPhone(e.target.value)}
                    placeholder="+237 ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={staffFormEmail}
                  onChange={(e) => setStaffFormEmail(e.target.value)}
                  placeholder="staff@hotel.com"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffFormSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {staffFormSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Reset Password: {resetPasswordStaff.name}</h3>
              </div>
              <button
                onClick={() => setResetPasswordStaff(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="p-5 space-y-4 text-xs">
              {resetPwError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetPwError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (min 8 characters) *</label>
                <input
                  type="password"
                  value={resetPwValue}
                  onChange={(e) => setResetPwValue(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={resetPwConfirm}
                  onChange={(e) => setResetPwConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordStaff(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPwSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {resetPwSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
