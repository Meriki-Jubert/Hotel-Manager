import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { Reservation, FolioTransaction, PaymentMethod } from '../types/hms';
import { getFolioTotals } from '../utils/folio';
import { validateSplitPayment } from '../utils/folioAdjustments';
import { DiscountModal } from './DiscountModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import {
  X,
  Printer,
  Receipt,
  PlusCircle,
  CreditCard,
  Building,
  User,
  Calendar,
  DollarSign,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Tag,
  Split,
  Trash2
} from 'lucide-react';

interface GuestFolioModalProps {
  reservation: Reservation;
  onClose: () => void;
}

export const GuestFolioModal: React.FC<GuestFolioModalProps> = ({ reservation, onClose }) => {
  const {
    transactions,
    addFolioCharge,
    recordFolioPayment,
    voidTransaction,
    formatMoney,
    businessDate,
    canVoidTransactions,
    isReadOnly,
    hotelConfig,
    branches,
    activeBranch,
    currentUser
  } = useHMS();

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<FolioTransaction | null>(null);

  // Split payment state
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitLines, setSplitLines] = useState<Array<{ id: string; method: PaymentMethod; amount: number }>>([
    { id: '1', method: 'momo', amount: 5000 },
    { id: '2', method: 'cash', amount: 5000 }
  ]);
  const [splitError, setSplitError] = useState<string | null>(null);

  const resBranch = branches.find((b) => b.id === reservation.branchId) || activeBranch || branches[0];
  const invName = (resBranch?.name && resBranch.name.trim()) || hotelConfig.name;
  const invAddress = (resBranch?.address && resBranch.address.trim()) || hotelConfig.address;
  const invCity = (resBranch?.city && resBranch.city.trim()) || hotelConfig.city;
  const invPhone = (resBranch?.phone && resBranch.phone.trim()) || hotelConfig.phone;

  const [activeView, setActiveView] = useState<'ledger' | 'printable'>('ledger');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [voidingTxId, setVoidingTxId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('Incorrect post / managerial adjustment');

  // New charge inputs
  const [chargeCategory, setChargeCategory] = useState<FolioTransaction['category']>('restaurant');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState<number>(5000);

  // New payment inputs
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('momo');
  const [payRef, setPayRef] = useState('');

  // Transactions for this reservation
  const folioTxs = transactions.filter((t) => t.reservationId === reservation.id);
  const activeCharges = folioTxs.filter((t) => !t.voided && t.type === 'charge');
  const activePayments = folioTxs.filter((t) => !t.voided && t.type === 'payment');

  const totals = getFolioTotals(transactions, reservation.id);
  const totalCharges = totals.charges;
  const totalPaid = totals.netPaid;
  const balance = totals.balance;

  const handleCreateCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeDesc.trim() || chargeAmount <= 0) return;

    addFolioCharge({
      reservationId: reservation.id,
      guestId: reservation.guestId,
      roomNumber: reservation.roomNumber,
      category: chargeCategory,
      description: chargeDesc.trim(),
      amount: Number(chargeAmount),
      type: 'charge',
      recordedBy: 'Front Desk Operator'
    });

    setChargeDesc('');
    setShowAddCharge(false);
  };

  const handleAddSplitLine = () => {
    setSplitLines((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), method: 'cash', amount: 0 }
    ]);
  };

  const handleRemoveSplitLine = (id: string) => {
    if (splitLines.length <= 1) return;
    setSplitLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateSplitLine = (id: string, field: 'method' | 'amount', val: any) => {
    setSplitLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setSplitError(null);

    if (payAmount <= 0) {
      setSplitError('Payment amount must be greater than zero.');
      return;
    }

    if (isSplitPayment) {
      const validation = validateSplitPayment({
        totalAmount: Number(payAmount),
        lines: splitLines.map((l) => ({ method: l.method, amount: Number(l.amount) }))
      });

      if (!validation.valid) {
        setSplitError(validation.error || 'Split lines do not equal total payment amount.');
        return;
      }

      const splitGroupId = `SPLIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const operatorName = currentUser?.name || 'Front Desk Operator';
      const createdTxs: FolioTransaction[] = [];

      splitLines.forEach((line, idx) => {
        const txRef = payRef.trim()
          ? `${payRef.trim()}-${idx + 1}`
          : `${line.method.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

        const txPayload = {
          reservationId: reservation.id,
          guestId: reservation.guestId,
          roomNumber: reservation.roomNumber,
          category: 'payment' as const,
          description: `Folio Payment (${line.method.toUpperCase()} - Split ${idx + 1}/${splitLines.length})`,
          amount: Number(line.amount),
          paymentMethod: line.method,
          reference: txRef,
          splitGroupId,
          recordedBy: operatorName
        };

        recordFolioPayment(txPayload);
        createdTxs.push({
          ...txPayload,
          id: `tx-${Date.now()}-${idx}`,
          timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
          type: 'payment'
        });
      });

      setPayAmount(0);
      setPayRef('');
      setShowAddPayment(false);
      setSplitError(null);

      if (createdTxs.length > 0) {
        setSelectedReceiptTx(createdTxs[0]);
      }
      return;
    }

    // Single payment mode
    const singleRef =
      payRef.trim() || `${payMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const operatorName = currentUser?.name || 'Front Desk Operator';

    const txPayload = {
      reservationId: reservation.id,
      guestId: reservation.guestId,
      roomNumber: reservation.roomNumber,
      category: 'payment' as const,
      description: `Folio Payment (${payMethod.toUpperCase()})`,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      reference: singleRef,
      recordedBy: operatorName
    };

    recordFolioPayment(txPayload);

    setPayAmount(0);
    setPayRef('');
    setShowAddPayment(false);

    setSelectedReceiptTx({
      ...txPayload,
      id: `tx-${Date.now()}`,
      timestamp: `${businessDate} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      type: 'payment'
    });
  };

  const handleConfirmVoid = (txId: string) => {
    if (!voidReason.trim()) return;
    voidTransaction(txId, voidReason);
    setVoidingTxId(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Guest Folio & Invoicing</h2>
                <span className="font-mono text-xs bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700">
                  {reservation.bookingCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Itemized Hotel Stay Ledger • Room #{reservation.roomNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-lg flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setActiveView('ledger')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-colors ${
                  activeView === 'ledger' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ledger
              </button>
              <button
                onClick={() => setActiveView('printable')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-colors ${
                  activeView === 'printable' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Invoice
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
              title="Print Receipt / PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeView === 'ledger' ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">Total Charges</span>
                  <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                    {formatMoney(totalCharges)}
                  </span>
                  <span className="text-[10px] text-slate-400">{activeCharges.length} item(s)</span>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-semibold block">Payments Received</span>
                  <span className="text-lg font-bold font-mono text-emerald-800 mt-1 block">
                    {formatMoney(totalPaid)}
                  </span>
                  <span className="text-[10px] text-emerald-600">{activePayments.length} payment(s)</span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    balance > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className="text-xs font-semibold block opacity-80">Net Balance Due</span>
                  <span
                    className={`text-lg font-bold font-mono mt-1 block ${
                      balance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {balance > 0 ? formatMoney(balance) : '0 FCFA (Settled)'}
                  </span>
                  <span className="text-[10px] opacity-75">
                    {balance > 0 ? 'Pending collection' : 'No balance due'}
                  </span>
                </div>
              </div>

              {/* Guest & Stay Context */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{reservation.guestName}</span>
                  </div>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-mono">{reservation.guestPhone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Room #{reservation.roomNumber}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {reservation.checkInDate} to {reservation.checkOutDate} ({reservation.totalNights} nts)
                  </span>
                </div>
              </div>

              {/* Room Moves Transfer History Note */}
              {reservation.roomMoves && reservation.roomMoves.length > 0 && (
                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-xs space-y-1.5 animate-in fade-in">
                  <span className="font-bold text-blue-900 block text-[11px] uppercase tracking-wider">
                    Room Transfer History
                  </span>
                  {reservation.roomMoves.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-700 flex-wrap">
                      <span className="font-semibold text-blue-900">
                        Room moved from #{m.fromRoom} to #{m.toRoom}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">Reason: <em className="font-medium text-slate-800">{m.reason}</em></span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500 font-mono">By {m.by}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons (Restricted if Read Only) */}
              {!isReadOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setShowAddCharge(!showAddCharge);
                      setShowAddPayment(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Post Incidental Charge</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAddPayment(!showAddPayment);
                      setShowAddCharge(false);
                      setPayAmount(balance > 0 ? balance : 10000);
                      const initialAmt = balance > 0 ? balance : 10000;
                      const half = Math.round(initialAmt / 2);
                      setSplitLines([
                        { id: '1', method: 'momo', amount: half },
                        { id: '2', method: 'cash', amount: initialAmt - half }
                      ]);
                      setSplitError(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>

                  {isManager && (
                    <button
                      onClick={() => {
                        setShowDiscountModal(true);
                        setShowAddCharge(false);
                        setShowAddPayment(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Give Discount</span>
                    </button>
                  )}
                </div>
              )}

              {/* Collapsible Add Charge Form */}
              {showAddCharge && (
                <form
                  onSubmit={handleCreateCharge}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3 animate-in fade-in"
                >
                  <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Add New Incidental Charge to Folio</span>
                    <button
                      type="button"
                      onClick={() => setShowAddCharge(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={chargeCategory}
                        onChange={(e: any) => setChargeCategory(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        <option value="restaurant">Restaurant / Dining</option>
                        <option value="beverage">Bar & Minibar</option>
                        <option value="laundry">Laundry & Pressing</option>
                        <option value="maintenance_charge">Damages / Repairs</option>
                        <option value="late_checkout">Late Check-Out Fee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. 2x Oku Coffee & Club Sandwich"
                        value={chargeDesc}
                        onChange={(e) => setChargeDesc(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount (FCFA)</label>
                      <input
                        type="number"
                        min="500"
                        step="500"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      Confirm Charge
                    </button>
                  </div>
                </form>
              )}

              {/* Collapsible Add Payment Form (with Split Payment Support) */}
              {showAddPayment && (
                <form
                  onSubmit={handleCreatePayment}
                  className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300 space-y-3.5 animate-in fade-in"
                >
                  <div className="font-bold text-xs text-emerald-900 flex items-center justify-between">
                    <span>Record Guest Payment / Settlement</span>
                    <button
                      type="button"
                      onClick={() => setShowAddPayment(false)}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Single vs Split Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-900">Payment Mode:</span>
                    <div className="inline-flex rounded-lg border border-emerald-300 bg-white p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSplitPayment(false);
                          setSplitError(null);
                        }}
                        className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          !isSplitPayment
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Single Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSplitPayment(true);
                          setSplitError(null);
                          const amt = Number(payAmount) > 0 ? Number(payAmount) : (balance > 0 ? balance : 10000);
                          const half = Math.round(amt / 2);
                          setSplitLines([
                            { id: '1', method: 'momo', amount: half },
                            { id: '2', method: 'cash', amount: amt - half }
                          ]);
                        }}
                        className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                          isSplitPayment
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>Split Payment</span>
                      </button>
                    </div>
                  </div>

                  {splitError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{splitError}</span>
                    </div>
                  )}

                  {!isSplitPayment ? (
                    /* Single Payment Mode */
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">Payment Method</label>
                        <select
                          value={payMethod}
                          onChange={(e: any) => setPayMethod(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-medium text-slate-900"
                        >
                          <option value="momo">MTN Mobile Money</option>
                          <option value="orange_money">Orange Money</option>
                          <option value="cash">Cash (FCFA)</option>
                          <option value="card">Credit / Debit Card</option>
                          <option value="bank_transfer">Bank Wire Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">Amount Received</label>
                        <input
                          type="number"
                          min="100"
                          step="100"
                          value={payAmount}
                          onChange={(e) => setPayAmount(Number(e.target.value))}
                          className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-slate-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">Reference / Receipt #</label>
                        <input
                          type="text"
                          placeholder="MOMO-982143"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-mono text-slate-900 placeholder-slate-400 font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Split Payment Mode */
                    <div className="space-y-3 bg-white/80 p-3.5 rounded-xl border border-emerald-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Total Payment Amount to Collect
                          </label>
                          <input
                            type="number"
                            min="100"
                            step="100"
                            value={payAmount}
                            onChange={(e) => setPayAmount(Number(e.target.value))}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Group Receipt Reference (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. SPLIT-REC-01"
                            value={payRef}
                            onChange={(e) => setPayRef(e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 placeholder-slate-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            Split Lines ({splitLines.length} methods):
                          </label>
                          <button
                            type="button"
                            onClick={handleAddSplitLine}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Add Split Line</span>
                          </button>
                        </div>

                        {splitLines.map((line, idx) => (
                          <div key={line.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                            <div className="flex-1">
                              <select
                                value={line.method}
                                onChange={(e) => handleUpdateSplitLine(line.id, 'method', e.target.value as PaymentMethod)}
                                className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-900"
                              >
                                <option value="momo">MTN Mobile Money</option>
                                <option value="orange_money">Orange Money</option>
                                <option value="cash">Cash (FCFA)</option>
                                <option value="card">Credit / Debit Card</option>
                                <option value="bank_transfer">Bank Wire Transfer</option>
                              </select>
                            </div>
                            <div className="w-32">
                              <input
                                type="number"
                                min="100"
                                step="100"
                                placeholder="Amount"
                                value={line.amount || ''}
                                onChange={(e) => handleUpdateSplitLine(line.id, 'amount', Number(e.target.value))}
                                className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900"
                                required
                              />
                            </div>
                            {splitLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplitLine(line.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Remove Line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Split Reconciliation Status */}
                        {(() => {
                          const currentSum = splitLines.reduce((s, l) => s + Number(l.amount || 0), 0);
                          const diff = Number(payAmount) - currentSum;
                          const matches = Math.abs(diff) < 0.001 && Number(payAmount) > 0;
                          return (
                            <div className="flex items-center justify-between text-xs pt-1 px-1">
                              <span className="text-slate-500">
                                Lines Allocated: <strong>{formatMoney(currentSum)}</strong> / {formatMoney(Number(payAmount))}
                              </span>
                              {matches ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Sum Balanced
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  {diff > 0 ? `Unallocated: ${formatMoney(diff)}` : `Over by: ${formatMoney(Math.abs(diff))}`}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddPayment(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-xs cursor-pointer"
                    >
                      {isSplitPayment ? 'Record Split Payment' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}

              {/* Transactions Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Debit (Charge)</th>
                        <th className="py-2.5 px-3 text-right">Credit (Payment)</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {folioTxs.map((t) => (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            t.voided ? 'opacity-40 bg-slate-50 line-through' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {t.timestamp}
                          </td>
                          <td className="py-2.5 px-3 capitalize">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                t.category === 'refund'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : t.category === 'cancellation_fee' || t.category === 'no_show_fee'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : t.category === 'room_charge_void'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : t.category === 'discount'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.category === 'refund'
                                ? 'Refund'
                                : t.category === 'cancellation_fee'
                                ? 'Cancellation Fee'
                                : t.category === 'no_show_fee'
                                ? 'No-Show Fee'
                                : t.category === 'discount'
                                ? 'Discount'
                                : t.category === 'room_charge'
                                ? 'Room Charge'
                                : t.category === 'room_charge_void'
                                ? 'Stay Adjustment'
                                : t.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-900">
                            <div>{t.description}</div>
                            {t.voided && (
                              <div className="text-[10px] text-rose-600 font-bold no-underline inline-block mt-0.5">
                                [VOIDED by {t.voidedBy}: {t.voidReason}]
                              </div>
                            )}
                            {t.reference && !t.voided && (
                              <div className="text-[10px] font-mono text-slate-400">Ref: {t.reference}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {t.type === 'charge' ? formatMoney(t.amount) : '-'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                              t.category === 'refund' || t.amount < 0 ? 'text-blue-600 font-bold' : 'text-emerald-700'
                            }`}
                          >
                            {t.type === 'payment' ? formatMoney(t.amount) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {(t.type === 'payment' || t.category === 'refund') && !t.voided && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptTx(t)}
                                  className="text-[10px] text-slate-700 hover:text-slate-900 font-semibold px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                                  title="Print Payment Receipt"
                                >
                                  <Printer className="w-3 h-3 text-slate-500" />
                                  <span>Receipt</span>
                                </button>
                              )}
                              {canVoidTransactions && !t.voided && (
                                <button
                                  type="button"
                                  onClick={() => setVoidingTxId(t.id)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-50 cursor-pointer"
                                  title="Manager Void Authorization"
                                >
                                  Void
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-slate-700 text-right uppercase text-[11px]">
                          Active Total:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                          {formatMoney(totalCharges)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {formatMoney(totalPaid)}
                        </td>
                        {canVoidTransactions && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Void Prompt Dialog */}
              {voidingTxId && (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3 text-xs animate-in fade-in">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-600" />
                    Manager Folio Void Authorization
                  </div>
                  <p className="text-rose-700">
                    Are you sure you want to void this transaction? This adjustment will be audited with your manager signature.
                  </p>
                  <div>
                    <label className="block font-semibold text-rose-800 mb-1">Reason for voiding:</label>
                    <input
                      type="text"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setVoidingTxId(null)}
                      className="px-3 py-1 bg-white text-slate-700 border border-slate-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmVoid(voidingTxId)}
                      className="px-3 py-1 bg-rose-600 text-white font-bold rounded"
                    >
                      Authorize Void
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Printable Invoice */
            <div className="border border-slate-300 rounded-xl p-6 sm:p-8 bg-white text-slate-900 shadow-xs print:border-none print:p-0 space-y-6">
              
              {/* Hotel Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    {invName}
                  </h1>
                  {hotelConfig.tagline && (
                    <p className="text-xs italic text-slate-600 mt-0.5">{hotelConfig.tagline}</p>
                  )}
                  {(invAddress || invCity) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[invAddress, invCity].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {(invPhone || hotelConfig.email) && (
                    <p className="text-xs text-slate-500">
                      {[invPhone ? `Tel: ${invPhone}` : '', hotelConfig.email ? `Email: ${hotelConfig.email}` : ''].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {(hotelConfig.taxId || hotelConfig.registryNumber) && (
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                      {[hotelConfig.taxId ? `Tax ID (NIU): ${hotelConfig.taxId}` : '', hotelConfig.registryNumber ? `Registry: ${hotelConfig.registryNumber}` : ''].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block">
                    GUEST FOLIO INVOICE
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                    {reservation.bookingCode}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Date: {businessDate}</span>
                </div>
              </div>

              {/* Guest & Room Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">Billed To:</span>
                  <div className="font-bold text-sm text-slate-900 mt-1">{reservation.guestName}</div>
                  <div className="text-slate-600 mt-0.5 font-mono">Phone: {reservation.guestPhone}</div>
                  <div className="text-slate-500 mt-0.5">Method: {reservation.paymentMethod.toUpperCase()}</div>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">Stay Specifics:</span>
                  <div className="font-bold text-slate-900 mt-1">Room #{reservation.roomNumber}</div>
                  <div className="text-slate-600 mt-0.5 font-mono">{reservation.checkInDate} ➔ {reservation.checkOutDate}</div>
                  <div className="text-slate-500 mt-0.5">Duration: {reservation.totalNights} Night(s)</div>
                  {reservation.roomMoves && reservation.roomMoves.length > 0 && (
                    <div className="text-[11px] text-blue-700 font-semibold mt-1">
                      {reservation.roomMoves.map((m, idx) => (
                        <div key={idx}>• Room moved from #{m.fromRoom} to #{m.toRoom} ({m.reason})</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600">
                    <tr>
                      <th className="py-2 px-3 border-b">Item / Description</th>
                      <th className="py-2 px-3 border-b">Category</th>
                      <th className="py-2 px-3 border-b text-right">Debit</th>
                      <th className="py-2 px-3 border-b text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeCharges.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-900">{t.description}</span>
                        </td>
                        <td className="py-2 px-3 capitalize text-slate-600 text-[11px]">
                          {t.category === 'discount'
                            ? 'Discount'
                            : t.category === 'cancellation_fee'
                            ? 'Cancellation Fee'
                            : t.category === 'no_show_fee'
                            ? 'No-Show Fee'
                            : t.category === 'room_charge'
                            ? 'Room Charge'
                            : t.category === 'room_charge_void'
                            ? 'Stay Adjustment'
                            : t.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900 font-medium">
                          {t.amount < 0 ? `-${formatMoney(Math.abs(t.amount))}` : formatMoney(t.amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                      </tr>
                    ))}
                    {activePayments.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 px-3">
                          <span className={`font-semibold ${t.category === 'refund' || t.amount < 0 ? 'text-blue-800' : 'text-emerald-800'}`}>
                            {t.description}
                          </span>
                          {t.reference && <span className="text-[10px] font-mono text-slate-500 ml-1.5">({t.reference})</span>}
                        </td>
                        <td className={`py-2 px-3 capitalize text-[11px] ${t.category === 'refund' || t.amount < 0 ? 'text-blue-700 font-bold' : 'text-emerald-700'}`}>
                          {t.category === 'refund' ? 'Refund' : 'Payment'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${t.category === 'refund' || t.amount < 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                          {formatMoney(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2 border-t border-slate-200">
                <div className="space-y-2 max-w-xs text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Includes Cameroon 19.25% TVA & Tourism Tax</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px]">
                    Thank you for choosing {invName}!
                  </div>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Charges:</span>
                    <span className="font-mono">{formatMoney(totalCharges)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Payments / Deposits:</span>
                    <span className="font-mono">-{formatMoney(totalPaid)}</span>
                  </div>
                  <div className="h-px bg-slate-300 my-1.5" />
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Total Balance Due:</span>
                    <span className={`font-mono text-base ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {balance > 0 ? formatMoney(balance) : 'PAID IN FULL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 sm:gap-12 pt-8 text-xs border-t border-slate-200">
                <div className="border-t border-dashed border-slate-400 pt-2 text-center">
                  <span className="text-slate-500">Guest Signature</span>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-2 text-center">
                  <span className="text-slate-500">Authorized Cashier Stamp</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between no-print shrink-0">
          <div className="text-xs text-slate-500">
            Booking Code: <strong className="font-mono text-slate-800">{reservation.bookingCode}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Manager Discount Modal */}
      {showDiscountModal && (
        <DiscountModal
          reservation={reservation}
          chargesTotal={totalCharges}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {/* Payment Receipt Modal */}
      {selectedReceiptTx && (
        <PaymentReceiptModal
          transaction={selectedReceiptTx}
          reservation={reservation}
          onClose={() => setSelectedReceiptTx(null)}
        />
      )}
    </div>
  );
};
