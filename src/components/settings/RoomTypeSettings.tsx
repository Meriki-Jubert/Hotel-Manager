import React, { useState } from 'react';
import { useHMS } from '../../context/HMSContext';
import { useT } from '../../i18n/LanguageContext';
import { resultMessage } from '../../i18n/messages';
import { RoomType } from '../../types/hms';
import { DeactivatePromptModal, DeactivatePromptState } from './shared';
import { tBedType, tRoomAmenity } from '../../i18n/labels';
import { MoneyInput } from '../ui/MoneyInput';
import {
  Layers,
  PlusCircle,
  Power,
  Edit3,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';

export const RoomTypeSettings: React.FC = () => {
  const { t } = useT();
  const {
    roomTypes,
    rooms,
    formatMoney,
    addRoomType,
    updateRoomType,
    deleteRoomType,
    toggleRoomTypeActive
  } = useHMS();

  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [typeFormName, setTypeFormName] = useState('');
  const [typeFormCode, setTypeFormCode] = useState('');
  const [typeFormPrice, setTypeFormPrice] = useState<number | ''>(35000);
  const [typeFormCapacity, setTypeFormCapacity] = useState<number | ''>(2);
  const [typeFormBedType, setTypeFormBedType] = useState('Queen Bed');
  const [typeFormAmenities, setTypeFormAmenities] = useState('Free Wi-Fi, Smart TV, Hot Shower, AC');
  const [typeFormDesc, setTypeFormDesc] = useState('');
  const [typeFormImage, setTypeFormImage] = useState('');
  const [typeFormError, setTypeFormError] = useState<string | null>(null);

  const [deactivatePrompt, setDeactivatePrompt] = useState<DeactivatePromptState | null>(null);

  const openAddRoomType = () => {
    setEditingType(null);
    setTypeFormName('');
    setTypeFormCode('');
    setTypeFormPrice(35000);
    setTypeFormCapacity(2);
    setTypeFormBedType('Queen Bed');
    setTypeFormAmenities('Free Wi-Fi, Smart TV, Hot Shower, AC');
    setTypeFormDesc('');
    setTypeFormImage('');
    setTypeFormError(null);
    setShowAddTypeModal(true);
  };

  const openEditRoomType = (rt: RoomType) => {
    setEditingType(rt);
    setTypeFormName(rt.name);
    setTypeFormCode(rt.code);
    setTypeFormPrice(rt.basePrice);
    setTypeFormCapacity(rt.maxCapacity);
    setTypeFormBedType(rt.bedType);
    setTypeFormAmenities(rt.amenities.join(', '));
    setTypeFormDesc(rt.description);
    setTypeFormImage(rt.image || '');
    setTypeFormError(null);
    setShowAddTypeModal(true);
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    setTypeFormError(null);

    if (!typeFormName.trim()) {
      setTypeFormError(t('roomType.errNameRequired'));
      return;
    }
    if (!typeFormCode.trim()) {
      setTypeFormError(t('roomType.errCodeRequired'));
      return;
    }
    if (!typeFormPrice || Number(typeFormPrice) <= 0) {
      setTypeFormError(t('roomType.errPricePositive'));
      return;
    }
    if (!typeFormCapacity || Number(typeFormCapacity) < 1) {
      setTypeFormError(t('roomType.errCapacityPositive'));
      return;
    }
    if (!typeFormBedType.trim()) {
      setTypeFormError(t('roomType.errBedRequired'));
      return;
    }
    if (!typeFormDesc.trim()) {
      setTypeFormError(t('roomType.errDescRequired'));
      return;
    }

    const amenitiesList = typeFormAmenities
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (editingType) {
      const res = updateRoomType(editingType.id, {
        name: typeFormName.trim(),
        code: typeFormCode.trim().toUpperCase(),
        basePrice: Number(typeFormPrice),
        maxCapacity: Number(typeFormCapacity),
        bedType: typeFormBedType.trim(),
        amenities: amenitiesList,
        description: typeFormDesc.trim(),
        image: typeFormImage.trim() || undefined
      });
      if (!res.success) {
        setTypeFormError(resultMessage(t, res, 'roomType.errUpdateFail'));
        return;
      }
    } else {
      const res = addRoomType({
        name: typeFormName.trim(),
        code: typeFormCode.trim().toUpperCase(),
        basePrice: Number(typeFormPrice),
        maxCapacity: Number(typeFormCapacity),
        bedType: typeFormBedType.trim(),
        amenities: amenitiesList,
        description: typeFormDesc.trim(),
        image: typeFormImage.trim() || undefined
      });
      if (!res.success) {
        setTypeFormError(resultMessage(t, res, 'roomType.errAddFail'));
        return;
      }
    }

    setShowAddTypeModal(false);
  };

  const handleDeleteRoomType = (rt: RoomType) => {
    const res = deleteRoomType(rt.id);
    if (!res.success) {
      if (res.canDeactivateInstead) {
        setDeactivatePrompt({
          isOpen: true,
          type: 'room_type',
          id: rt.id,
          title: t('roomType.deactivatePromptTitle', { name: rt.name }),
          message: t('roomType.deactivatePromptMessage', { error: resultMessage(t, res) })
        });
      }
    }
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatePrompt) return;
    toggleRoomTypeActive(deactivatePrompt.id, false);
    setDeactivatePrompt(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            {t('roomType.title')}
          </h3>
          <p className="text-xs text-slate-500">
            {t('roomType.subtitle')}
          </p>
        </div>

        <button
          onClick={openAddRoomType}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('roomType.addNew')}</span>
        </button>
      </div>

      {roomTypes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">{t('roomType.emptyTitle')}</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t('roomType.emptyDesc')}
          </p>
          <button
            onClick={openAddRoomType}
            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer"
          >
            {t('roomType.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomTypes.map((rt) => {
            const associatedRooms = rooms.filter((r) => r.roomTypeId === rt.id);
            const isDeactivated = rt.isActive === false;

            return (
              <div
                key={rt.id}
                className={`bg-white rounded-xl border shadow-xs p-4 flex flex-col justify-between transition-all ${
                  isDeactivated
                    ? 'border-slate-300 opacity-60 bg-slate-50/60'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {rt.code}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{rt.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 block mt-1">
                        {t('roomType.perNight', { price: formatMoney(rt.basePrice) })}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isDeactivated
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isDeactivated ? t('settings.deactivated') : t('settings.active')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <strong className="text-slate-800">{t('roomType.bed')}</strong> {tBedType(t, rt.bedType)} • <strong className="text-slate-800">{t('roomType.maxCapacity')}</strong> {t('roomType.guestsCount', { count: rt.maxCapacity })}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2">
                      {rt.description}
                    </div>
                  </div>

                  {/* Amenities Pills */}
                  <div className="flex flex-wrap gap-1">
                    {rt.amenities.slice(0, 4).map((a, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {tRoomAmenity(t, a)}
                      </span>
                    ))}
                    {rt.amenities.length > 4 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                        +{rt.amenities.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono pt-1">
                    {t('roomType.assignedCount', { count: associatedRooms.length, plural: associatedRooms.length === 1 ? '' : 's' })}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => toggleRoomTypeActive(rt.id, isDeactivated)}
                    className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded transition-colors cursor-pointer ${
                      isDeactivated
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                    title={isDeactivated ? t('roomType.activateTooltip') : t('roomType.deactivateTooltip')}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isDeactivated ? t('roomType.activate') : t('roomType.deactivate')}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditRoomType(rt)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                      title={t('roomType.editTooltip')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRoomType(rt)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded cursor-pointer"
                      title={t('roomType.deleteTooltip')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT ROOM TYPE */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-auto">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingType ? t('roomType.modalEditTitle', { name: editingType.name }) : t('roomType.modalAddTitle')}
                </h3>
              </div>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomType} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {typeFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{typeFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldName')}</label>
                  <input
                    type="text"
                    value={typeFormName}
                    onChange={(e) => setTypeFormName(e.target.value)}
                    placeholder={t('roomType.placeholderName')}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldCode')}</label>
                  <input
                    type="text"
                    value={typeFormCode}
                    onChange={(e) => setTypeFormCode(e.target.value.toUpperCase())}
                    placeholder={t('roomType.placeholderCode')}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldBasePrice')}</label>
                  <MoneyInput
                    value={typeof typeFormPrice === 'number' ? typeFormPrice : 0}
                    onChange={(n) => setTypeFormPrice(n)}
                    allowEmpty
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldCapacity')}</label>
                  <input
                    type="number"
                    min="1"
                    value={typeFormCapacity}
                    onChange={(e) => setTypeFormCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldBedConfig')}</label>
                  <input
                    type="text"
                    value={typeFormBedType}
                    onChange={(e) => setTypeFormBedType(e.target.value)}
                    placeholder={t('roomType.placeholderBed')}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldPhotoUrl')}</label>
                  <input
                    type="url"
                    value={typeFormImage}
                    onChange={(e) => setTypeFormImage(e.target.value)}
                    placeholder={t('roomType.placeholderPhoto')}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldAmenities')}</label>
                <input
                  type="text"
                  value={typeFormAmenities}
                  onChange={(e) => setTypeFormAmenities(e.target.value)}
                  placeholder={t('roomType.placeholderAmenities')}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('roomType.fieldDescription')}</label>
                <textarea
                  rows={3}
                  value={typeFormDesc}
                  onChange={(e) => setTypeFormDesc(e.target.value)}
                  placeholder={t('roomType.placeholderDesc')}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingType ? t('roomType.saveChanges') : t('roomType.createBtn')}
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
