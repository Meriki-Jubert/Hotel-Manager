import React, { useState, useEffect } from 'react';
import { useHMS } from '../context/HMSContext';
import { STAFF_USERS } from '../data/mockData';
import { UserRole } from '../types/hms';
import { isDemoMode } from '../config/appConfig';
import {
  Hotel,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Sparkles,
  BarChart3,
  ArrowRight,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  Lock,
  Clock
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    login,
    fastLogin,
    hotelConfig,
    staffUsers,
    createInitialOwner,
    failedLoginLockoutUntil
  } = useHMS();

  // Login form state (prefilled strings removed as required)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First-run Owner Setup form state
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Lockout countdown state
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      if (failedLoginLockoutUntil > now) {
        setLockoutRemaining(Math.ceil((failedLoginLockoutUntil - now) / 1000));
      } else {
        setLockoutRemaining(0);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [failedLoginLockoutUntil]);

  // Check if first-run setup is required (no staff accounts)
  const isFirstRun = staffUsers.length === 0;

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (lockoutRemaining > 0) {
      setErrorMsg(`Sign-in is locked due to 5 consecutive failed attempts. Please wait ${lockoutRemaining}s.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setErrorMsg(result.error || 'Invalid credentials. Please verify your username and password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError(null);

    if (!ownerFullName.trim()) {
      setOwnerError('Full name is required.');
      return;
    }
    if (!ownerUsername.trim() || ownerUsername.trim().length < 3) {
      setOwnerError('Username must be at least 3 characters.');
      return;
    }
    if (ownerPassword.length < 8) {
      setOwnerError('Password must be at least 8 characters.');
      return;
    }
    if (ownerPassword !== ownerPasswordConfirm) {
      setOwnerError('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInitialOwner({
        fullName: ownerFullName,
        username: ownerUsername,
        password: ownerPassword,
        email: ownerEmail,
        phone: ownerPhone
      });
      if (!result.success) {
        setOwnerError(result.error || 'Failed to create owner account.');
      }
    } finally {
      setIsSubmitting(false);
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
      permSummary: 'Remote executive monitoring: RevPAR, ADR, Occupancy %, Cash Flow across branches.'
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* 4K Architectural Hotel Backdrop */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=2000&auto=format&fit=crop&q=85"
          alt="Hotel Exterior"
          className="w-full h-full object-cover opacity-25 filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/95 to-slate-900/90" />
      </div>

      <div className="relative z-10 flex flex-col justify-between min-h-[calc(100vh-4rem)] w-full">
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
              <p className="text-xs text-slate-400">
                <span>{hotelConfig.city || 'Hotel Management System'}</span>
              </p>
            </div>
          </div>
          {isFirstRun && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              First-Run Setup Required
            </span>
          )}
        </div>

        {/* Main Content Area */}
        {isFirstRun ? (
          /* ================= FIRST-RUN OWNER SETUP SCREEN ================= */
          <div className="max-w-xl w-full mx-auto py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="bg-slate-800/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-champagne-gold-500/40 shadow-2xl space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-champagne-gold-500/10 text-champagne-gold-400 border border-champagne-gold-500/30 mb-3">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>First-Run Administrator Provisioning</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Create Owner Account</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  No staff accounts exist yet. Create your primary hotel owner account to initialize the system. This setup screen will not appear again once an owner exists.
                </p>
              </div>

              {ownerError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{ownerError}</span>
                </div>
              )}

              <form onSubmit={handleCreateOwner} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Owner Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                    placeholder="e.g., Dr. Martin Agbor"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username <span className="text-rose-400">* (used to log in)</span>
                  </label>
                  <input
                    type="text"
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value)}
                    placeholder="e.g., owner"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@hotel.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+237 6..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password <span className="text-rose-400">* (minimum 8 characters)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showOwnerPassword ? 'text' : 'password'}
                    value={ownerPasswordConfirm}
                    onChange={(e) => setOwnerPasswordConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    minLength={8}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-champagne-gold-500 font-mono"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 text-[11px] text-slate-400 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-champagne-gold-400 shrink-0 mt-0.5" />
                  <span>
                    Your password will be encrypted using SHA-256 with a unique cryptographic salt. It is never stored in plain text.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-champagne-gold-500 hover:bg-champagne-gold-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-champagne-gold-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating Owner Account...' : 'Create Owner Account & Enter Terminal'}</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ================= STANDARD LOGIN SCREEN ================= */
          <div className={`max-w-6xl w-full mx-auto py-8 sm:py-12 ${isDemoMode ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-center' : 'flex justify-center'}`}>
            
            {/* Left / Center Col: Credentials Form */}
            <div className={`${isDemoMode ? 'lg:col-span-5' : 'max-w-md w-full'} bg-slate-800/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl space-y-6`}>
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

              {/* Lockout Warning Banner */}
              {lockoutRemaining > 0 && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-start gap-2.5 animate-pulse">
                  <Clock className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Sign-In Locked (5 Failed Attempts)</strong>
                    <span>
                      Please wait <span className="font-mono font-bold text-white">{lockoutRemaining}s</span> before retrying.
                    </span>
                  </div>
                </div>
              )}

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
                    placeholder="Enter your username or email"
                    disabled={lockoutRemaining > 0}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Staff Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      disabled={lockoutRemaining > 0}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono disabled:opacity-50"
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
                  disabled={isSubmitting || lockoutRemaining > 0}
                  className="w-full py-3 px-4 bg-champagne-gold-500 hover:bg-champagne-gold-600 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-champagne-gold-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Terminal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {isDemoMode && (
                <div className="pt-2 text-[11px] text-slate-400 text-center border-t border-slate-750">
                  Demo Mode: For rapid testing, select a quick-role tile on the right.
                </div>
              )}
            </div>

            {/* Right Col: Quick Access ONLY IF VITE_DEMO_MODE=true */}
            {isDemoMode && (
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-champagne-gold-400" />
                    Demo Mode Role Switcher (VITE_DEMO_MODE=true)
                  </span>
                  <span className="text-[11px] text-champagne-gold-400 font-medium">4 Sample Profiles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STAFF_USERS.map((user) => {
                    const meta = roleCardMeta[user.role];
                    const Icon = meta.icon;

                    return (
                      <div
                        key={user.id}
                        onClick={() => fastLogin(user.role)}
                        className="bg-slate-800/90 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-champagne-gold-500/70 shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-3 hover:translate-y-[-2px]"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${meta.badgeColor}`}>
                              {user.role.replace('_', ' ')}
                            </span>
                            <Icon className="w-4 h-4 text-slate-400 group-hover:text-champagne-gold-400 transition-colors" />
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-champagne-gold-500/60"
                            />
                            <div>
                              <div className="font-bold text-sm text-white group-hover:text-champagne-gold-300 transition-colors">
                                {user.name}
                              </div>
                              <div className="text-[11px] text-slate-400">{user.title}</div>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-750">
                            {meta.permSummary}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-750 flex items-center justify-between text-xs text-champagne-gold-400 font-semibold group-hover:underline">
                          <span>Enter as {user.name.split(' ')[0]}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{hotelConfig.name}{hotelConfig.tagline ? ` • ${hotelConfig.tagline}` : ''}</span>
          <span className="font-mono text-[11px] text-slate-400">
            {hotelConfig.city ? `${hotelConfig.city} • ` : ''}Enterprise Hotel System
          </span>
        </div>
      </div>
    </div>
  );
};
