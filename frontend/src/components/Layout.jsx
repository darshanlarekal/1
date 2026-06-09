import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { to: '/', label: 'Today', icon: '⚡' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950">
      {/* ── Sidebar (desktop) / Top bar (mobile) ─────────────────────────── */}
      <aside className="
        md:w-60 md:min-h-screen md:sticky md:top-0 md:h-screen md:flex-shrink-0
        flex md:flex-col justify-between
        bg-white dark:bg-gray-900
        border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800
        p-4 md:p-6 md:py-8
        z-30
      ">
        {/* Logo */}
        <div className="flex md:flex-col gap-4 md:gap-8 items-center md:items-start w-full">
          <div className="flex items-center gap-2 md:mb-2">
            <span className="text-2xl">📈</span>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
              +1<span className="text-green-500">%</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex md:flex-col gap-1 md:w-full flex-1">
            {NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                <span className="text-base">{icon}</span>
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom: user + controls */}
        <div className="hidden md:flex flex-col gap-3">
          {/* Streak badge */}
          {user?.currentStreak > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 rounded-xl">
              <span className={`text-sm ${user.currentStreak >= 7 ? 'animate-streak-pulse' : ''}`}>🔥</span>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                {user.currentStreak} day streak
              </span>
            </div>
          )}

          {/* Theme + user */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white dark:text-gray-900 uppercase">
                  {user?.username?.[0] || '?'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {user?.username}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? '☀️' : '🌙'}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                title="Log out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: theme toggle */}
        <div className="flex items-center gap-2 md:hidden ml-auto">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
