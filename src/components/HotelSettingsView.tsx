import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { HotelConfig, DeploymentRecord } from '../types/hms';
import {
  Settings,
  Building,
  DollarSign,
  PlusCircle,
  Save,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Sliders,
  Layers,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const HotelSettingsView: React.FC = () => {
  const {
    hotelConfig,
    updateHotelConfig,
    deployments,
    switchDeployment,
    addDeployment,
    roomTypes,
    updateRoomTypePricing,
    formatMoney,
    currency,
    setCurrency
  } = useHMS();

  // Local form state for Hotel Config
  const [name, setName] = useState(hotelConfig.name);
  const [tagline, setTagline] = useState(hotelConfig.tagline);
  const [city, setCity] = useState(hotelConfig.city);
  const [address, setAddress] = useState(hotelConfig.address);
  const [phone, setPhone] = useState(hotelConfig.phone);
  const [email, setEmail] = useState(hotelConfig.email);
  const [taxId, setTaxId] = useState(hotelConfig.taxId);
  const [registryNumber, setRegistryNumber] = useState(hotelConfig.registryNumber);
  const [checkInTime, setCheckInTime] = useState(hotelConfig.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(hotelConfig.checkOutTime);

  // New Deployment Form state
  const [showAddDep, setShowAddDep] = useState(false);
  const [newDepName, setNewDepName] = useState('');
  const [newDepLocation, setNewDepLocation] = useState('');
  const [newDepRooms, setNewDepRooms] = useState(20);

  // Room pricing state
  const [pricingState, setPricingState] = useState<Record<string, number>>(() =>
    roomTypes.reduce((acc, rt) => {
      acc[rt.id] = rt.basePrice;
      return acc;
    }, {} as Record<string, number>)
  );

  const handleSaveHotelProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateHotelConfig({
      name,
      tagline,
      city,
      address,
      phone,
      email,
      taxId,
      registryNumber,
      checkInTime,
      checkOutTime
    });
  };

  const handleCreateDeployment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepName.trim() || !newDepLocation.trim()) return;

    const code = `DEP-${newDepLocation.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newRecord: DeploymentRecord = {
      id: code,
      name: newDepName.trim(),
      location: newDepLocation.trim(),
      roomsCount: Number(newDepRooms),
      deployedAt: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    addDeployment(newRecord);
    setNewDepName('');
    setNewDepLocation('');
    setShowAddDep(false);
  };

  const handleUpdatePrice = (rtId: string) => {
    const price = pricingState[rtId];
    if (price && price > 0) {
      updateRoomTypePricing(rtId, price);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Property Customization & Multi-Deployment Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-tenant deployment configuration, property branding, and base room rates (Manager Scope)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Current Deployment: {hotelConfig.deploymentId}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Hotel Profile Branding Form */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              Property Identity & Official Contact Info
            </h3>
            <span className="text-[11px] text-slate-400">One Hotel Per Deployment</span>
          </div>

          <form onSubmit={handleSaveHotelProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hotel Property Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tagline / Slogan</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Region *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reception Phone *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Reception Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax ID / NIU (Cameroon) *</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Registry (RCCM)</label>
                <input
                  type="text"
                  value={registryNumber}
                  onChange={(e) => setRegistryNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Check-In Time</label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Standard Check-Out Time</label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Property Branding</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Multi-Deployment Registry & Base Pricing */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Multi-Deployment Manager */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Multi-Property Deployments
                </h3>
                <p className="text-[11px] text-slate-500">Track individual hotel instances</p>
              </div>

              <button
                onClick={() => setShowAddDep(!showAddDep)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add Property</span>
              </button>
            </div>

            {/* Add Deployment Form */}
            {showAddDep && (
              <form
                onSubmit={handleCreateDeployment}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs animate-in fade-in"
              >
                <div className="font-bold text-slate-800">Register New Hotel Deployment</div>
                <input
                  type="text"
                  placeholder="Hotel Name (e.g. Atlantic Beach Hotel)"
                  value={newDepName}
                  onChange={(e) => setNewDepName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Location (e.g. Limbe)"
                    value={newDepLocation}
                    onChange={(e) => setNewDepLocation(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Rooms Count"
                    value={newDepRooms}
                    onChange={(e) => setNewDepRooms(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDep(false)}
                    className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white font-bold rounded"
                  >
                    Register
                  </button>
                </div>
              </form>
            )}

            {/* Deployment List */}
            <div className="space-y-2 text-xs">
              {deployments.map((dep) => {
                const isActive = dep.id === hotelConfig.deploymentId;
                return (
                  <div
                    key={dep.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-emerald-50/80 border-emerald-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{dep.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                            Active Instance
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {dep.location} • {dep.roomsCount} Rooms • Deployed {dep.deployedAt}
                      </div>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => switchDeployment(dep.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Base Room Type Pricing Override (Manager Only) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Base Inventory Room Rates
                </h3>
                <p className="text-[11px] text-slate-500">
                  Manager override for nightly category pricing
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {roomTypes.map((rt) => (
                <div
                  key={rt.id}
                  className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                >
                  <div className="flex-1 pr-2">
                    <span className="font-bold text-slate-900 block">{rt.name}</span>
                    <span className="text-[10px] text-slate-500">{rt.bedType} • Max {rt.maxCapacity} Guests</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1000"
                      value={pricingState[rt.id] || rt.basePrice}
                      onChange={(e) =>
                        setPricingState((prev) => ({
                          ...prev,
                          [rt.id]: Number(e.target.value)
                        }))
                      }
                      className="w-24 p-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-right"
                    />
                    <button
                      onClick={() => handleUpdatePrice(rt.id)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold"
                      title="Apply rate change"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
