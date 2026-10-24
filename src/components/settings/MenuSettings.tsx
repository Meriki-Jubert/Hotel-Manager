import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import { PosItem } from '../../types/hms';
import { POS_CATEGORIES, validatePosItem } from '../../utils/posItems';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Power,
  Search,
  AlertTriangle,
  X,
  CheckCircle2,
  Coffee,
  Wine,
  Sparkles
} from 'lucide-react';

export const MenuSettings: React.FC = () => {
  const { posItems, addPosItem, updatePosItem, togglePosItemActive, deletePosItem, formatMoney } = useHMS();

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PosItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<PosItem['category']>('Meals');
  const [formPrice, setFormPrice] = useState<number | ''>(5000);
  const [formAvailable, setFormAvailable] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImage, setFormImage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingItem, setDeletingItem] = useState<PosItem | null>(null);

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Meals');
    setFormPrice(5000);
    setFormAvailable(true);
    setFormIsActive(true);
    setFormImage('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PosItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(item.price);
    setFormAvailable(item.available !== false);
    setFormIsActive(item.isActive !== false);
    setFormImage(item.image || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormError(null);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceNum = typeof formPrice === 'number' ? formPrice : parseInt(String(formPrice), 10);

    const validation = validatePosItem(
      { name: formName, category: formCategory, price: priceNum },
      posItems,
      editingItem?.id
    );

    if (!validation.valid) {
      setFormError(validation.error || 'Invalid item details.');
      return;
    }

    if (editingItem) {
      const res = updatePosItem(editingItem.id, {
        name: formName.trim(),
        category: formCategory,
        price: priceNum,
        available: formAvailable,
        isActive: formIsActive,
        image: formImage.trim() || undefined
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update item.');
        return;
      }
    } else {
      const res = addPosItem({
        name: formName.trim(),
        category: formCategory,
        price: priceNum,
        available: formAvailable,
        isActive: formIsActive,
        image: formImage.trim() || undefined
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add item.');
        return;
      }
    }

    closeModal();
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    deletePosItem(deletingItem.id);
    setDeletingItem(null);
  };

  // Filter items
  const filteredItems = posItems.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      if (!matchName && !matchCategory) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
            Restaurant Menu & Services Catalog
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hotel-wide inventory for Restaurant, Bar, Room Service, Laundry, and Guest Amenities ({posItems.length} items total)
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories ({posItems.length})
          </button>
          {POS_CATEGORIES.map((cat) => {
            const count = posItems.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table / Empty State */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">
              {posItems.length === 0 ? 'No Menu Items Configured' : 'No Matching Items Found'}
            </h4>
            <p className="text-xs text-slate-500">
              {posItems.length === 0
                ? 'Start by creating food, beverages, snacks, laundry packages or hotel service amenities.'
                : 'Try adjusting your search query or selecting a different category filter.'}
            </p>
          </div>
          {posItems.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Item</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-center">In stock today</th>
                  <th className="py-3 px-4 text-center">On the menu</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isActive = item.isActive !== false;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !isActive ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xs">
                              {item.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatMoney(item.price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => updatePosItem(item.id, { available: !item.available })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                            item.available
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle: In stock today"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {item.available ? 'In stock today' : 'Out of stock'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => togglePosItemActive(item.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                            isActive
                              ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Click to toggle: On the menu"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-teal-500' : 'bg-slate-400'}`} />
                          {isActive ? 'On the menu' : 'Off the menu'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
                            title="Edit menu item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePosItemActive(item.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isActive
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-teal-200 text-teal-700 hover:bg-teal-50'
                            }`}
                            title={isActive ? 'Deactivate menu item' : 'Activate menu item'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Delete menu item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ndolé Royal with Smoked Fish"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as PosItem['category'])}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {POS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    placeholder="5000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>On the menu</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Active catalog item)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>In stock today</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Available for ordering on POS)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Delete Menu Item</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">"{deletingItem.name}"</strong>?
              Past charges recorded on guest folios will preserve their own copy of this item and won't be affected.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm cursor-pointer"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
