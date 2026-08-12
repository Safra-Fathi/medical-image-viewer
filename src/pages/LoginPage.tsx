import { useState } from 'react';
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  ScanLine,
  Eye,
  EyeOff,
  FileStack,
  LayoutGrid,
  Layers,
  User,
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { useAnalyticsStore } from '../store/analyticsStore';

import './LoginPage.css';

const FEATURES = [
  {
    icon: FileStack,
    text: 'DICOM Support',
  },
  {
    icon: LayoutGrid,
    text: 'AI-Assisted Analysis',
  },
  {
    icon: Layers,
    text: 'MPR & Advanced Viewer',
  },
];

export default function LoginPage() {
  // ============================================================
  // FORM MODE
  // ============================================================

  const [isRegistering, setIsRegistering] =
    useState(false);

  // ============================================================
  // FORM VALUES
  // ============================================================

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ============================================================
  // UI STATE
  // ============================================================

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  // ============================================================
  // AUTH STORE
  // ============================================================

  const login = useAuthStore(
    (state) => state.login
  );

  const register = useAuthStore(
    (state) => state.register
  );

  // ============================================================
  // ANALYTICS
  // ============================================================

  const recordLogin = useAnalyticsStore(
    (state) => state.recordLogin
  );

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      let result;

      // --------------------------------------------------------
      // REGISTER
      // --------------------------------------------------------

      if (isRegistering) {
        result = await register(
          name,
          email,
          password
        );
      }

      // --------------------------------------------------------
      // LOGIN
      // --------------------------------------------------------

      else {
        result = await login(
          email,
          password
        );
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      if (result.success) {
        recordLogin();
      }

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      else {
        setError(
          result.error ??
            (
              isRegistering
                ? 'Registration failed.'
                : 'Login failed.'
            )
        );
      }
    } catch (err) {
      console.error(
        'Authentication error:',
        err
      );

      setError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // SWITCH LOGIN / REGISTER
  // ============================================================

  const switchMode = () => {
    setIsRegistering(
      (current) => !current
    );

    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setShowPassword(false);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="login">

      {/* ======================================================
          LEFT BRAND PANEL
      ====================================================== */}

      <div className="login__panel login__panel--brand">

        {/* Background scanner grid */}

        <div className="login__scan-grid"></div>

        {/* Brand Logo */}

        <div className="login__brand-mark">

          <Activity
            size={24}
            strokeWidth={2}
          />

          <span>
            MedVision AI
          </span>

        </div>

        {/* Hero Section */}

        <div className="login__hero">

          <ScanLine
            size={42}
            strokeWidth={1.5}
          />

          <h1>
            AI-Powered Medical Imaging Platform
          </h1>

          <p>
            Secure visualization for DICOM,
            MRI, CT and X-ray images.
          </p>

        </div>

        {/* Features */}

        <ul className="login__features">

          {FEATURES.map(
            ({ icon: Icon, text }) => (

              <li key={text}>

                <Icon size={17} />

                <span>
                  {text}
                </span>

              </li>

            )
          )}

        </ul>

        {/* Footer */}

        <div className="login__footer">

          <div className="login__footnote">

            Secure medical imaging workspace
            <br />

            © 2026 MedVision AI

          </div>

        </div>

      </div>

      {/* ======================================================
          RIGHT FORM PANEL
      ====================================================== */}

      <div className="login__panel login__panel--form">

        <form
          className="login__card"
          onSubmit={handleSubmit}
        >

          {/* ==================================================
              TITLE
          ================================================== */}

          <h2>
            {isRegistering
              ? 'Create Account'
              : 'Welcome Back'}
          </h2>

          <p className="login__subtitle">

            {isRegistering
              ? 'Create your secure medical imaging account.'
              : 'Access your secure medical imaging workspace.'}

          </p>

          {/* ==================================================
              NAME
              Only shown during registration
          ================================================== */}

          {isRegistering && (

            <label className="login__field">

              <span>
                Full Name
              </span>

              <div className="login__input-wrap">

                <User size={16} />

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Your name"
                  required
                />

              </div>

            </label>

          )}

          {/* ==================================================
              EMAIL
          ================================================== */}

          <label className="login__field">

            <span>
              Email
            </span>

            <div className="login__input-wrap">

              <Mail size={16} />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                required
              />

            </div>

          </label>

          {/* ==================================================
              PASSWORD
          ================================================== */}

          <label className="login__field">

            <span>
              Password
            </span>

            <div className="login__input-wrap">

              <Lock size={16} />

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="••••••••"
                minLength={6}
                required
              />

              <button
                type="button"
                className="login__peek"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >

                {showPassword ? (
                  <EyeOff size={15} />
                ) : (
                  <Eye size={15} />
                )}

              </button>

            </div>

          </label>

          {/* ==================================================
              LOGIN OPTIONS
              Only shown during login
          ================================================== */}

          {!isRegistering && (

            <div className="login__options">

              <label>

                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(
                      e.target.checked
                    )
                  }
                />

                Remember me

              </label>

              <a href="#">
                Forgot Password?
              </a>

            </div>

          )}

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div className="login__error">

              {error}

            </div>

          )}

          {/* ==================================================
              SUBMIT BUTTON
          ================================================== */}

          <button
            type="submit"
            className="login__submit"
            disabled={submitting}
          >

            {submitting
              ? (
                isRegistering
                  ? 'Creating account...'
                  : 'Signing in...'
              )
              : (
                isRegistering
                  ? 'Create Account'
                  : 'Sign In'
              )}

            {!submitting && (
              <ArrowRight size={16} />
            )}

          </button>

          {/* ==================================================
              LOGIN / REGISTER SWITCH
          ================================================== */}

          <div className="login__mode-switch">

            {isRegistering
              ? 'Already have an account?'
              : "Don't have an account?"}

            <button
              type="button"
              onClick={switchMode}
            >

              {isRegistering
                ? 'Sign In'
                : 'Create Account'}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}