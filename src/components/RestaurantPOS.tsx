import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { PosItem, PaymentMethod } from '../types/hms';
import { SelectBranchNotice } from './SelectBranchNotice';
import {
  UtensilsCrossed,
  Coffee,
  Wine,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Building,
  CheckCircle2,
  Receipt,
  Search,
  CreditCard
} from 'lucide-react';

export const RestaurantPOS: React.FC = () => {
  const { posItems, rooms, roomTypes, reservations, addFolioCharge, formatMoney, businessDate, showNotification, activeBranchId, currentUser, setActiveTab } = useHMS();

  if (activeBranchId === 'all') {
    return <SelectBranchNotice screenName="Restaurant & POS" />;
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

  // Only show active items (isActive !== false)
  const activePosItems = posItems.filter((item) => item.isActive !== false);

  const filteredItems = activePosItems.filter((item) => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;
    if (searchQuery.trim() !== '') {
      if (!item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const addToCart = (item: PosItem) => {
    if (item.available === false) {
      showNotification(`"${item.name}" is currently out of stock.`, 'warning');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
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

    // Refuse any order containing an out-of-stock item
    const outOfStockEntry = cart.find(
      (entry) => entry.item.available === false || posItems.find((p) => p.id === entry.item.id)?.available === false
    );
    if (outOfStockEntry) {
      showNotification(`Cannot place order: "${outOfStockEntry.item.name}" is currently out of stock.`, 'warning');
      return;
    }

    const orderDescription = cart
      .map((i) => `${i.quantity}x ${i.item.name}`)
      .join(', ');

    if (checkoutMode === 'room') {
      const targetRoom = rooms.find((r) => r.id === activeSelectedRoomId);
      if (!targetRoom || !targetRoom.currentReservationId) {
        showNotification('Please select an active occupied guest room.', 'warning');
        return;
      }
      const targetRes = reservations.find((r) => r.id === targetRoom.currentReservationId);
      if (!targetRes) return;

      addFolioCharge({
        reservationId: targetRes.id,
        guestId: targetRes.guestId,
        roomNumber: targetRoom.roomNumber,
        category: 'restaurant',
        description: `Restaurant / Room Service: ${orderDescription}`,
        amount: subtotal,
        type: 'charge',
        recordedBy: 'Restaurant POS Terminal'
      });

      showNotification(`Order of ${formatMoney(subtotal)} successfully posted to Room #${targetRoom.roomNumber} folio!`, 'success');
    } else {
      showNotification(`Direct Sale: ${formatMoney(subtotal)} collected via ${directPaymentMethod.toUpperCase()}!`, 'success');
    }

    clearCart();
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
              placeholder="Search dishes, drinks, cocktails, laundry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
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
                <h4 className="font-bold text-slate-900 text-sm">No Menu Items Available</h4>
                {isManager ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      The restaurant menu is currently empty. Configure menu items and service catalog in hotel settings.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>Settings &gt; Menu &amp; Services</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 font-medium">
                    Ask your manager to add menu items.
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">No Matching Menu Items</h4>
                <p className="text-xs text-slate-500">
                  No active menu items match your current search or category filter.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isAvailable = item.available !== false;
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
                  <div className="relative h-24 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-105' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    {!isAvailable && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-white bg-rose-600/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                        Out of stock
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className={`font-bold text-xs line-clamp-2 ${isAvailable ? 'text-slate-900 group-hover:text-emerald-700' : 'text-slate-500'}`}>
                        {item.name}
                      </h4>
                      {!isAvailable && (
                        <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                          Out of stock
                        </span>
                      )}
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
                        title={isAvailable ? 'Add to ticket' : 'Out of stock'}
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
              <h3 className="font-bold text-sm text-slate-900">Active Order Ticket</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear All
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
                    {formatMoney(item.price)} each
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 bg-white hover:bg-slate-200 rounded border border-slate-300"
                  >
                    <Minus className="w-3 h-3 text-slate-600" />
                  </button>
                  <span className="font-mono font-bold w-5 text-center text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 bg-white hover:bg-slate-200 rounded border border-slate-300"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Your ticket is empty.<br />Click items on the menu to add to order.
              </div>
            )}
          </div>
        </div>

        {/* Order Options & Checkout */}
        <div className="space-y-4 pt-3 border-t border-slate-200">
          {/* Target: Charge to Room vs Direct Pay */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-700 block">Billing Destination:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCheckoutMode('room')}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  checkoutMode === 'room'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Post to Room</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckoutMode('direct')}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  checkoutMode === 'direct'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Direct Cash / MoMo</span>
              </button>
            </div>
          </div>

          {/* If Charge to Room: Select Occupied Room */}
          {checkoutMode === 'room' ? (
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 block">Select In-House Room:</label>
              {occupiedRooms.length > 0 ? (
                <select
                  value={activeSelectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  No rooms currently occupied. Switch to Direct Cash / MoMo payment.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700 block">Payment Method:</label>
              <div className="grid grid-cols-3 gap-1">
                {(['cash', 'momo', 'orange_money'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDirectPaymentMethod(m)}
                    className={`p-1.5 rounded text-[11px] font-semibold border ${
                      directPaymentMethod === m
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {m === 'momo' ? 'MTN MoMo' : m === 'orange_money' ? 'Orange MoMo' : 'Cash'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtotal Calculation */}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-500">Total Due:</span>
            <span className="text-lg font-bold font-mono text-emerald-700">
              {formatMoney(subtotal)}
            </span>
          </div>

          <button
            onClick={handleProcessOrder}
            disabled={cart.length === 0 || (checkoutMode === 'room' && occupiedRooms.length === 0)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {checkoutMode === 'room'
                ? `Append ${formatMoney(subtotal)} to Room Folio`
                : `Process Direct Sale (${formatMoney(subtotal)})`}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
