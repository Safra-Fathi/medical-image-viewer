import { useEffect, useState } from 'react';

import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ViewerPage from './pages/ViewerPage';

import TopNav from './components/TopNav';

import './App.css';


export type AppView =
  | 'viewer'
  | 'dashboard';


function App() {

  const isAuthenticated =
    useAuthStore(
      (state) =>
        state.isAuthenticated
    );


  const sessionChecked =
    useAuthStore(
      (state) =>
        state.sessionChecked
    );


  const validateSession =
    useAuthStore(
      (state) =>
        state.validateSession
    );


  // ============================================================
  // CURRENT APPLICATION VIEW
  // ============================================================

  const [
    view,
    setView,
  ] = useState<AppView>(
    'dashboard'
  );


  // ============================================================
  // VALIDATE SAVED SESSION ON APPLICATION START
  // ============================================================

  useEffect(() => {

    validateSession();

  }, [
    validateSession,
  ]);


  // ============================================================
  // WAIT FOR SESSION VALIDATION
  // ============================================================

  if (
    !sessionChecked
  ) {

    return (

      <div
        className="app-loading"
        style={{
          minHeight:
            '100vh',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          background:
            'var(--bg-void)',

          color:
            'var(--text-secondary)',

          fontSize:
            '14px',
        }}
      >

        Checking session...

      </div>

    );
  }


  // ============================================================
  // USER IS NOT AUTHENTICATED
  // ============================================================

  if (
    !isAuthenticated
  ) {

    return (
      <LoginPage />
    );
  }


  // ============================================================
  // AUTHENTICATED APPLICATION
  // ============================================================

  return (

    <div className="shell">

      <TopNav
        view={
          view
        }
        onChangeView={
          setView
        }
      />


      {
        view ===
        'viewer'
          ? (

            <ViewerPage />

          )
          : (

            <DashboardPage />

          )
      }

    </div>
  );
}


export default App;