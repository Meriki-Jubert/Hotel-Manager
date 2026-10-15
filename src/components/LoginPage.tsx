import React, { useState } from 'react';
import { useHMS } from '../context/HMSContext';
import { STAFF_USERS } from '../data/mockData';
import { UserRole } from '../types/hms';
import {
  Hotel,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Sparkles,
  BarChart3,
  Lock,
  ArrowRight,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, fastLogin, hotelConfig, deployments, switchDeployment } = useHMS();

  const [username, setUsername] = useState('frontdesk');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeploymentSelector, setShowDeploymentSelector] = useState(false);

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const success = login(username, password);
    if (!success) {
      setErrorMsg('Invalid credentials. Check username or select a quick-role tile below.');
    }
  };

  const roleCardMeta: Record<
    UserRole,
    { icon: React.ElementType; badgeColor: string; highlight: string; permSummary: string }
  > = {
    front_desk: {
      icon: UserCheck,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      highlight: 'Front Desk Clerk',
      permSummary: 'Room Matrix, Check-ins, Reservations, Deposits & Folio Billings.'
    },
    housekeeping: {
      icon: Sparkles,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      highlight: 'Housekeeping Staff',
      permSummary: 'Mobile room cleaning queue, status flip (Dirty ➔ Clean), maintenance alerts.'
    },
    manager: {
      icon: KeyRound,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      highlight: 'Manager / Accountant',
      permSummary: 'Full control: Night audit, folio voids, room pricing, cash drawer balance & settings.'
    },
    owner: {
      icon: BarChart3,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      highlight: 'Owner (Read-Only)',
      permSummary: 'Remote executive monitoring: RevPAR, ADR, Occupancy %, Cash Flow.'
    }
  };

  return (
    <div 
      className="min-h-screen text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8"
      style={{ 
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.85)), url('https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Luxury%20modern%20hotel%20reception%20desk%2C%20elegant%20lobby%2C%204k%20high%20resolution%20architecture%20photography%2C%20cinematic%20lighting&image_size=landscape_16_9')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Top Brand Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <Hotel className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
              {hotelConfig.name}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{hotelConfig.city}</span>
              <span>•</span>
              <span className="font-mono text-emerald-400">{hotelConfig.deploymentId}</span>
            </p>
          </div>
        </div>

        {/* Deployment Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowDeploymentSelector(!showDeploymentSelector)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Deployment:</span>
            <span className="text-white font-mono">{hotelConfig.deploymentId}</span>
          </button>

          {showDeploymentSelector && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-2 z-50">
              <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                Switch Property Instance
              </div>
              <div className="space-y-1 mt-1">
                {deployments.map((dep) => (
                  <button
                    key={dep.id}
                    onClick={() => {
                      switchDeployment(dep.id);
                      setShowDeploymentSelector(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      dep.id === hotelConfig.deploymentId
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{dep.name}</div>
                      <div className="text-[10px] text-slate-400">{dep.location} ({dep.roomsCount} Rooms)</div>
                    </div>
                    <span className="font-mono text-[10px] opacity-75">{dep.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Col: Credentials Form */}
        <div className="lg:col-span-5 bg-slate-800/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl space-y-6">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role-Isolated Staff Access</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Staff Portal Sign-In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authenticate with your assigned property terminal credentials.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Staff Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="frontdesk, manager, housekeeping..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Password / PIN
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Sign In to Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-[11px] text-slate-400 text-center border-t border-slate-700/60">
            For rapid evaluation, click any of the 4 role profiles on the right.
          </div>
        </div>

        {/* Right Col: Quick Access by 4 Distinct Roles */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Instant Role Verification (One-Click)
            </span>
            <span className="text-[11px] text-emerald-400">4 Enforced Security Levels</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STAFF_USERS.map((user) => {
              const meta = roleCardMeta[user.role];
              const Icon = meta.icon;

              return (
                <div
                  key={user.id}
                  onClick={() => fastLogin(user.role)}
                  className="bg-slate-800/90 hover:bg-slate-750 p-4 rounded-2xl border border-slate-700 hover:border-emerald-500/50 shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3 hover:translate-y-[-2px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${meta.badgeColor}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-emerald-500/60"
                      />
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{user.title}</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-750">
                      {meta.permSummary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-750 flex items-center justify-between text-xs text-emerald-400 font-semibold group-hover:underline">
                    <span>Enter as {user.name.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security & RLS Architectural Note */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Architecture:</strong> Single-tenant deployment model. Tabs, routes, actions, and API operations are strictly isolated per role scope.
            </span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{hotelConfig.name} • {hotelConfig.tagline}</span>
        <span className="font-mono text-[11px] text-slate-400">Buea • Limbe • Douala Cloud HMS</span>
      </div>
    </div>
  );
};
