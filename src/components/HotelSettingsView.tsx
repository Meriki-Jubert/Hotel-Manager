import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { RoomType, Room, Branch, StaffUser, UserRole } from '../types/hms';
import {
  Settings,
  Building,
  DollarSign,
  PlusCircle,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Layers,
  Bed,
  Trash2,
  Edit3,
  Power,
  AlertTriangle,
  AlertCircle,
  Hash,
  X,
  Sparkles,
  GitBranch,
  Building2,
  Users,
  ShieldCheck,
  KeyRound,
  Lock,
  Clock,
  History
} from 'lucide-react';

export const HotelSettingsView: React.FC = () => {
  const {
    hotelConfig,
    updateHotelConfig,
    roomTypes,
    rooms,
    reservations,
    formatMoney,
    addRoomType,
    updateRoomType,
    deleteRoomType,
    toggleRoomTypeActive,
    addRoom,
    bulkAddRooms,
    updateRoom,
    deleteRoom,
    toggleRoomActive,
    branches,
    activeBranchId,
    activeBranch,
    hasMultipleActiveBranches,
    branchBusinessDates,
    addBranch,
    updateBranch,
    deleteBranch,
    toggleBranchActive,
    businessDate,
    allRooms,
    allReservations,
    allTransactions,
    allMaintenanceTickets,
    allNightAuditReports,
    currentUser,
    staffUsers,
    staffActivityLogs,
    addStaff,
    updateStaff,
    toggleStaffActive,
    resetStaffPassword
  } = useHMS();

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'branches' | 'room_types' | 'rooms' | 'staff'>('profile');

  // --- HOTEL PROFILE FORM STATE ---
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
  const [usdExchangeRate, setUsdExchangeRate] = useState(hotelConfig.usdExchangeRate || 600);

  const handleSaveHotelProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateHotelConfig({
      name: name.trim(),
      tagline: tagline.trim(),
      city: city.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      taxId: taxId.trim(),
      registryNumber: registryNumber.trim(),
      checkInTime,
      checkOutTime,
      usdExchangeRate: Number(usdExchangeRate) || 600
    });
  };

  // --- BRANCHES STATE & MODALS ---
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormCity, setBranchFormCity] = useState('');
  const [branchFormAddress, setBranchFormAddress] = useState('');
  const [branchFormPhone, setBranchFormPhone] = useState('');
  const [branchFormActive, setBranchFormActive] = useState(true);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);

  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchFormName('');
    setBranchFormCity('');
    setBranchFormAddress('');
    setBranchFormPhone('');
    setBranchFormActive(true);
    setBranchFormError(null);
    setShowAddBranchModal(true);
  };

  const openEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setBranchFormName(b.name);
    setBranchFormCity(b.city);
    setBranchFormAddress(b.address);
    setBranchFormPhone(b.phone);
    setBranchFormActive(b.isActive);
    setBranchFormError(null);
    setShowAddBranchModal(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchFormError(null);

    const bName = branchFormName.trim();
    const bCity = branchFormCity.trim();

    if (!bName) {
      setBranchFormError('Branch name is required.');
      return;
    }
    if (!bCity) {
      setBranchFormError('Branch city is required.');
      return;
    }

    if (editingBranch) {
      const res = updateBranch(editingBranch.id, {
        name: bName,
        city: bCity,
        address: branchFormAddress.trim(),
        phone: branchFormPhone.trim(),
        isActive: branchFormActive
      });
      if (!res.success) {
        setBranchFormError(res.error || 'Failed to update branch.');
        return;
      }
    } else {
      const res = addBranch({
        name: bName,
        city: bCity,
        address: branchFormAddress.trim(),
        phone: branchFormPhone.trim(),
        isActive: branchFormActive
      });
      if (!res.success) {
        setBranchFormError(res.error || 'Failed to create branch.');
        return;
      }
    }

    setShowAddBranchModal(false);
  };

  const handleDeleteBranch = (b: Branch) => {
    const res = deleteBranch(b.id);
    if (!res.success) {
      if (res.canDeactivateInstead) {
        setDeactivatePrompt({
          isOpen: true,
          type: 'branch',
          id: b.id,
          title: `Cannot Delete "${b.name}"`,
          message: `${res.error} Would you like to deactivate this branch instead? Deactivated branches are preserved in historical records and invoices but will be hidden from new reservations.`
        });
      }
    }
  };

  // --- ROOM TYPE STATE & MODALS ---
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

  // Deactivation prompt dialog state
  const [deactivatePrompt, setDeactivatePrompt] = useState<{
    isOpen: boolean;
    type: 'room_type' | 'room' | 'branch';
    id: string;
    title: string;
    message: string;
  } | null>(null);

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
      setTypeFormError('Room type name is required.');
      return;
    }
    if (!typeFormCode.trim()) {
      setTypeFormError('Room type code is required (e.g. STD, DLX).');
      return;
    }
    if (!typeFormPrice || Number(typeFormPrice) <= 0) {
      setTypeFormError('Base price must be greater than 0.');
      return;
    }
    if (!typeFormCapacity || Number(typeFormCapacity) < 1) {
      setTypeFormError('Max capacity must be at least 1 guest.');
      return;
    }
    if (!typeFormBedType.trim()) {
      setTypeFormError('Bed type is required.');
      return;
    }
    if (!typeFormDesc.trim()) {
      setTypeFormError('Description is required.');
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
        setTypeFormError(res.error || 'Failed to update room type.');
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
        setTypeFormError(res.error || 'Failed to add room type.');
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
          title: `Cannot Delete "${rt.name}"`,
          message: `${res.error} Would you like to deactivate this room type instead? Deactivated room types will be hidden from new reservations, check-ins, and POS charges.`
        });
      }
    }
  };

  // --- ROOMS STATE & MODALS ---
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const defaultBranchId = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1');

  // Single room form state
  const [roomFormNumber, setRoomFormNumber] = useState('');
  const [roomFormFloor, setRoomFormFloor] = useState<number>(1);
  const [roomFormTypeId, setRoomFormTypeId] = useState<string>(roomTypes[0]?.id || '');
  const [roomFormBranchId, setRoomFormBranchId] = useState<string>(defaultBranchId);
  const [roomFormPrice, setRoomFormPrice] = useState<number | ''>(roomTypes[0]?.basePrice || 35000);
  const [roomFormImage, setRoomFormImage] = useState('');
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Bulk add form state
  const [bulkTypeId, setBulkTypeId] = useState<string>(roomTypes[0]?.id || '');
  const [bulkBranchId, setBulkBranchId] = useState<string>(defaultBranchId);
  const [bulkFloor, setBulkFloor] = useState<number>(1);
  const [bulkStartNum, setBulkStartNum] = useState<number>(101);
  const [bulkEndNum, setBulkEndNum] = useState<number>(110);
  const [bulkPrice, setBulkPrice] = useState<number | ''>(roomTypes[0]?.basePrice || 35000);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Branch filter for rooms inventory list
  const [roomFilterBranchId, setRoomFilterBranchId] = useState<string>('all');

  const openAddRoom = () => {
    setEditingRoom(null);
    const initialTypeId = roomTypes[0]?.id || '';
    const initialPrice = roomTypes[0]?.basePrice || 35000;
    const initialBranch = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1');
    setRoomFormNumber('');
    setRoomFormFloor(1);
    setRoomFormTypeId(initialTypeId);
    setRoomFormBranchId(initialBranch);
    setRoomFormPrice(initialPrice);
    setRoomFormImage('');
    setRoomFormError(null);
    setShowAddRoomModal(true);
  };

  const openEditRoom = (r: Room) => {
    setEditingRoom(r);
    setRoomFormNumber(r.roomNumber);
    setRoomFormFloor(r.floor);
    setRoomFormTypeId(r.roomTypeId);
    setRoomFormBranchId(r.branchId || ((activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1')));
    setRoomFormPrice(r.pricePerNight);
    setRoomFormImage(r.image || '');
    setRoomFormError(null);
    setShowAddRoomModal(true);
  };

  const openBulkAddModal = () => {
    const initialBranch = (activeBranchId && activeBranchId !== 'all') ? activeBranchId : (branches[0]?.id || 'branch-1');
    setBulkTypeId(roomTypes[0]?.id || '');
    setBulkBranchId(initialBranch);
    setBulkFloor(1);
    setBulkStartNum(101);
    setBulkEndNum(110);
    setBulkPrice(roomTypes[0]?.basePrice || 35000);
    setBulkError(null);
    setShowBulkAddModal(true);
  };

  const handleRoomTypeSelectionChange = (newTypeId: string) => {
    setRoomFormTypeId(newTypeId);
    const matchedType = roomTypes.find((rt) => rt.id === newTypeId);
    if (matchedType) {
      setRoomFormPrice(matchedType.basePrice);
    }
  };

  const handleBulkTypeSelectionChange = (newTypeId: string) => {
    setBulkTypeId(newTypeId);
    const matchedType = roomTypes.find((rt) => rt.id === newTypeId);
    if (matchedType) {
      setBulkPrice(matchedType.basePrice);
    }
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomFormError(null);

    const num = roomFormNumber.trim();
    if (!num) {
      setRoomFormError('Room number is required.');
      return;
    }
    if (!roomFormTypeId) {
      setRoomFormError('Please select a room type.');
      return;
    }
    if (!roomFormBranchId) {
      setRoomFormError('Please select a branch.');
      return;
    }
    if (roomFormFloor === undefined || isNaN(Number(roomFormFloor))) {
      setRoomFormError('Floor must be a valid number.');
      return;
    }
    if (!roomFormPrice || Number(roomFormPrice) <= 0) {
      setRoomFormError('Price per night must be greater than 0.');
      return;
    }

    if (editingRoom) {
      const res = updateRoom(editingRoom.id, {
        roomNumber: num,
        floor: Number(roomFormFloor),
        roomTypeId: roomFormTypeId,
        branchId: roomFormBranchId,
        pricePerNight: Number(roomFormPrice),
        image: roomFormImage.trim() || undefined
      });
      if (!res.success) {
        setRoomFormError(res.error || 'Failed to update room.');
        return;
      }
    } else {
      const res = addRoom({
        roomNumber: num,
        floor: Number(roomFormFloor),
        roomTypeId: roomFormTypeId,
        branchId: roomFormBranchId,
        pricePerNight: Number(roomFormPrice),
        image: roomFormImage.trim() || undefined
      });
      if (!res.success) {
        setRoomFormError(res.error || 'Failed to create room.');
        return;
      }
    }

    setShowAddRoomModal(false);
  };

  const handleExecuteBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    if (!bulkTypeId) {
      setBulkError('Please select a room type.');
      return;
    }
    if (!bulkBranchId) {
      setBulkError('Please select a branch.');
      return;
    }
    if (isNaN(bulkStartNum) || isNaN(bulkEndNum)) {
      setBulkError('Start and End room numbers must be valid numbers.');
      return;
    }
    if (bulkStartNum > bulkEndNum) {
      setBulkError('Start room number cannot be greater than End room number.');
      return;
    }
    if (!bulkPrice || Number(bulkPrice) <= 0) {
      setBulkError('Price per night must be greater than 0.');
      return;
    }

    const res = bulkAddRooms({
      startNumber: Number(bulkStartNum),
      endNumber: Number(bulkEndNum),
      floor: Number(bulkFloor),
      roomTypeId: bulkTypeId,
      branchId: bulkBranchId,
      pricePerNight: Number(bulkPrice)
    });

    if (!res.success) {
      setBulkError(res.error || 'Failed to bulk-add rooms.');
      return;
    }

    setShowBulkAddModal(false);
  };

  const handleDeleteRoom = (r: Room) => {
    const res = deleteRoom(r.id);
    if (!res.success) {
      if (res.canDeactivateInstead) {
        setDeactivatePrompt({
          isOpen: true,
          type: 'room',
          id: r.id,
          title: `Cannot Delete Room #${r.roomNumber}`,
          message: `${res.error} Would you like to deactivate this room instead? Deactivated rooms will remain in financial audit logs but won't be offered for new bookings.`
        });
      }
    }
  };

  const handleConfirmDeactivateFromPrompt = () => {
    if (!deactivatePrompt) return;
    if (deactivatePrompt.type === 'room_type') {
      toggleRoomTypeActive(deactivatePrompt.id, false);
    } else if (deactivatePrompt.type === 'room') {
      toggleRoomActive(deactivatePrompt.id, false);
    } else if (deactivatePrompt.type === 'branch') {
      toggleBranchActive(deactivatePrompt.id, false);
    }
  };

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
    <div className="space-y-6">
      {/* Top Banner with Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Hotel Configuration & Inventory Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manager & Owner scope: Property branding, branch locations, currency conversion, room categories, and room inventory control
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveSettingsTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeSettingsTab === 'profile'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>Property & Currency</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('branches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeSettingsTab === 'branches'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-teal-600" />
            <span>Branches ({branches.length})</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('room_types')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeSettingsTab === 'room_types'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Room Types ({roomTypes.length})</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('rooms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'rooms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bed className="w-3.5 h-3.5 text-purple-600" />
            <span>Hotel Rooms ({allRooms.length})</span>
          </button>

          <button
            onClick={() => setActiveSettingsTab('staff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSettingsTab === 'staff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Staff Management ({staffUsers.length})</span>
          </button>
        </div>
      </div>

      {/* ================= SECTION 1: PROPERTY IDENTITY & CURRENCY ================= */}
      {activeSettingsTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hotel Identity Form */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Property Identity & Official Contact Info
              </h3>
              <span className="text-[11px] text-slate-400">Single-Tenant Hotel Profile</span>
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
                    placeholder="e.g. My Hotel"
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
                    placeholder="e.g. Luxury Boutique & Suites"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Buea"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Physical Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Main Street, Suite 100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reception Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. +237 600 000 000"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Reception Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. frontdesk@myhotel.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax ID / NIU (Cameroon)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. M01234567890X"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Registry (RCCM)</label>
                  <input
                    type="text"
                    value={registryNumber}
                    onChange={(e) => setRegistryNumber(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. RC/BUE/2026/B/100"
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
                  <span>Save Property Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Currency Configuration */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Currency & USD Exchange Rate
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure default currency and conversion rate</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Display Currency</label>
                  <select
                    value={hotelConfig.defaultCurrency}
                    onChange={(e) => updateHotelConfig({ defaultCurrency: e.target.value as 'FCFA' | 'USD' })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="FCFA">Central African CFA Franc (FCFA)</option>
                    <option value="USD">US Dollar (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">USD Exchange Rate (1 USD = X FCFA)</label>
                  <input
                    type="number"
                    value={usdExchangeRate}
                    onChange={(e) => setUsdExchangeRate(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used when converting rates and folios to USD (e.g. 600 FCFA/USD). Click "Save Property Profile" to persist.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-md space-y-3 text-xs">
              <div className="flex items-center gap-2 text-champagne-gold-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Single-Install Architecture</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This deployment serves exclusively <strong>{hotelConfig.name || 'your hotel'}</strong>.
                All room categories, inventory, folios, and financial reports belong to this single property.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION: BRANCHES INVENTORY & LOCATIONS ================= */}
      {activeSettingsTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-teal-600" />
                Hotel Branch Locations & Multi-Property Network
              </h3>
              <p className="text-xs text-slate-500">
                Manage branch properties in different cities. Each branch has its own independent rooms inventory, Business Date, and Night Audit ledger.
              </p>
            </div>

            <button
              onClick={openAddBranch}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs shadow-sm transition-all shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => {
              const bRooms = allRooms.filter((r) => r.branchId === b.id);
              const bOcc = bRooms.filter((r) => r.status === 'occupied').length;
              const bRes = allReservations.filter((r) => r.branchId === b.id);
              const bDate = branchBusinessDates[b.id] || businessDate;
              const isCurrent = activeBranchId === b.id;

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    !b.isActive
                      ? 'border-slate-200 opacity-60 bg-slate-50/50'
                      : isCurrent
                      ? 'border-teal-500 ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.city || 'No city set'}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {b.address && (
                        <div className="truncate">
                          <strong className="text-slate-700">Address:</strong> {b.address}
                        </div>
                      )}
                      {b.phone && (
                        <div>
                          <strong className="text-slate-700">Phone:</strong> {b.phone}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Business Date:</span>
                        <span className="font-mono font-bold text-slate-800">{bDate}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                      <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100">
                        <div className="text-sm font-bold font-mono text-purple-900">{bRooms.length}</div>
                        <div className="text-[10px] text-purple-700">Rooms ({bOcc} Occ)</div>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100">
                        <div className="text-sm font-bold font-mono text-blue-900">{bRes.length}</div>
                        <div className="text-[10px] text-blue-700">Reservations</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => toggleBranchActive(b.id, !b.isActive)}
                      className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded transition-colors ${
                        !b.isActive
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-amber-700 hover:bg-amber-50'
                      }`}
                      title={!b.isActive ? 'Activate branch' : 'Deactivate from new bookings'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{!b.isActive ? 'Activate' : 'Deactivate'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditBranch(b)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                        title="Edit Branch Information"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteBranch(b)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: ROOM TYPES INVENTORY ================= */}
      {activeSettingsTab === 'room_types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Configured Room Categories & Base Rates
              </h3>
              <p className="text-xs text-slate-500">
                Define room styles, guest capacities, bed types, and default nightly pricing
              </p>
            </div>

            <button
              onClick={openAddRoomType}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Room Type</span>
            </button>
          </div>

          {roomTypes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">No Room Types Defined</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Before adding physical rooms to your inventory, create at least one room category (e.g. Standard, Deluxe, Suite).
              </p>
              <button
                onClick={openAddRoomType}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Create First Room Type
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
                            {formatMoney(rt.basePrice)} / night
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
                          {isDeactivated ? 'Deactivated' : 'Active'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div>
                          <strong className="text-slate-800">Bed:</strong> {rt.bedType} • <strong className="text-slate-800">Max Capacity:</strong> {rt.maxCapacity} Guests
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
                            {a}
                          </span>
                        ))}
                        {rt.amenities.length > 4 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            +{rt.amenities.length - 4}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono pt-1">
                        Assigned to {associatedRooms.length} room{associatedRooms.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => toggleRoomTypeActive(rt.id, isDeactivated)}
                        className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded transition-colors ${
                          isDeactivated
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-amber-700 hover:bg-amber-50'
                        }`}
                        title={isDeactivated ? 'Activate this room type' : 'Deactivate from new bookings'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{isDeactivated ? 'Activate' : 'Deactivate'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditRoomType(rt)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="Edit Room Type"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRoomType(rt)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                          title="Delete Room Type"
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
        </div>
      )}

      {/* ================= SECTION 3: HOTEL ROOMS INVENTORY ================= */}
      {activeSettingsTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Bed className="w-4 h-4 text-purple-600" />
                Physical Rooms Inventory & Numbers
              </h3>
              <p className="text-xs text-slate-500">
                Manage individual rooms, assign floor levels and room categories, or bulk-generate rooms
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasMultipleActiveBranches && (
                <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-600 pl-1">Branch:</span>
                  <select
                    value={roomFilterBranchId}
                    onChange={(e) => setRoomFilterBranchId(e.target.value)}
                    className="p-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">All Branches ({allRooms.length})</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({allRooms.filter((r) => r.branchId === b.id).length})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => {
                  if (roomTypes.length === 0) {
                    setActiveSettingsTab('room_types');
                    return;
                  }
                  openBulkAddModal();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
              >
                <Hash className="w-4 h-4 text-champagne-gold-400" />
                <span>Bulk Add Rooms</span>
              </button>

              <button
                onClick={() => {
                  if (roomTypes.length === 0) {
                    setActiveSettingsTab('room_types');
                    return;
                  }
                  openAddRoom();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Single Room</span>
              </button>
            </div>
          </div>

          {allRooms.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                <Bed className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">No Hotel Rooms Created Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Add individual rooms or use the Bulk Add feature (e.g. rooms 101 to 110 on Floor 1) to quickly populate your property.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    if (roomTypes.length === 0) {
                      setActiveSettingsTab('room_types');
                    } else {
                      openAddRoom();
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg text-xs shadow-sm"
                >
                  {roomTypes.length === 0 ? 'Create Room Types First' : 'Add Single Room'}
                </button>
                {roomTypes.length > 0 && (
                  <button
                    onClick={openBulkAddModal}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs shadow-sm"
                  >
                    Bulk Add Rooms (Fast)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Room #</th>
                      {hasMultipleActiveBranches && (
                        <th className="py-3 px-4">Branch</th>
                      )}
                      <th className="py-3 px-4">Floor</th>
                      <th className="py-3 px-4">Room Category</th>
                      <th className="py-3 px-4 text-right">Nightly Price</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Inventory State</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(roomFilterBranchId === 'all'
                      ? allRooms
                      : allRooms.filter((r) => r.branchId === roomFilterBranchId)
                    ).map((r) => {
                      const rType = roomTypes.find((t) => t.id === r.roomTypeId);
                      const rBranch = branches.find((b) => b.id === r.branchId);
                      const isDeactivated = r.isActive === false;

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isDeactivated ? 'bg-slate-50/50 opacity-60' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold font-mono text-slate-900 text-sm">
                            #{r.roomNumber}
                          </td>
                          {hasMultipleActiveBranches && (
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800">
                                {rBranch?.name || 'Main Branch'}
                              </span>
                              {rBranch?.city && (
                                <span className="text-[10px] text-slate-400 block">
                                  {rBranch.city}
                                </span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-slate-600">
                            Floor {r.floor}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">
                              {rType?.name || 'Unknown Type'}
                            </span>
                            {rType && (
                              <span className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {rType.code}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatMoney(r.pricePerNight)}
                          </td>
                          <td className="py-3 px-4 capitalize font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  r.status === 'available'
                                    ? 'bg-emerald-500'
                                    : r.status === 'occupied'
                                    ? 'bg-rose-500'
                                    : r.status === 'reserved'
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isDeactivated
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isDeactivated ? 'Deactivated' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleRoomActive(r.id, isDeactivated)}
                                className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                                  isDeactivated
                                    ? 'text-emerald-700 hover:bg-emerald-50'
                                    : 'text-amber-700 hover:bg-amber-50'
                                }`}
                                title={isDeactivated ? 'Activate room' : 'Deactivate room'}
                              >
                                {isDeactivated ? 'Activate' : 'Deactivate'}
                              </button>

                              <button
                                onClick={() => openEditRoom(r)}
                                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                                title="Edit Room"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteRoom(r)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                                title="Delete Room"
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
        </div>
      )}

      {/* ================= SECTION 4: STAFF MANAGEMENT ================= */}
      {activeSettingsTab === 'staff' && (
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
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT STAFF ================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Add New Staff Member'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4 text-xs">
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
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono lowercase focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="front_desk">Front Desk</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                {staffFormRole !== 'owner' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Branch *</label>
                    <select
                      value={staffFormBranchId}
                      onChange={(e) => setStaffFormBranchId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {branches.filter((b) => b.isActive).map((b) => (
                        <option key={b.id} value={b.id}>
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
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={staffFormPhone}
                    onChange={(e) => setStaffFormPhone(e.target.value)}
                    placeholder="+237 ..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* ================= MODAL: ADD / EDIT ROOM TYPE ================= */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingType ? `Edit Room Type: ${editingType.name}` : 'Create New Room Type'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomType} className="p-5 space-y-4 text-xs">
              {typeFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{typeFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Room Type Name *</label>
                  <input
                    type="text"
                    value={typeFormName}
                    onChange={(e) => setTypeFormName(e.target.value)}
                    placeholder="e.g. Standard Executive Room"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code (3-4 Chars) *</label>
                  <input
                    type="text"
                    value={typeFormCode}
                    onChange={(e) => setTypeFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. STD"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Price / Night (FCFA) *</label>
                  <input
                    type="number"
                    step="500"
                    min="1"
                    value={typeFormPrice}
                    onChange={(e) => setTypeFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Capacity (Guests) *</label>
                  <input
                    type="number"
                    min="1"
                    value={typeFormCapacity}
                    onChange={(e) => setTypeFormCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bed Configuration *</label>
                  <input
                    type="text"
                    value={typeFormBedType}
                    onChange={(e) => setTypeFormBedType(e.target.value)}
                    placeholder="e.g. King Bed, 2x Twin Beds"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Optional Photo URL</label>
                  <input
                    type="url"
                    value={typeFormImage}
                    onChange={(e) => setTypeFormImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amenities (Comma separated)</label>
                <input
                  type="text"
                  value={typeFormAmenities}
                  onChange={(e) => setTypeFormAmenities(e.target.value)}
                  placeholder="Free Wi-Fi, Hot Shower, Smart TV, AC"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  value={typeFormDesc}
                  onChange={(e) => setTypeFormDesc(e.target.value)}
                  placeholder="Describe the room experience, view, or executive features..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingType ? 'Save Changes' : 'Create Room Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT SINGLE ROOM ================= */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingRoom ? `Edit Room #${editingRoom.roomNumber}` : 'Add New Hotel Room'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-5 space-y-4 text-xs">
              {roomFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{roomFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={roomFormNumber}
                    onChange={(e) => setRoomFormNumber(e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Level *</label>
                  <input
                    type="number"
                    value={roomFormFloor}
                    onChange={(e) => setRoomFormFloor(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch *</label>
                <select
                  value={roomFormBranchId}
                  onChange={(e) => setRoomFormBranchId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {branches.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || 'No city'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Rooms are created per branch and room numbers are unique within that branch.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room Type Category *</label>
                <select
                  value={roomFormTypeId}
                  onChange={(e) => handleRoomTypeSelectionChange(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code}) - {formatMoney(rt.basePrice)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting a category automatically sets the nightly rate default below.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nightly Price (FCFA) *</label>
                <input
                  type="number"
                  step="500"
                  min="1"
                  value={roomFormPrice}
                  onChange={(e) => setRoomFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Optional Photo URL</label>
                <input
                  type="url"
                  value={roomFormImage}
                  onChange={(e) => setRoomFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK ADD ROOMS ================= */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-champagne-gold-400" />
                <h3 className="font-bold text-sm sm:text-base">Bulk Add Hotel Rooms</h3>
              </div>
              <button
                onClick={() => setShowBulkAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkAdd} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 text-xs">
                Quickly populate a corridor or floor with sequential room numbers (e.g. rooms 101 to 110).
              </p>

              {bulkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Branch *</label>
                <select
                  value={bulkBranchId}
                  onChange={(e) => setBulkBranchId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {branches.filter((b) => b.isActive).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city || 'No city'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room Type Category *</label>
                <select
                  value={bulkTypeId}
                  onChange={(e) => handleBulkTypeSelectionChange(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code}) - {formatMoney(rt.basePrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Level *</label>
                  <input
                    type="number"
                    value={bulkFloor}
                    onChange={(e) => setBulkFloor(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Room # *</label>
                  <input
                    type="number"
                    value={bulkStartNum}
                    onChange={(e) => setBulkStartNum(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="101"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Room # *</label>
                  <input
                    type="number"
                    value={bulkEndNum}
                    onChange={(e) => setBulkEndNum(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="110"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price per Night (FCFA) *</label>
                <input
                  type="number"
                  step="500"
                  min="1"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                <strong>Preview:</strong> Will generate{' '}
                <span className="font-bold text-slate-900">
                  {Math.max(0, bulkEndNum - bulkStartNum + 1)}
                </span>{' '}
                rooms on Floor {bulkFloor}. All rooms will start with status <strong>AVAILABLE</strong>.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm"
                >
                  Generate Rooms Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT BRANCH ================= */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Branch Location'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-5 space-y-4 text-xs">
              {branchFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{branchFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={branchFormName}
                  onChange={(e) => setBranchFormName(e.target.value)}
                  placeholder="e.g. Limbe Oceanview, Douala Business Suites"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Location *</label>
                <input
                  type="text"
                  value={branchFormCity}
                  onChange={(e) => setBranchFormCity(e.target.value)}
                  placeholder="e.g. Limbe, Douala, Yaoundé"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={branchFormAddress}
                  onChange={(e) => setBranchFormAddress(e.target.value)}
                  placeholder="e.g. Down Beach Road, Limbe"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Direct Phone</label>
                <input
                  type="tel"
                  value={branchFormPhone}
                  onChange={(e) => setBranchFormPhone(e.target.value)}
                  placeholder="e.g. +237 670 11 22 33"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="branchActiveCheckbox"
                  checked={branchFormActive}
                  onChange={(e) => setBranchFormActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="branchActiveCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                  Branch is Active (Available for bookings & check-ins)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingBranch ? 'Save Branch Details' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DEACTIVATE PROMPT DIALOG ================= */}
      {deactivatePrompt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-full bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{deactivatePrompt.title}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {deactivatePrompt.message}
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeactivatePrompt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivateFromPrompt}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
              >
                Deactivate Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
