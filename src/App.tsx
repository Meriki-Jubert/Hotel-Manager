import React, { useState } from 'react';
import { HMSProvider, useHMS } from './context/HMSContext';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { RoomMatrix } from './components/RoomMatrix';
import { FrontDeskView } from './components/FrontDeskView';
import { FoliosListView } from './components/FoliosListView';
import { RestaurantPOS } from './components/RestaurantPOS';
import { HousekeepingView } from './components/HousekeepingView';
import { MaintenanceView } from './components/MaintenanceView';
import { OwnerAnalytics } from './components/OwnerAnalytics';
import { GuestsCRM } from './components/GuestsCRM';
import { CheckInModal } from './components/CheckInModal';
import { CheckOutModal } from './components/CheckOutModal';
import { GuestFolioModal } from './components/GuestFolioModal';
import { RoomDetailModal } from './components/RoomDetailModal';
import { NightAuditModal } from './components/NightAuditModal';
import { NewMaintenanceModal } from './components/NewMaintenanceModal';
import { Room, Reservation } from './types/hms';

const HMSMainApp: React.FC = () => {
  const { activeTab, setActiveTab, rooms, reservations } = useHMS();

  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInInitialRoom, setCheckInInitialRoom] = useState<Room | null>(null);

  const [checkoutReservation, setCheckoutReservation] = useState<Reservation | null>(null);
  const [folioReservation, setFolioReservation] = useState<Reservation | null>(null);
  const [inspectRoom, setInspectRoom] = useState<Room | null>(null);
  const [showNightAuditModal, setShowNightAuditModal] = useState(false);
  const [maintenanceInitialRoom, setMaintenanceInitialRoom] = useState<Room | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  // Handlers
  const handleOpenCheckInForRoom = (room: Room) => {
    setCheckInInitialRoom(room);
    setShowCheckInModal(true);
  };

  const handleOpenCheckOutForRes = (resId: string) => {
    const res = reservations.find((r) => r.id === resId);
    if (res) {
      setCheckoutReservation(res);
    }
  };

  const handleOpenFolioForRes = (resId: string) => {
    const res = reservations.find((r) => r.id === resId);
    if (res) {
      setFolioReservation(res);
    }
  };

  const handleOpenReportMaintenance = (room?: Room) => {
    setMaintenanceInitialRoom(room || null);
    setShowMaintenanceModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Top Navbar */}
      <Navbar
        onOpenCheckIn={() => {
          setCheckInInitialRoom(null);
          setShowCheckInModal(true);
        }}
        onOpenNightAudit={() => setShowNightAuditModal(true)}
      />

      {/* Module Tabs Navigation */}
      <NavigationTabs />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'matrix' && (
          <RoomMatrix
            onSelectRoom={(room) => setInspectRoom(room)}
            onOpenCheckInForRoom={handleOpenCheckInForRoom}
            onOpenCheckOutForRes={handleOpenCheckOutForRes}
            onOpenFolioForRes={handleOpenFolioForRes}
          />
        )}

        {activeTab === 'reservations' && (
          <FrontDeskView
            onOpenCheckIn={() => {
              setCheckInInitialRoom(null);
              setShowCheckInModal(true);
            }}
            onOpenFolio={handleOpenFolioForRes}
            onOpenCheckOut={handleOpenCheckOutForRes}
          />
        )}

        {activeTab === 'folios' && (
          <FoliosListView
            onOpenFolio={handleOpenFolioForRes}
            onOpenCheckOut={handleOpenCheckOutForRes}
          />
        )}

        {activeTab === 'pos' && <RestaurantPOS />}

        {activeTab === 'housekeeping' && (
          <HousekeepingView onReportMaintenance={handleOpenReportMaintenance} />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceView onOpenNewTicket={handleOpenReportMaintenance} />
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <h3 className="text-xl font-bold">End-of-Day Night Audit Hub</h3>
                <p className="text-xs text-slate-400">
                  Execute batch folio room charges, balance shift cash drawers, and roll over business date.
                </p>
              </div>
              <button
                onClick={() => setShowNightAuditModal(true)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-all whitespace-nowrap"
              >
                Launch Night Audit Wizard
              </button>
            </div>
            <OwnerAnalytics />
          </div>
        )}

        {activeTab === 'analytics' && <OwnerAnalytics />}

        {activeTab === 'guests' && <GuestsCRM />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Grand Mountain Resort & Suites • Cloud-Native Hotel Management System (HMS)</span>
          <span className="font-mono text-[11px] text-slate-400">Online-First Architecture • Buea, Cameroon</span>
        </div>
      </footer>

      {/* MODALS */}

      {/* Check In Modal */}
      {showCheckInModal && (
        <CheckInModal
          initialRoom={checkInInitialRoom}
          onClose={() => {
            setShowCheckInModal(false);
            setCheckInInitialRoom(null);
          }}
          onSuccess={(resId) => {
            setShowCheckInModal(false);
            setCheckInInitialRoom(null);
            handleOpenFolioForRes(resId);
          }}
        />
      )}

      {/* Check Out Modal */}
      {checkoutReservation && (
        <CheckOutModal
          reservation={checkoutReservation}
          onClose={() => setCheckoutReservation(null)}
          onSuccess={() => {
            setCheckoutReservation(null);
          }}
          onOpenFolio={() => {
            const current = checkoutReservation;
            setCheckoutReservation(null);
            handleOpenFolioForRes(current.id);
          }}
        />
      )}

      {/* Guest Folio Modal */}
      {folioReservation && (
        <GuestFolioModal
          reservation={folioReservation}
          onClose={() => setFolioReservation(null)}
        />
      )}

      {/* Room Detail / Inspection Modal */}
      {inspectRoom && (
        <RoomDetailModal
          room={inspectRoom}
          onClose={() => setInspectRoom(null)}
          onCheckIn={handleOpenCheckInForRoom}
          onCheckOut={handleOpenCheckOutForRes}
          onOpenFolio={handleOpenFolioForRes}
          onReportMaintenance={handleOpenReportMaintenance}
        />
      )}

      {/* Night Audit Modal */}
      {showNightAuditModal && (
        <NightAuditModal onClose={() => setShowNightAuditModal(false)} />
      )}

      {/* New Maintenance Modal */}
      {showMaintenanceModal && (
        <NewMaintenanceModal
          initialRoom={maintenanceInitialRoom}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={() => setShowMaintenanceModal(false)}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <HMSProvider>
      <HMSMainApp />
    </HMSProvider>
  );
}

export default App;
