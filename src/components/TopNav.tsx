import { Activity, LayoutDashboard, ScanEye, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { AppView } from '../App';
import './TopNav.css';

interface TopNavProps {
  view: AppView;
  onChangeView: (v: AppView) => void;
}

export default function TopNav({ view, onChangeView }: TopNavProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <nav className="topnav">
      <div className="topnav__brand">
        <Activity size={17} strokeWidth={2} />
        <span>Medical Image Viewer</span>
      </div>

      <div className="topnav__tabs">
        <button
          className={`topnav__tab ${view === 'viewer' ? 'topnav__tab--active' : ''}`}
          onClick={() => onChangeView('viewer')}
        >
          <ScanEye size={14} />
          Viewer
        </button>
        <button
          className={`topnav__tab ${view === 'dashboard' ? 'topnav__tab--active' : ''}`}
          onClick={() => onChangeView('dashboard')}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
      </div>

      <div className="topnav__user">
        <span className="topnav__user-name">{user?.name ?? 'User'}</span>
        <button className="topnav__logout" onClick={logout} title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  );
}
