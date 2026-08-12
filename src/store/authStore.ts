import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = 'http://127.0.0.1:8000';

interface User {
  email: string;
  name: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;

  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;

  loginAsGuest: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      // ============================================================
      // LOGIN
      // ============================================================

      login: async (email, password) => {
        try {
          const response = await fetch(
            `${API_URL}/api/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email.trim().toLowerCase(),
                password,
              }),
            }
          );

          const data: AuthResponse =
            await response.json();

          if (!response.ok || !data.success) {
            return {
              success: false,
              error:
                data.message ??
                'Invalid email or password.',
            };
          }

          set({
            isAuthenticated: true,
            user: data.user ?? null,
            token: data.token ?? null,
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

      // ============================================================
      // REGISTER
      // ============================================================

      register: async (
        name,
        email,
        password
      ) => {
        try {
          const response = await fetch(
            `${API_URL}/api/auth/register`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
              }),
            }
          );

          const data: AuthResponse =
            await response.json();

          if (!response.ok || !data.success) {
            return {
              success: false,
              error:
                data.message ??
                'Registration failed.',
            };
          }

          // Automatically log the new user in
          set({
            isAuthenticated: true,
            user: data.user ?? null,
            token: data.token ?? null,
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

      // ============================================================
      // GUEST
      // ============================================================

      loginAsGuest: () =>
        set({
          isAuthenticated: true,
          user: {
            email: 'guest@medviewer.app',
            name: 'Guest',
          },
          token: 'guest-token',
        }),

      // ============================================================
      // LOGOUT
      // ============================================================

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        }),
    }),

    {
      name: 'mv-auth',
    }
  )
);