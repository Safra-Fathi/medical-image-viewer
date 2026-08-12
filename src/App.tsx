import { useState } from 'react';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ViewerPage from './pages/ViewerPage';
import TopNav from './components/TopNav';
import './App.css';

export type AppView = 'viewer' | 'dashboard';

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Change this to dashboard if you want Dashboard to open first
const [view, setView] = useState<AppView>('dashboard');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="shell">
      <TopNav view={view} onChangeView={setView} />

      {view === 'viewer' ? (
        <ViewerPage />
      ) : (
        <DashboardPage />
      )}
    </div>
  );
}

export default App;