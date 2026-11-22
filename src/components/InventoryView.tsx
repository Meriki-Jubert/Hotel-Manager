import React, { useMemo, useRef, useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { PosItem, StockMovementType } from '../types/hms';
import { getStockLevels, StockLevelRow } from '../utils/stock';
import { POS_CATEGORIES, validatePosItem } from '../utils/posItems';
import { SelectBranchNotice } from './SelectBranchNotice';
import { MoneyInput } from './ui/MoneyInput';
import { useT } from '../i18n/LanguageContext';
import { resultMessage } from '../i18n/messages';
import { tMenuCategory } from '../i18n/labels';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ClipboardCheck,
  ArrowDownToLine,
  SlidersHorizontal,
  Trash2,
  History,
  Edit2,
  X
} from 'lucide-react';

type MovementMode = 'receive' | 'adjust' | 'waste';

export const InventoryView: React.FC = () => {
  const { t } = useT();
  const {
    posItems,
    stockMovements,
    activeBranchId,
    activeBranch,
    currentUser,
    reservations,
    formatMoney,
    inventoryFilterLowOut,
    setInventoryFilterLowOut,
    addPosItem,
    updatePosItem,
    recordStockMovement,
    notify
  } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName={t('inventory.screenName')} />;
  }

  const isFrontDesk = currentUser?.role === 'front_desk';
  const branchLabel = activeBranch?.name || activeBranchId;

  // Toolbar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Movement modal state
  const [movementModal, setMovementModal] = useState<{
    item: PosItem;
    mode: MovementMode;
  } | null>(null);
  const [moveQtyRaw, setMoveQtyRaw] = useState<string>('1');
  const [moveReason, setMoveReason] = useState<string>('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const moveSubmittingRef = useRef(false);

  // History modal state
  const [historyItem, setHistoryItem] = useState<PosItem | null>(null);

  // Count stock modal state
  const [showCountModal, setShowCountModal] = useState(false);
  const [countedMap, setCountedMap] = useState<Record<string, string>>({});
  const [countError, setCountError] = useState<string | null>(null);
  const [isSubmittingCount, setIsSubmittingCount] = useState(false);
  const countSubmittingRef = useRef(false);

  // Add / Edit item modal state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PosItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<PosItem['category']>('Beverages');
  const [formPrice, setFormPrice] = useState<number>(1000);
  const [formUnit, setFormUnit] = useState('');
  const [formTrackStock, setFormTrackStock] = useState(true);
  const [formOpeningStock, setFormOpeningStock] = useState<string>('0');
  const [formThreshold, setFormThreshold] = useState<string>('5');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formImage, setFormImage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const stockRows = useMemo(
    () => getStockLevels(posItems, stockMovements, activeBranchId),
    [posItems, stockMovements, activeBranchId]
  );

  const stockById = useMemo(() => {
    const map = new Map<string, StockLevelRow>();
    for (const row of stockRows) {
      map.set(row.itemId, row);
    }
    return map;
  }, [stockRows]);

  const trackedRows = stockRows.filter((r) => r.state !== 'untracked');
  const okCount = trackedRows.filter((r) => r.state === 'ok').length;
  const lowCount = trackedRows.filter((r) => r.state === 'low').length;
  const outCount = trackedRows.filter((r) => r.state === 'out').length;

  const filteredItems = useMemo(() => {
    return posItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      const stockInfo = stockById.get(item.id);
      if (inventoryFilterLowOut) {
        if (!stockInfo || (stockInfo.state !== 'low' && stockInfo.state !== 'out')) {
          return false;
        }
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.category.toLowerCase().includes(q) &&
          !(item.unit || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [posItems, selectedCategory, inventoryFilterLowOut, searchQuery, stockById]);

  const openMovementModal = (item: PosItem, mode: MovementMode) => {
    setMovementModal({ item, mode });
    setMoveQtyRaw(mode === 'adjust' ? '' : '1');
    setMoveReason('');
    setMoveError(null);
    moveSubmittingRef.current = false;
    setIsSubmittingMove(false);
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModal || moveSubmittingRef.current || isSubmittingMove) return;
    moveSubmittingRef.current = true;
    setIsSubmittingMove(true);
    setMoveError(null);

    const trimmed = moveQtyRaw.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      setMoveError(t('err.stock.quantityWhole'));
      moveSubmittingRef.current = false;
      setIsSubmittingMove(false);
      return;
    }
    const parsedQty = parseInt(trimmed, 10);
    const res = recordStockMovement(
      movementModal.item.id,
      movementModal.mode as StockMovementType,
      parsedQty,
      moveReason,
      activeBranchId
    );
    if (!res.success) {
      setMoveError(resultMessage(t, res, 'err.stock.invalidMovement'));
      moveSubmittingRef.current = false;
      setIsSubmittingMove(false);
      return;
    }
    setMovementModal(null);
  };

  const openCountModal = () => {
    const initial: Record<string, string> = {};
    for (const item of posItems) {
      if (item.trackStock) {
        const row = stockById.get(item.id);
        initial[item.id] = String(row ? row.level : 0);
      }
    }
    setCountedMap(initial);
    setCountError(null);
    countSubmittingRef.current = false;
    setIsSubmittingCount(false);
    setShowCountModal(true);
  };

  const handleApplyCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (countSubmittingRef.current || isSubmittingCount) return;
    countSubmittingRef.current = true;
    setIsSubmittingCount(true);
    setCountError(null);

    const trackedItems = posItems.filter((i) => i.trackStock);
    const pendingDeltas: Array<{ item: PosItem; delta: number }> = [];

    for (const item of trackedItems) {
      const raw = (countedMap[item.id] ?? '').trim();
      if (!/^\d+$/.test(raw)) {
        setCountError(t('err.stock.openingNonNegative'));
        countSubmittingRef.current = false;
        setIsSubmittingCount(false);
        return;
      }
      const counted = parseInt(raw, 10);
      const current = stockById.get(item.id)?.level ?? 0;
      const delta = counted - current;
      if (delta !== 0) {
        pendingDeltas.push({ item, delta });
      }
    }

    if (pendingDeltas.length === 0) {
      setCountError(t('inventory.countNoChanges'));
      countSubmittingRef.current = false;
      setIsSubmittingCount(false);
      return;
    }

    for (const entry of pendingDeltas) {
      const res = recordStockMovement(
        entry.item.id,
        'adjust',
        entry.delta,
        'Stock count',
        activeBranchId
      );
      if (!res.success) {
        setCountError(resultMessage(t, res, 'err.stock.invalidMovement'));
        countSubmittingRef.current = false;
        setIsSubmittingCount(false);
        return;
      }
    }

    notify('msg.stock.countSaved', { count: pendingDeltas.length }, 'success');
    setShowCountModal(false);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Beverages');
    setFormPrice(1000);
    setFormUnit('');
    setFormTrackStock(true);
    setFormOpeningStock('0');
    setFormThreshold('5');
    setFormAvailable(true);
    setFormImage('');
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: PosItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(item.price);
    setFormUnit(item.unit || '');
    setFormTrackStock(Boolean(item.trackStock));
    setFormOpeningStock('0');
    setFormThreshold(String(item.lowStockThreshold ?? 5));
    setFormAvailable(item.available !== false);
    setFormImage(item.image || '');
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validatePosItem(
      { name: formName, category: formCategory, price: formPrice },
      posItems,
      editingItem?.id
    );
    if (!validation.valid) {
      setFormError(
        validation.errorKey
          ? t(validation.errorKey, validation.errorVars)
          : t('menu.errInvalidDetails')
      );
      return;
    }

    const thresholdTrimmed = formThreshold.trim();
    if (!/^\d+$/.test(thresholdTrimmed)) {
      setFormError(t('err.menu.thresholdInvalid'));
      return;
    }
    const thresholdNum = parseInt(thresholdTrimmed, 10);

    if (editingItem) {
      const updates: Partial<Omit<PosItem, 'id'>> = {
        name: formName.trim(),
        category: formCategory,
        unit: formUnit.trim() || undefined,
        trackStock: formTrackStock,
        lowStockThreshold: thresholdNum,
        available: formAvailable,
        image: formImage.trim() || undefined
      };
      if (!isFrontDesk) {
        updates.price = formPrice;
      }
      const res = updatePosItem(editingItem.id, updates);
      if (!res.success) {
        setFormError(resultMessage(t, res, 'menu.errUpdateFailed'));
        return;
      }
    } else {
      let openingQty: number | undefined;
      if (formTrackStock) {
        const openingTrimmed = formOpeningStock.trim() || '0';
        if (!/^\d+$/.test(openingTrimmed)) {
          setFormError(t('err.stock.openingNonNegative'));
          return;
        }
        openingQty = parseInt(openingTrimmed, 10);
      }

      const res = addPosItem(
        {
          name: formName.trim(),
          category: formCategory,
          price: formPrice,
          unit: formUnit.trim() || undefined,
          trackStock: formTrackStock,
          lowStockThreshold: thresholdNum,
          available: formAvailable,
          isActive: true,
          image: formImage.trim() || undefined
        },
        formTrackStock ? { openingStock: openingQty, branchId: activeBranchId } : undefined
      );
      if (!res.success) {
        setFormError(resultMessage(t, res, 'menu.errAddFailed'));
        return;
      }
    }

    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const itemHistoryMoves = useMemo(() => {
    if (!historyItem) return [];
    return stockMovements.filter(
      (m) => m.itemId === historyItem.id && m.branchId === activeBranchId
    );
  }, [historyItem, stockMovements, activeBranchId]);

  const reservationCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reservations) {
      map.set(r.id, r.bookingCode);
    }
    return map;
  }, [reservations]);

  const renderStateBadge = (state: StockLevelRow['state']) => {
    if (state === 'out') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap">
          {t('inventory.state.out')}
        </span>
      );
    }
    if (state === 'low') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
          {t('inventory.state.low')}
        </span>
      );
    }
    if (state === 'ok') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          {t('inventory.state.ok')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        {t('inventory.state.untracked')}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{t('inventory.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('inventory.subtitle', { branch: branchLabel })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openCountModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4 text-slate-600" />
            <span>{t('inventory.countStockBtn')}</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t('inventory.addItemBtn')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {t('inventory.summaryTracked')}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {trackedRows.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            {t('inventory.summaryOk')}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {okCount}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            {t('inventory.summaryLow')}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">
            {lowCount}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200">
          <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
            {t('inventory.summaryOut')}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1">
            {outCount}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('inventory.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">{t('inventory.allCategories')}</option>
            {POS_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {tMenuCategory(t, cat)}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={inventoryFilterLowOut}
            onChange={(e) => setInventoryFilterLowOut(e.target.checked)}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <span>{t('inventory.lowOutOnly')}</span>
        </label>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">{t('inventory.noItems')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{t('inventory.colItem')}</th>
                  <th className="py-3 px-4">{t('inventory.colCategory')}</th>
                  <th className="py-3 px-4">{t('inventory.colUnit')}</th>
                  <th className="py-3 px-4 text-right">{t('inventory.colLevel')}</th>
                  <th className="py-3 px-4 text-center">{t('inventory.colStatus')}</th>
                  <th className="py-3 px-4 text-right">{t('inventory.colThreshold')}</th>
                  <th className="py-3 px-4 text-right">{t('inventory.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const row = stockById.get(item.id) || {
                    itemId: item.id,
                    level: 0,
                    state: 'untracked' as const
                  };
                  const isTracked = Boolean(item.trackStock);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.isActive === false ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatMoney(item.price)}
                          {item.isActive === false && ` • ${t('menu.status.offMenu')}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                          {tMenuCategory(t, item.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item.unit || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {isTracked ? row.level : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">{renderStateBadge(row.state)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {isTracked ? item.lowStockThreshold ?? 5 : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openMovementModal(item, 'receive')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            <span>{t('inventory.btnReceive')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openMovementModal(item, 'adjust')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>{t('inventory.btnAdjust')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openMovementModal(item, 'waste')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t('inventory.btnWaste')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                          >
                            <History className="w-3 h-3" />
                            <span>{t('inventory.btnHistory')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title={t('inventory.btnEdit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receive / Adjust / Waste Movement Modal */}
      {movementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {movementModal.mode === 'receive'
                  ? t('inventory.modalReceiveTitle', { name: movementModal.item.name })
                  : movementModal.mode === 'adjust'
                  ? t('inventory.modalAdjustTitle', { name: movementModal.item.name })
                  : t('inventory.modalWasteTitle', { name: movementModal.item.name })}
              </h3>
              <button
                type="button"
                onClick={() => setMovementModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>
                {t('inventory.currentLevelLabel', {
                  level: stockById.get(movementModal.item.id)?.level ?? 0
                })}
                {movementModal.item.unit ? ` ${movementModal.item.unit}` : ''}
              </span>
              <span className="text-[11px] text-slate-500">{branchLabel}</span>
            </div>

            {moveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{moveError}</span>
              </div>
            )}

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('inventory.quantityLabel')} *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={moveQtyRaw}
                  onChange={(e) => setMoveQtyRaw(e.target.value)}
                  placeholder={movementModal.mode === 'adjust' ? '+5 or -3' : '1'}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
                {movementModal.mode === 'adjust' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t('inventory.adjustDeltaHint')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {movementModal.mode === 'receive'
                    ? t('inventory.reasonOptionalLabel')
                    : `${t('inventory.reasonLabel')} *`}
                </label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder={t('inventory.reasonPlaceholder')}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required={movementModal.mode !== 'receive'}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMove}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl cursor-pointer"
                >
                  {t('inventory.saveMovementBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <span>{t('inventory.historyTitle', { name: historyItem.name })}</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {itemHistoryMoves.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t('inventory.historyEmpty')}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">{t('inventory.historyColDate')}</th>
                      <th className="py-2.5 px-3">{t('inventory.historyColType')}</th>
                      <th className="py-2.5 px-3 text-right">{t('inventory.historyColQty')}</th>
                      <th className="py-2.5 px-3">{t('inventory.historyColBy')}</th>
                      <th className="py-2.5 px-3">{t('inventory.historyColReason')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemHistoryMoves.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {m.createdAt}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                            {t(`inventory.type.${m.type}`)}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                            m.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{m.recordedBy}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {m.reason ||
                            (m.reservationId
                              ? reservationCodeById.get(m.reservationId) || m.reservationId
                              : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Physical Stock Count Modal */}
      {showCountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t('inventory.countModalTitle', { branch: branchLabel })}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('inventory.countModalDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCountModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {countError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{countError}</span>
              </div>
            )}

            <form onSubmit={handleApplyCount} className="space-y-4">
              {posItems.filter((i) => i.trackStock).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {t('inventory.countNoTracked')}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">{t('inventory.colItem')}</th>
                        <th className="py-2.5 px-3 text-right">{t('inventory.countColSystem')}</th>
                        <th className="py-2.5 px-3 text-right">{t('inventory.countColCounted')}</th>
                        <th className="py-2.5 px-3 text-right">{t('inventory.countColVariance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {posItems
                        .filter((i) => i.trackStock)
                        .map((item) => {
                          const sysLevel = stockById.get(item.id)?.level ?? 0;
                          const raw = countedMap[item.id] ?? String(sysLevel);
                          const parsed = /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : NaN;
                          const variance = isNaN(parsed) ? null : parsed - sysLevel;
                          return (
                            <tr key={item.id}>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900">{item.name}</span>
                                {item.unit && (
                                  <span className="ml-1.5 text-[10px] text-slate-500 font-mono">
                                    ({item.unit})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                                {sysLevel}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={raw}
                                  onChange={(e) =>
                                    setCountedMap((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value
                                    }))
                                  }
                                  className="w-20 text-right text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                                  variance === null || variance === 0
                                    ? 'text-slate-400'
                                    : variance > 0
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {variance === null
                                  ? '—'
                                  : variance > 0
                                  ? `+${variance}`
                                  : variance}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCountModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCount || posItems.filter((i) => i.trackStock).length === 0}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl cursor-pointer"
                >
                  {t('inventory.countSaveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>{editingItem ? t('menu.editItemTitle') : t('menu.addItemTitle')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('menu.formName')}
                </label>
                <input
                  type="text"
                  placeholder={t('menu.formNamePlaceholder')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('menu.formCategory')}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as PosItem['category'])}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {POS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {tMenuCategory(t, cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('menu.formPrice', { currency: 'FCFA' })}
                  </label>
                  <MoneyInput
                    value={formPrice}
                    onChange={(n) => setFormPrice(n)}
                    disabled={Boolean(editingItem && isFrontDesk)}
                    placeholder="1000"
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {editingItem && isFrontDesk && (
                    <p className="text-[10px] text-slate-500 mt-1">{t('menu.formPriceLocked')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('menu.formUnit')}
                </label>
                <input
                  type="text"
                  placeholder={t('menu.formUnitPlaceholder')}
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTrackStock}
                    onChange={(e) => setFormTrackStock(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    <span className="block">{t('menu.formTrackStock')}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {t('menu.formTrackStockDesc')}
                    </span>
                  </span>
                </label>

                {formTrackStock && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-5">
                    {!editingItem && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('menu.formOpeningStock', { branch: branchLabel })}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formOpeningStock}
                          onChange={(e) => setFormOpeningStock(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('menu.formThreshold')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>{t('menu.status.inStock')}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {t('menu.formInStockDesc')}
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                >
                  {editingItem ? t('common.saveChanges') : t('menu.createItem')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
