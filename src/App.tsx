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

  // Authenticated users start on Dashboard
  const [view, setView] = useState<AppView>('dashboard');

  // User is not logged in → show Login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // User is logged in → show the application
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