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

  const [isRegistering, setIsRegistering] =
    useState(false);

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);


  const login =
    useAuthStore(
      (state) => state.login
    );


  const register =
    useAuthStore(
      (state) => state.register
    );


  const recordLogin =
    useAnalyticsStore(
      (state) => state.recordLogin
    );


  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setError(null);
    setSubmitting(true);


    try {

      let result;


      if (isRegistering) {

        result =
          await register(
            name,
            email,
            password
          );

      } else {

        result =
          await login(
            email,
            password
          );
      }


      if (result.success) {

        recordLogin();

      } else {

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
  // SWITCH MODE
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

      {/* ========================================================
          LEFT BRAND PANEL
      ======================================================== */}

      <section className="login__panel login__panel--brand">

        <div className="login__scan-grid" />


        <div className="login__brand-mark">

          <div className="login__brand-icon">
            <Activity
              size={24}
              strokeWidth={2}
            />
          </div>

          <span>
            MedVision AI
          </span>

        </div>


        <div className="login__hero">

          <div className="login__hero-icon">
            <ScanLine
              size={44}
              strokeWidth={1.5}
            />
          </div>

          <h1>
            AI-Powered Medical Imaging Platform
          </h1>

          <p>
            Secure visualization for DICOM,
            MRI, CT and X-ray images.
          </p>

        </div>


        <ul className="login__features">

          {FEATURES.map(
            ({ icon: Icon, text }) => (

              <li key={text}>

                <span className="login__feature-icon">
                  <Icon size={17} />
                </span>

                <span>
                  {text}
                </span>

              </li>

            )
          )}

        </ul>


        <div className="login__footer">

          <div className="login__footnote">

            Secure medical imaging workspace

            <br />

            © 2026 MedVision AI

          </div>

        </div>

      </section>


      {/* ========================================================
          RIGHT FORM PANEL
      ======================================================== */}

      <section className="login__panel login__panel--form">

        <form
          className="login__card"
          onSubmit={handleSubmit}
        >

          <div className="login__form-heading">

            <h2>

              {
                isRegistering
                  ? 'Create Account'
                  : 'Welcome Back'
              }

            </h2>


            <p className="login__subtitle">

              {
                isRegistering
                  ? 'Create your secure medical imaging account.'
                  : 'Access your secure medical imaging workspace.'
              }

            </p>

          </div>


          {/* ====================================================
              NAME
          ==================================================== */}

          {
            isRegistering && (

              <label className="login__field">

                <span className="login__label">
                  Full Name
                </span>


                <div className="login__input-wrap">

                  <User
                    className="login__input-icon"
                    size={18}
                  />


                  <input
                    type="text"
                    value={name}
                    onChange={
                      (event) =>
                        setName(
                          event.target.value
                        )
                    }
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />

                </div>

              </label>

            )
          }


          {/* ====================================================
              EMAIL
          ==================================================== */}

          <label className="login__field">

            <span className="login__label">
              Email
            </span>


            <div className="login__input-wrap">

              <Mail
                className="login__input-icon"
                size={18}
              />


              <input
                type="email"
                value={email}
                onChange={
                  (event) =>
                    setEmail(
                      event.target.value
                    )
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

            </div>

          </label>


          {/* ====================================================
              PASSWORD
          ==================================================== */}

          <label className="login__field">

            <span className="login__label">
              Password
            </span>


            <div className="login__input-wrap login__input-wrap--password">

              <Lock
                className="login__input-icon"
                size={18}
              />


              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={
                  (event) =>
                    setPassword(
                      event.target.value
                    )
                }
                placeholder="••••••••••••"
                autoComplete={
                  isRegistering
                    ? 'new-password'
                    : 'current-password'
                }
                minLength={
                  isRegistering
                    ? 12
                    : undefined
                }
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

                {
                  showPassword
                    ? (
                      <EyeOff size={18} />
                    )
                    : (
                      <Eye size={18} />
                    )
                }

              </button>

            </div>


            {
              isRegistering && (

                <span className="login__password-hint">
                  Minimum 12 characters.
                </span>

              )
            }

          </label>


          {/* ====================================================
              LOGIN OPTIONS
          ==================================================== */}

          {
            !isRegistering && (

              <div className="login__options">

                <label className="login__remember">

                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={
                      (event) =>
                        setRemember(
                          event.target.checked
                        )
                    }
                  />

                  <span>
                    Remember me
                  </span>

                </label>


                <button
                  type="button"
                  className="login__forgot"
                >
                  Forgot Password?
                </button>

              </div>

            )
          }


          {/* ====================================================
              ERROR
          ==================================================== */}

          {
            error && (

              <div className="login__error">

                {error}

              </div>

            )
          }


          {/* ====================================================
              SUBMIT
          ==================================================== */}

          <button
            type="submit"
            className="login__submit"
            disabled={submitting}
          >

            <span>

              {
                submitting
                  ? (
                    isRegistering
                      ? 'Creating account...'
                      : 'Signing in...'
                  )
                  : (
                    isRegistering
                      ? 'Create Account'
                      : 'Sign In'
                  )
              }

            </span>


            {
              !submitting && (
                <ArrowRight size={18} />
              )
            }

          </button>


          {/* ====================================================
              MODE SWITCH
          ==================================================== */}

          <div className="login__mode-switch">

            <span>

              {
                isRegistering
                  ? 'Already have an account?'
                  : "Don't have an account?"
              }

            </span>


            <button
              type="button"
              onClick={switchMode}
            >

              {
                isRegistering
                  ? 'Sign In'
                  : 'Create Account'
              }

            </button>

          </div>

        </form>

      </section>

    </div>
  );
}