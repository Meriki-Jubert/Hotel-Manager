import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { createMenuPlaceholderSvg } from '../utils/placeholders';
import { useT } from '../i18n/LanguageContext';
import { tPaymentMethod } from '../i18n/labels';
import { PosItem, PaymentMethod } from '../types/hms';
import { getStockLevels, StockLevelRow } from '../utils/stock';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Building,
  CheckCircle2,
  Search,
  CreditCard,
  ShoppingBag
} from 'lucide-react';

export const RestaurantPOS: React.FC = () => {
  const { t } = useT();
  const {
    posItems,
    stockMovements,
    rooms,
    roomTypes,
    reservations,
    processPosOrder,
    formatMoney,
    showNotification,
    activeBranchId,
    currentUser,
    setActiveTab
  } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName={t('pos.screenName')} />;
  }

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ item: PosItem; quantity: number }[]>([]);
  
  // Checkout destination
  const [checkoutMode, setCheckoutMode] = useState<'room' | 'direct'>('room');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [directPaymentMethod, setDirectPaymentMethod] = useState<PaymentMethod>('momo');

  // Occupied rooms available to receive room charge (only active rooms whose category is active)
  const activeRoomTypeIds = new Set(roomTypes.filter((rt) => rt.isActive !== false).map((rt) => rt.id));
  const occupiedRooms = rooms.filter(
    (r) => r.isActive !== false && activeRoomTypeIds.has(r.roomTypeId) && r.status === 'occupied' && r.currentReservationId
  );
  const activeSelectedRoomId = selectedRoomId || (occupiedRooms.length > 0 ? occupiedRooms[0].id : '');

  const categories = ['All', 'Meals', 'Beverages', 'Breakfast', 'Snacks', 'Laundry', 'Room Amenities'];
  const categoryKeys: Record<string, string> = {
    'All': 'pos.cat.all',
    'Meals': 'pos.cat.meals',
    'Beverages': 'pos.cat.beverages',
    'Breakfast': 'pos.cat.breakfast',
    'Snacks': 'pos.cat.snacks',
    'Laundry': 'pos.cat.laundry',
    'Room Amenities': 'pos.cat.roomAmenities'
  };

  // Only show active items (isActive !== false)
  const activePosItems = posItems.filter((item) => item.isActive !== false);

  const stockRows = getStockLevels(posItems, stockMovements, activeBranchId);
  const stockById = new Map<string, StockLevelRow>(stockRows.map((r) => [r.itemId, r]));

  const filteredItems = activePosItems.filter((item) => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;
    if (searchQuery.trim() !== '') {
      if (!item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const addToCart = (item: PosItem) => {
    const stockRow = stockById.get(item.id);
    const isTracked = Boolean(item.trackStock);
    const availableQty = stockRow ? stockRow.level : 0;

    if (item.available === false || (isTracked && availableQty <= 0)) {
      showNotification(t('pos.outOfStockNotify', { name: item.name }), 'warning');
      return;
    }

    const existing = cart.find((i) => i.item.id === item.id);
    const nextQty = (existing?.quantity || 0) + 1;
    if (isTracked && nextQty > availableQty) {
      showNotification(
        t('pos.onlyAvailableNotify', { available: availableQty, name: item.name }),
        'warning'
      );
      return;
    }

    setCart((prev) => {
      const found = prev.find((i) => i.item.id === item.id);
      if (found) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    if (typeof delta !== 'number' || isNaN(delta) || !Number.isInteger(delta)) {
      showNotification(t('err.pos.invalidQuantity'), 'warning');
      return;
    }

    const currentEntry = cart.find((c) => c.item.id === itemId);
    if (!currentEntry) return;
    const newQty = currentEntry.quantity + delta;
    if (!Number.isInteger(newQty) || newQty < 0) {
      showNotification(t('err.pos.invalidQuantity'), 'warning');
      return;
    }

    if (delta > 0) {
      const target = posItems.find((p) => p.id === itemId);
      if (target?.trackStock) {
        const availableQty = stockById.get(itemId)?.level ?? 0;
        if (newQty > availableQty) {
          showNotification(
            t('pos.onlyAvailableNotify', { available: availableQty, name: target.name }),
            'warning'
          );
          return;
        }
      }
    }

    setCart((prev) =>
      prev
        .map((i) => {
          if (i.item.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as { item: PosItem; quantity: number }[]
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((s, i) => s + i.item.price * i.quantity, 0);

  const handleProcessOrder = () => {
    if (cart.length === 0) return;

    const hasInvalidQty = cart.some(
      (entry) =>
        typeof entry.quantity !== 'number' ||
        isNaN(entry.quantity) ||
        !Number.isInteger(entry.quantity) ||
        entry.quantity <= 0
    );
    if (hasInvalidQty) {
      showNotification(t('err.pos.invalidQuantity'), 'warning');
      return;
    }

    let reservationId: string | undefined;
    if (checkoutMode === 'room') {
      const targetRoom = rooms.find((r) => r.id === activeSelectedRoomId);
      if (!targetRoom || !targetRoom.currentReservationId) {
        showNotification(t('pos.selectOccupiedRoom'), 'warning');
        return;
      }
      const targetRes = reservations.find((r) => r.id === targetRoom.currentReservationId);
      if (!targetRes) {
        showNotification(t('pos.selectOccupiedRoom'), 'warning');
        return;
      }
      reservationId = targetRes.id;
    }

    const res = processPosOrder({
      lines: cart.map((entry) => ({ itemId: entry.item.id, qty: entry.quantity })),
      mode: checkoutMode,
      reservationId,
      paymentMethod: checkoutMode === 'direct' ? directPaymentMethod : undefined,
      branchId: activeBranchId
    });

    if (res.success) {
      clearCart();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Menu Catalog (Left 2 cols) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search & Categories */}
        <div className="bg-slate-900/50 backdrop-blur-2xl p-4 rounded-2xl border border-champagne-gold-500/50 shadow-2xl space-y-3 text-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('pos.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t(categoryKeys[cat] || 'pos.cat.all')}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid or Empty State */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <UtensilsCrossed className="w-7 h-7" />
            </div>

            {activePosItems.length === 0 ? (
              <div className="max-w-md mx-auto space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">{t('pos.noMenuItems')}</h4>
                {isManager ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      {t('pos.emptyMenuDesc')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>{t('pos.settingsMenuBtn')}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 font-medium">
                    {t('pos.askManager')}
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">{t('pos.noMatching')}</h4>
                <p className="text-xs text-slate-500">
                  {t('pos.noMatchingDesc')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const stockInfo = stockById.get(item.id);
              const isTracked = Boolean(item.trackStock);
              const stockLevel = stockInfo?.level ?? 0;
              const isOutByStock = isTracked && stockLevel <= 0;
              const isLowStock = isTracked && stockInfo?.state === 'low';
              const isAvailable = item.available !== false && !isOutByStock;

              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden group ${
                    isAvailable
                      ? 'border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-sm cursor-pointer active:scale-[0.98]'
                      : 'border-slate-200 bg-slate-50 opacity-60 grayscale-[40%] cursor-not-allowed'
                  }`}
                >
                  <div className="relative h-24 aspect-[16/7] w-full bg-slate-900 overflow-hidden">
                    <img
                      src={item.image || createMenuPlaceholderSvg(item.category, item.name)}
                      alt={item.name}
                      width={400}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-105' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    {!isAvailable ? (
                      <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-white bg-rose-600/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                        {t('pos.outOfStock')}
                      </span>
                    ) : isLowStock ? (
                      <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-300/95 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                        {t('pos.lowBadge')}
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className={`font-bold text-xs line-clamp-2 ${isAvailable ? 'text-slate-900 group-hover:text-emerald-700' : 'text-slate-500'}`}>
                        {item.name}
                      </h4>
                      {!isAvailable ? (
                        <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                          {t('pos.outOfStock')}
                        </span>
                      ) : isTracked ? (
                        <span
                          className={`text-[10px] font-mono tabular-nums font-semibold block mt-0.5 ${
                            isLowStock ? 'text-amber-700' : 'text-slate-500'
                          }`}
                        >
                          {item.unit
                            ? t('pos.leftWithUnit', { count: stockLevel, unit: item.unit })
                            : t('pos.leftCount', { count: stockLevel })}
                        </span>
                      ) : null}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className={`font-bold font-mono text-sm ${isAvailable ? 'text-slate-900' : 'text-slate-400'}`}>
                        {formatMoney(item.price)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isAvailable
                            ? 'bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-600 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        title={isAvailable ? t('pos.addToTicket') : t('pos.outOfStock')}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart & Billing Target (Right 1 col) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">{t('pos.activeOrderTicket')}</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
              >
                {t('pos.clearAll')}
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
            {cart.map(({ item, quantity }) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200"
              >
                <div className="flex-1 pr-2">
                  <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="font-mono text-slate-500 text-[11px]">
                    {t('pos.each', { amount: formatMoney(item.price) })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 bg-white hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                  >
                    <Minus className="w-3 h-3 text-slate-600" />
                  </button>
                  <span className="font-mono font-bold w-5 text-center text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 bg-white hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                {t('pos.emptyTicket')}
              </div>
            )}
          </div>
        </div>

        {/* Order Options & Checkout */}
        <div className="space-y-4 pt-3 border-t border-slate-200">
          {/* Target: Charge to Room vs Direct Pay */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-700 block">{t('pos.billingDestination')}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCheckoutMode('room')}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  checkoutMode === 'room'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>{t('pos.postToRoom')}</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckoutMode('direct')}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  checkoutMode === 'direct'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t('pos.directCash')}</span>
              </button>
            </div>
          </div>

          {/* If Charge to Room: Select Occupied Room */}
          {checkoutMode === 'room' ? (
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 block">{t('pos.selectInHouse')}</label>
              {occupiedRooms.length > 0 ? (
                <select
                  value={activeSelectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  {occupiedRooms.map((r) => {
                    const res = reservations.find((resItem) => resItem.id === r.currentReservationId);
                    return (
                      <option key={r.id} value={r.id}>
                        Room #{r.roomNumber} - {res?.guestName || 'Occupied'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="text-rose-600 bg-rose-50 p-2 rounded text-[11px]">
                  {t('pos.noRoomsOccupied')}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 block">{t('pos.paymentMethod')}</label>
              <div className="grid grid-cols-3 gap-1">
                {(['cash', 'momo', 'orange_money'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDirectPaymentMethod(m)}
                    className={`p-1.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                      directPaymentMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {tPaymentMethod(t, m)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtotal Calculation */}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-500">{t('pos.totalDue')}</span>
            <span className="text-lg font-bold font-mono text-emerald-700">
              {formatMoney(subtotal)}
            </span>
          </div>

          <button
            onClick={handleProcessOrder}
            disabled={cart.length === 0 || (checkoutMode === 'room' && occupiedRooms.length === 0)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {checkoutMode === 'room'
                ? t('pos.appendRoomFolio', { amount: formatMoney(subtotal) })
                : t('pos.processDirectSale', { amount: formatMoney(subtotal) })}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
