import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = 'http://127.0.0.1:8000';

interface User {
  id?: number;
  email: string;
  name: string;
}

interface AuthResponse {
  success?: boolean;
  user?: User;
  token?: string;
  message?: string;
  detail?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;

  sessionChecked: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  validateSession: () => Promise<boolean>;

  clearSession: () => void;

  loginAsGuest: () => void;

  logout: () => Promise<void>;
}


// ============================================================
// SAFE JSON PARSER
// ============================================================

async function readResponseJson(
  response: Response
): Promise<AuthResponse> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}


// ============================================================
// AUTH STORE
// ============================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,

      user: null,

      token: null,

      sessionChecked: false,


      // ========================================================
      // CLEAR SESSION
      // ========================================================

      clearSession: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          sessionChecked: true,
        });
      },


      // ========================================================
      // LOGIN
      // ========================================================

      login: async (
        email,
        password
      ) => {
        try {
          const response =
            await fetch(
              `${API_URL}/api/auth/login`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    email:
                      email
                        .trim()
                        .toLowerCase(),

                    password,
                  }),
              }
            );


          const data =
            await readResponseJson(
              response
            );


          if (
            !response.ok ||
            !data.success
          ) {
            return {
              success: false,

              error:
                data.detail ??
                data.message ??
                'Invalid email or password.',
            };
          }


          if (
            !data.token ||
            !data.user
          ) {
            return {
              success: false,

              error:
                'Login response did not contain a valid session.',
            };
          }


          set({
            isAuthenticated: true,

            user:
              data.user,

            token:
              data.token,

            sessionChecked: true,
          });


          return {
            success: true,
          };

        } catch (error) {
          console.error(
            'Login error:',
            error
          );


          return {
            success: false,

            error:
              'Unable to connect to the server. Make sure the FastAPI backend is running.',
          };
        }
      },


      // ========================================================
      // REGISTER
      // ========================================================

      register: async (
        name,
        email,
        password
      ) => {
        try {
          const response =
            await fetch(
              `${API_URL}/api/auth/register`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    name:
                      name.trim(),

                    email:
                      email
                        .trim()
                        .toLowerCase(),

                    password,
                  }),
              }
            );


          const data =
            await readResponseJson(
              response
            );


          if (
            !response.ok ||
            !data.success
          ) {
            return {
              success: false,

              error:
                data.detail ??
                data.message ??
                'Registration failed.',
            };
          }


          if (
            !data.token ||
            !data.user
          ) {
            return {
              success: false,

              error:
                'Registration response did not contain a valid session.',
            };
          }


          set({
            isAuthenticated: true,

            user:
              data.user,

            token:
              data.token,

            sessionChecked: true,
          });


          return {
            success: true,
          };

        } catch (error) {
          console.error(
            'Registration error:',
            error
          );


          return {
            success: false,

            error:
              'Unable to connect to the server. Make sure the FastAPI backend is running.',
          };
        }
      },


      // ========================================================
      // VALIDATE EXISTING SESSION
      // ========================================================

      validateSession: async () => {
        const token =
          get().token;


        // No saved token
        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            sessionChecked: true,
          });

          return false;
        }


        // Guest mode is local only.
        // It must not be treated as a valid backend session.
        if (
          token ===
          'guest-token'
        ) {
          set({
            sessionChecked: true,
          });

          return true;
        }


        try {
          const response =
            await fetch(
              `${API_URL}/api/auth/me`,
              {
                method: 'GET',

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );


          const data =
            await readResponseJson(
              response
            );


          if (
            response.status ===
              401 ||
            !response.ok ||
            !data.user
          ) {
            get().clearSession();

            return false;
          }


          set({
            isAuthenticated: true,

            user:
              data.user,

            sessionChecked: true,
          });


          return true;

        } catch (error) {
          console.error(
            'Session validation failed:',
            error
          );


          // Important:
          // Do not immediately destroy a valid session
          // just because the backend is temporarily offline.

          set({
            sessionChecked: true,
          });


          return false;
        }
      },


      // ========================================================
      // GUEST LOGIN
      // ========================================================

      loginAsGuest: () => {
        set({
          isAuthenticated: true,

          user: {
            email:
              'guest@medviewer.app',

            name:
              'Guest',
          },

          token:
            'guest-token',

          sessionChecked: true,
        });
      },


      // ========================================================
      // LOGOUT
      // ========================================================

      logout: async () => {
        const token =
          get().token;


        try {
          if (
            token &&
            token !==
              'guest-token'
          ) {
            await fetch(
              `${API_URL}/api/auth/logout`,
              {
                method: 'POST',

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );
          }

        } catch (error) {
          console.error(
            'Logout request failed:',
            error
          );

        } finally {
          set({
            isAuthenticated: false,

            user: null,

            token: null,

            sessionChecked: true,
          });
        }
      },
    }),

    {
      name: 'mv-auth',

      partialize:
        (state) => ({
          isAuthenticated:
            state.isAuthenticated,

          user:
            state.user,

          token:
            state.token,
        }),
    }
  )
);