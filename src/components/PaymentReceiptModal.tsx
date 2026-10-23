import React from 'react';
import { useHMS } from '../context/HMSContext';
import { FolioTransaction, Reservation } from '../types/hms';
import { Printer, X, Receipt, CheckCircle2, Building, User, Calendar } from 'lucide-react';

interface PaymentReceiptModalProps {
  transaction: FolioTransaction;
  reservation: Reservation;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  transaction,
  reservation,
  onClose
}) => {
  const { transactions, hotelConfig, branches, activeBranch, formatMoney } = useHMS();

  const resBranch =
    branches.find((b) => b.id === reservation.branchId) || activeBranch || branches[0];
  const hotelName = (resBranch?.name && resBranch.name.trim()) || hotelConfig.name;
  const hotelAddress = (resBranch?.address && resBranch.address.trim()) || hotelConfig.address;
  const hotelCity = (resBranch?.city && resBranch.city.trim()) || hotelConfig.city;
  const hotelPhone = (resBranch?.phone && resBranch.phone.trim()) || hotelConfig.phone;

  // If this is part of a split payment group, find all non-voided transactions in the group
  const relatedTransactions = transaction.splitGroupId
    ? transactions.filter((t) => t.splitGroupId === transaction.splitGroupId && !t.voided)
    : [transaction];

  const totalAmount = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const isRefund = transaction.category === 'refund' || totalAmount < 0;
  const receiptTitle = isRefund ? 'REFUND VOUCHER' : 'OFFICIAL PAYMENT RECEIPT';
  const receiptNumber = transaction.reference || transaction.splitGroupId || transaction.id;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 print:shadow-none print:border-none print:m-0 print:max-w-full">
        {/* Modal Top Bar (Screen only) */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Official Payment Receipt</h2>
              <p className="text-xs text-slate-400">Ref: {receiptNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 print:p-0">
          {/* Header */}
          <div className="text-center space-y-1 pb-4 border-b border-slate-200">
            <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
              {hotelName}
            </h1>
            <p className="text-xs text-slate-600">
              {[hotelAddress, hotelCity].filter(Boolean).join(', ')}
            </p>
            {hotelPhone && (
              <p className="text-xs text-slate-600">Tel: {hotelPhone}</p>
            )}
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-slate-100 text-slate-800 border border-slate-300">
                {receiptTitle}
              </span>
            </div>
          </div>

          {/* Receipt & Guest Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Receipt Number</span>
              <span className="font-mono font-bold text-slate-900">{receiptNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Date & Time</span>
              <span className="font-mono text-slate-800">{transaction.timestamp}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Guest Name</span>
              <span className="font-bold text-slate-900">{reservation.guestName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Room / Booking</span>
              <span className="font-semibold text-slate-900">
                Room #{reservation.roomNumber} ({reservation.bookingCode})
              </span>
            </div>
          </div>

          {/* Payment Lines Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Payment Breakdown
            </span>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {relatedTransactions.map((line, idx) => (
                <div key={line.id || idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      {line.paymentMethod ? line.paymentMethod.replace(/_/g, ' ').toUpperCase() : 'PAYMENT'}
                    </div>
                    <div className="text-[11px] text-slate-500">{line.description}</div>
                    {line.reference && (
                      <div className="text-[10px] font-mono text-slate-400">Ref: {line.reference}</div>
                    )}
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-900">
                    {formatMoney(Math.abs(line.amount))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Received Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              {isRefund ? 'Total Refunded' : 'Total Amount Received'}
            </span>
            <span className="text-xl font-bold font-mono text-emerald-800">
              {formatMoney(Math.abs(totalAmount))}
            </span>
          </div>

          {/* Signoff / Recorded By */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              <span>Recorded By: </span>
              <strong className="text-slate-800 font-semibold">{transaction.recordedBy}</strong>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" /> Setteled & Verified
              </span>
            </div>
          </div>
        </div>

        {/* Footer (Screen only) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
