import React, { useState, useEffect, useMemo } from 'react';
import { useHMS } from '../../context/HMSContext';
import { CancellationPolicy, CancellationPolicyTier, CancellationFeeType } from '../../types/hms';
import { calculateCancellationFee, DEFAULT_CANCELLATION_POLICY, getCancellationPolicySummary } from '../../utils/cancellationPolicy';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
  PlusCircle,
  Edit3,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export const CancellationPolicySettings: React.FC = () => {
  const { hotelConfig, updateHotelConfig, currentUser, formatMoney } = useHMS();

  const isManagerOrOwner = currentUser?.role === 'manager' || currentUser?.role === 'owner';

  const [policyTiers, setPolicyTiers] = useState<CancellationPolicyTier[]>(() => {
    return hotelConfig.cancellationPolicy?.tiers ? [...hotelConfig.cancellationPolicy.tiers] : [];
  });
  const [noShowFeeType, setNoShowFeeType] = useState<CancellationFeeType>(() => {
    return hotelConfig.cancellationPolicy?.noShow?.feeType || 'nights';
  });
  const [noShowValue, setNoShowValue] = useState<number>(() => {
    return hotelConfig.cancellationPolicy?.noShow?.value ?? 1;
  });
  const [allowNonRefundable, setAllowNonRefundable] = useState<boolean>(() => {
    return hotelConfig.cancellationPolicy?.allowNonRefundable ?? false;
  });
  const [policySaveSuccess, setPolicySaveSuccess] = useState<string | null>(null);
  const [policySaveError, setPolicySaveError] = useState<string | null>(null);

  // Sync when hotelConfig changes
  useEffect(() => {
    if (hotelConfig.cancellationPolicy) {
      setPolicyTiers([...(hotelConfig.cancellationPolicy.tiers || [])]);
      setNoShowFeeType(hotelConfig.cancellationPolicy.noShow?.feeType || 'nights');
      setNoShowValue(hotelConfig.cancellationPolicy.noShow?.value ?? 1);
      setAllowNonRefundable(hotelConfig.cancellationPolicy.allowNonRefundable ?? false);
    }
  }, [hotelConfig.cancellationPolicy]);

  // Tier modal state
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTierIndex, setEditingTierIndex] = useState<number | null>(null);
  const [tierDays, setTierDays] = useState<number>(1);
  const [tierFeeType, setTierFeeType] = useState<CancellationFeeType>('nights');
  const [tierValue, setTierValue] = useState<number>(1);
  const [tierError, setTierError] = useState<string | null>(null);

  const openAddTier = () => {
    setEditingTierIndex(null);
    setTierDays(1);
    setTierFeeType('nights');
    setTierValue(1);
    setTierError(null);
    setShowTierModal(true);
  };

  const openEditTier = (index: number) => {
    const tier = policyTiers[index];
    if (!tier) return;
    setEditingTierIndex(index);
    setTierDays(tier.daysBeforeArrival);
    setTierFeeType(tier.feeType);
    setTierValue(tier.value);
    setTierError(null);
    setShowTierModal(true);
  };

  const handleDeleteTier = (index: number) => {
    setPolicyTiers((prev) => prev.filter((_, i) => i !== index));
    setPolicySaveSuccess(null);
    setPolicySaveError(null);
  };

  const handleSaveTier = (e: React.FormEvent) => {
    e.preventDefault();
    setTierError(null);

    const days = Number(tierDays);
    const val = Number(tierValue);

    if (isNaN(days) || days < 0 || !Number.isInteger(days)) {
      setTierError('Days before arrival must be a non-negative whole number (0 or greater).');
      return;
    }

    if (isNaN(val)) {
      setTierError('Fee value is invalid.');
      return;
    }

    if (tierFeeType === 'percent') {
      if (val < 0 || val > 100) {
        setTierError('Percentage must be between 0 and 100%.');
        return;
      }
    } else {
      if (val <= 0) {
        setTierError('Nights charge must be greater than 0.');
        return;
      }
    }

    // Check uniqueness of daysBeforeArrival
    const duplicate = policyTiers.some(
      (t, i) => t.daysBeforeArrival === days && (editingTierIndex === null || i !== editingTierIndex)
    );
    if (duplicate) {
      setTierError(`A tier for ${days} day(s) before arrival already exists.`);
      return;
    }

    const newTier: CancellationPolicyTier = {
      daysBeforeArrival: days,
      feeType: tierFeeType,
      value: val
    };

    if (editingTierIndex !== null) {
      setPolicyTiers((prev) => {
        const next = [...prev];
        next[editingTierIndex] = newTier;
        return next.sort((a, b) => a.daysBeforeArrival - b.daysBeforeArrival);
      });
    } else {
      setPolicyTiers((prev) => {
        const next = [...prev, newTier];
        return next.sort((a, b) => a.daysBeforeArrival - b.daysBeforeArrival);
      });
    }

    setShowTierModal(false);
    setPolicySaveSuccess(null);
  };

  const handleSaveFullPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaveError(null);
    setPolicySaveSuccess(null);

    const nsVal = Number(noShowValue);
    if (isNaN(nsVal)) {
      setPolicySaveError('No-show fee value is required.');
      return;
    }
    if (noShowFeeType === 'percent') {
      if (nsVal < 0 || nsVal > 100) {
        setPolicySaveError('No-show fee percentage must be between 0 and 100%.');
        return;
      }
    } else {
      if (nsVal <= 0) {
        setPolicySaveError('No-show nights charge must be greater than 0.');
        return;
      }
    }

    // Validate tier uniqueness & ranges
    const seenDays = new Set<number>();
    for (const t of policyTiers) {
      if (t.daysBeforeArrival < 0 || !Number.isInteger(t.daysBeforeArrival)) {
        setPolicySaveError('All tier days must be 0 or greater.');
        return;
      }
      if (seenDays.has(t.daysBeforeArrival)) {
        setPolicySaveError(`Duplicate tier for ${t.daysBeforeArrival} day(s) before arrival.`);
        return;
      }
      seenDays.add(t.daysBeforeArrival);

      if (t.feeType === 'percent') {
        if (t.value < 0 || t.value > 100) {
          setPolicySaveError(`Tier fee for ${t.daysBeforeArrival} days must be between 0 and 100%.`);
          return;
        }
      } else {
        if (t.value <= 0) {
          setPolicySaveError(`Tier fee for ${t.daysBeforeArrival} days must be greater than 0 nights.`);
          return;
        }
      }
    }

    const sortedTiers = [...policyTiers].sort((a, b) => a.daysBeforeArrival - b.daysBeforeArrival);

    const updatedPolicy: CancellationPolicy = {
      tiers: sortedTiers,
      noShow: {
        feeType: noShowFeeType,
        value: nsVal
      },
      allowNonRefundable
    };

    updateHotelConfig({
      cancellationPolicy: updatedPolicy
    });
    setPolicySaveSuccess('Cancellation policy saved successfully and persisted across sessions.');
  };

  // Live simulation state
  const [simDaysBefore, setSimDaysBefore] = useState<number>(2);
  const [simStayNights, setSimStayNights] = useState<number>(3);
  const [simNightlyRate, setSimNightlyRate] = useState<number>(25000);
  const [simIsNoShow, setSimIsNoShow] = useState<boolean>(false);
  const [simRateType, setSimRateType] = useState<'flexible' | 'non_refundable'>('flexible');

  const draftPolicy: CancellationPolicy = useMemo(() => ({
    tiers: policyTiers,
    noShow: { feeType: noShowFeeType, value: Number(noShowValue) || 1 },
    allowNonRefundable
  }), [policyTiers, noShowFeeType, noShowValue, allowNonRefundable]);

  const activePolicyForSim = isManagerOrOwner
    ? draftPolicy
    : (hotelConfig.cancellationPolicy || DEFAULT_CANCELLATION_POLICY);

  const simResult = useMemo(() => {
    const base = new Date(2026, 9, 15);
    const checkIn = new Date(base.getTime() + simDaysBefore * 86400000);
    const toIso = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const totalStay = (Number(simStayNights) || 1) * (Number(simNightlyRate) || 0);

    return calculateCancellationFee({
      policy: activePolicyForSim,
      booking: {
        checkInDate: toIso(checkIn),
        totalAmount: totalStay,
        nightlyRate: Number(simNightlyRate) || 0,
        rateType: simRateType,
        totalNights: Number(simStayNights) || 1
      },
      businessDate: toIso(base),
      isNoShow: simIsNoShow
    });
  }, [activePolicyForSim, simDaysBefore, simStayNights, simNightlyRate, simIsNoShow, simRateType]);

  return (
    <div className="space-y-6">
      {!isManagerOrOwner ? (
        /* READ-ONLY SUMMARY FOR NON-MANAGERS/NON-OWNERS */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Read-Only View:</strong> Manager or Owner access is required to modify cancellation policies and tiers.
              </span>
            </div>
            <span className="text-[11px] bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full font-bold">
              View Only
            </span>
          </div>

          {/* Policy Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">General Terms</span>
              <div className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>{getCancellationPolicySummary(hotelConfig.cancellationPolicy)}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Non-Refundable Rates</span>
              <div className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    hotelConfig.cancellationPolicy?.allowNonRefundable ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                <span>
                  {hotelConfig.cancellationPolicy?.allowNonRefundable ? 'Allowed & Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">No-Show Penalty</span>
              <div className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  {hotelConfig.cancellationPolicy?.noShow?.feeType === 'percent'
                    ? `${hotelConfig.cancellationPolicy.noShow.value}% of booking total`
                    : `${hotelConfig.cancellationPolicy?.noShow?.value || 1} night(s) charge`}
                </span>
              </div>
            </div>
          </div>

          {/* Tiers Table (Read-Only) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Cancellation Tiers</h3>
                <p className="text-xs text-slate-500">Tier rules applied depending on days prior to arrival.</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                {hotelConfig.cancellationPolicy?.tiers?.length || 0} active tier(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Notice Window</th>
                    <th className="py-3 px-4">Fee Type</th>
                    <th className="py-3 px-4">Fee Value</th>
                    <th className="py-3 px-4">Effective Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(hotelConfig.cancellationPolicy?.tiers || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No cancellation tiers defined. Standard cancellations are free outside no-shows.
                      </td>
                    </tr>
                  ) : (
                    (hotelConfig.cancellationPolicy?.tiers || []).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ≤ {t.daysBeforeArrival} day{t.daysBeforeArrival === 1 ? '' : 's'} before arrival
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-700">
                          {t.feeType === 'percent' ? 'Percentage' : 'Nights Charge'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {t.feeType === 'percent' ? `${t.value}%` : `${t.value} night(s)`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {t.feeType === 'percent'
                            ? `Charge ${t.value}% of total stay`
                            : `Charge ${t.value} night(s) rate`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Calculator for Read-Only */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Fee Calculation Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Test how the hotel's cancellation policy calculates suggested fees for any reservation scenario.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Days Before Arrival</label>
                <input
                  type="number"
                  value={simDaysBefore}
                  onChange={(e) => setSimDaysBefore(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stay Duration (Nights)</label>
                <input
                  type="number"
                  min={1}
                  value={simStayNights}
                  onChange={(e) => setSimStayNights(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nightly Rate ({hotelConfig.defaultCurrency})</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={simNightlyRate}
                  onChange={(e) => setSimNightlyRate(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white"
                />
              </div>
              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={simIsNoShow}
                    onChange={(e) => setSimIsNoShow(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span>Marked as No-Show</span>
                </label>
                {hotelConfig.cancellationPolicy?.allowNonRefundable && (
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={simRateType === 'non_refundable'}
                      onChange={(e) => setSimRateType(e.target.checked ? 'non_refundable' : 'flexible')}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    <span>Non-refundable Rate</span>
                  </label>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Calculation Output</span>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{simResult.ruleText}</p>
                <span className="text-slate-500 text-[11px] mt-0.5 block">
                  Total Booking: {formatMoney(simStayNights * simNightlyRate)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Suggested Fee</span>
                <span className="text-base font-mono font-bold text-rose-600">
                  {formatMoney(simResult.suggestedFee)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* FULL EDITOR FOR MANAGERS & OWNERS */
        <form onSubmit={handleSaveFullPolicy} className="space-y-6">
          {/* Header card with action buttons */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Property Cancellation Policy & Tier Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure tiered cancellation windows, no-show penalties, and non-refundable booking availability.
              </p>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Policy Settings</span>
            </button>
          </div>

          {/* Status alerts */}
          {policySaveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{policySaveSuccess}</span>
            </div>
          )}
          {policySaveError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{policySaveError}</span>
            </div>
          )}

          {/* Policy summary banner preview */}
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-slate-600">Current Guest Policy Display:</span>
              <span className="font-bold text-indigo-950">{getCancellationPolicySummary(draftPolicy)}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Live Preview</span>
          </div>

          {/* Top settings row: Non-refundable toggle & No-show rule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Non-refundable toggle */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Allow Non-Refundable Bookings</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permit front-desk staff to mark bookings as non-refundable. Cancellations or no-shows incur 100% of stay cost.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={allowNonRefundable}
                    onChange={(e) => {
                      setAllowNonRefundable(e.target.checked);
                      setPolicySaveSuccess(null);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${allowNonRefundable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>Status: {allowNonRefundable ? 'Available on booking forms' : 'Disabled across property'}</span>
              </div>
            </div>

            {/* No-show rule */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div>
                <h4 className="font-bold text-xs text-slate-900">No-Show Rule & Default Penalty</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fee automatically calculated when reservations are marked as No-Show.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fee Type</label>
                  <select
                    value={noShowFeeType}
                    onChange={(e) => {
                      setNoShowFeeType(e.target.value as CancellationFeeType);
                      setPolicySaveSuccess(null);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white"
                  >
                    <option value="nights">Nights Charge</option>
                    <option value="percent">Percentage of Total (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fee Value {noShowFeeType === 'percent' ? '(0 - 100%)' : '(Nights > 0)'}
                  </label>
                  <input
                    type="number"
                    min={noShowFeeType === 'percent' ? 0 : 1}
                    max={noShowFeeType === 'percent' ? 100 : undefined}
                    value={noShowValue}
                    onChange={(e) => {
                      setNoShowValue(Number(e.target.value) || 0);
                      setPolicySaveSuccess(null);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tiers Table with Add, Edit, Remove */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Cancellation Policy Tiers
                </h3>
                <p className="text-xs text-slate-500">
                  Define fees based on days remaining until check-in. The matching tier with the lowest daysBeforeArrival applies.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddTier}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Tier</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Notice Window</th>
                    <th className="py-3 px-4">Fee Structure</th>
                    <th className="py-3 px-4">Penalty Value</th>
                    <th className="py-3 px-4">Rule Explanation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {policyTiers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs italic">No cancellation tiers defined yet.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cancellations will be free of charge until arrival date. Click "Add Tier" to create penalty tiers.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    policyTiers.map((tier, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          ≤ {tier.daysBeforeArrival} day{tier.daysBeforeArrival === 1 ? '' : 's'} before arrival
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                            {tier.feeType === 'percent' ? 'Percentage' : 'Nights Charge'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {tier.feeType === 'percent' ? `${tier.value}%` : `${tier.value} night(s)`}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {tier.feeType === 'percent'
                            ? `Charge ${tier.value}% of booking total`
                            : `Charge ${tier.value} night(s) base room rate`}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditTier(idx)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit tier"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTier(idx)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Example Under the Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  Live Cancellation Simulation & Validation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify your policy behavior against real-time sample bookings computed via calculateCancellationFee.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-bold border border-rose-200">
                Live Engine
              </span>
            </div>

            {/* Example summary callout */}
            <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Example Scenario</span>
                <span className="font-mono text-xs text-amber-300">
                  Cancel {simDaysBefore} day{simDaysBefore === 1 ? '' : 's'} before a {simStayNights}-night stay at {formatMoney(simNightlyRate)} per night ➔ Fee {formatMoney(simResult.suggestedFee)}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 shrink-0">
                Rule: <span className="text-white font-semibold">{simResult.ruleText}</span>
              </span>
            </div>

            {/* Interactive Simulator Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Days Before Arrival</label>
                <input
                  type="number"
                  value={simDaysBefore}
                  onChange={(e) => setSimDaysBefore(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stay Duration (Nights)</label>
                <input
                  type="number"
                  min={1}
                  value={simStayNights}
                  onChange={(e) => setSimStayNights(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nightly Rate ({hotelConfig.defaultCurrency})</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={simNightlyRate}
                  onChange={(e) => setSimNightlyRate(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white"
                />
              </div>
              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={simIsNoShow}
                    onChange={(e) => setSimIsNoShow(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 cursor-pointer"
                  />
                  <span>Marked as No-Show</span>
                </label>
                {allowNonRefundable && (
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={simRateType === 'non_refundable'}
                      onChange={(e) => setSimRateType(e.target.checked ? 'non_refundable' : 'flexible')}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 cursor-pointer"
                    />
                    <span>Non-refundable Rate</span>
                  </label>
                )}
              </div>
            </div>

            {/* Calculation Output Cards */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Stay Amount</span>
                <span className="text-sm font-mono font-bold text-slate-900 mt-0.5 block">
                  {formatMoney(simStayNights * simNightlyRate)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {simStayNights} night(s) × {formatMoney(simNightlyRate)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Suggested Fee</span>
                <span className="text-base font-mono font-bold text-rose-600 mt-0.5 block">
                  {formatMoney(simResult.suggestedFee)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block truncate" title={simResult.ruleText}>
                  {simResult.ruleText}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Guest Refund</span>
                <span className="text-sm font-mono font-bold text-emerald-700 mt-0.5 block">
                  {formatMoney(Math.max(0, simStayNights * simNightlyRate - simResult.suggestedFee))}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Assuming 100% advance deposit
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Cancellation Policy</span>
            </button>
          </div>
        </form>
      )}

      {/* ================= MODAL: ADD / EDIT CANCELLATION TIER ================= */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">
                  {editingTierIndex !== null ? 'Edit Cancellation Tier' : 'Add Cancellation Tier'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTierModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="p-5 space-y-4 text-xs">
              {tierError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tierError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Days Before Arrival (≤ N days) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={tierDays}
                  onChange={(e) => setTierDays(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Applies when cancellation occurs N or fewer days before arrival (0 = arrival day).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fee Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={tierFeeType}
                  onChange={(e) => setTierFeeType(e.target.value as CancellationFeeType)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="nights">Number of Nights Charge</option>
                  <option value="percent">Percentage of Stay Total (%)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fee Value {tierFeeType === 'percent' ? '(0 - 100%)' : '(Nights > 0)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={tierFeeType === 'percent' ? 0 : 1}
                  max={tierFeeType === 'percent' ? 100 : undefined}
                  step={1}
                  value={tierValue}
                  onChange={(e) => setTierValue(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTierModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingTierIndex !== null ? 'Save Changes' : 'Add Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
