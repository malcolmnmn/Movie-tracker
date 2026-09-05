import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-yellow-400 text-gray-900' : 'text-gray-200 hover:bg-gray-700'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-yellow-400 mr-2">🎬 Movie Tracker</span>
        <NavLink to="/watchlist" className={linkClass}>
          Watchlist
        </NavLink>
        <NavLink to="/watched" className={linkClass}>
          Geschaut
        </NavLink>
        <NavLink to="/friends" className={linkClass}>
          Freunde
        </NavLink>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-300">
        <span>
          Angemeldet als <strong className="text-white">{user.username}</strong>
        </span>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100"
        >
          Abmelden
        </button>
      </div>
    </nav>
  );
}
