// SmartSpend AI - Authentication Context
// Manages authentication state with Supabase integration
// Handles: login, register, logout, OTP verification, password reset

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase, Database } from '../data/datasources/supabase/supabase';
import { User } from '../shared/types';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'onboarding';

interface AuthContextValue {
  // Auth state
  authState: AuthState;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Auth methods
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<{ success: boolean; message: string }>;
  resendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPassword: string, token: string) => Promise<{ success: boolean; message: string }>;
  googleLogin: () => Promise<{ success: boolean; message: string }>;

  // Profile methods
  updateProfile: (profile: Partial<User>) => Promise<{ success: boolean; message: string }>;
  completeOnboarding: () => void;

  // Utility
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper to convert Supabase user to our User type
const mapSupabaseUser = (
  supabaseUser: Database['public']['Tables']['user_profiles']['Row'] | null,
  email?: string
): User | null => {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.user_id,
    email: email || '',
    fullName: supabaseUser.full_name || '',
    avatar: supabaseUser.avatar_url || undefined,
    age: supabaseUser.date_of_birth ? calculateAge(supabaseUser.date_of_birth) : undefined,
    dateOfBirth: supabaseUser.date_of_birth || undefined,
    job: supabaseUser.job || undefined,
    income: supabaseUser.initial_income || undefined,
    createdAt: new Date(),
  };
};

type AuthUserLike = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
    onboarding_completed?: boolean;
  };
};

const mapAuthUser = (authUser: AuthUserLike, fallbackFullName = ''): User => ({
  id: authUser.id,
  email: authUser.email || '',
  fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || fallbackFullName,
  avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
  createdAt: new Date(),
});

const isProfileComplete = (
  profile: Database['public']['Tables']['user_profiles']['Row'] | null,
  authUser?: AuthUserLike
): boolean => {
  if (authUser?.user_metadata?.onboarding_completed === true) {
    return true;
  }

  return Boolean(
    profile?.date_of_birth ||
    profile?.job ||
    profile?.initial_income != null
  );
};

const BLOCKED_ACCOUNT_MESSAGE = 'Tài khoản của bạn đã bị khóa bởi Admin.';

const isAccountActive = (profile: Database['public']['Tables']['user_profiles']['Row'] | null) => {
  if (!profile) return true;
  const status = (profile.account_status || 'active').trim().toLowerCase();
  return status === 'active';
};

const getAuthRedirectUrl = (path: string): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return `smartspendai://${path.replace(/^\//, '')}`;
};

const getOAuthUrlParam = (key: string): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return searchParams.get(key) || hashParams.get(key);
};

const clearOAuthUrlParams = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
};

const exchangeOAuthCodeIfPresent = async (): Promise<string | null> => {
  const oauthError = getOAuthUrlParam('error_description') || getOAuthUrlParam('error');
  if (oauthError) {
    clearOAuthUrlParams();
    return decodeURIComponent(oauthError.replace(/\+/g, ' '));
  }

  const code = getOAuthUrlParam('code');
  if (code && Platform.OS === 'web' && typeof window !== 'undefined') {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
    clearOAuthUrlParams();
    if (exchangeError) {
      return exchangeError.message;
    }
  }

  return null;
};

// Helper to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number | undefined => {
  if (!dateOfBirth) return undefined;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const oauthCallbackError = await exchangeOAuthCodeIfPresent();
        if (oauthCallbackError) {
          setError(oauthCallbackError);
          setAuthState('unauthenticated');
          return;
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setAuthState('unauthenticated');
          return;
        }

        if (session?.user) {
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            setUser(mapAuthUser(session.user));
            setAuthState('onboarding');
          } else if (!isAccountActive(profile)) {
            await supabase.auth.signOut();
            setUser(null);
            setError(BLOCKED_ACCOUNT_MESSAGE);
            setAuthState('unauthenticated');
          } else if (isProfileComplete(profile, session.user)) {
            setUser(profile ? mapSupabaseUser(profile, session.user.email) : mapAuthUser(session.user));
            setAuthState('authenticated');
          } else {
            setUser(profile ? mapSupabaseUser(profile, session.user.email) : mapAuthUser(session.user));
            setAuthState('onboarding');
          }
        } else {
          setAuthState('unauthenticated');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setAuthState('unauthenticated');
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!isAccountActive(profile)) {
          await supabase.auth.signOut();
          setUser(null);
          setError(BLOCKED_ACCOUNT_MESSAGE);
          setAuthState('unauthenticated');
        } else if (isProfileComplete(profile, session.user)) {
          setUser(profile ? mapSupabaseUser(profile, session.user.email) : mapAuthUser(session.user));
          setAuthState('authenticated');
        } else {
          setUser(profile ? mapSupabaseUser(profile, session.user.email) : mapAuthUser(session.user));
          setAuthState('onboarding');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthState('unauthenticated');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`profile-status-${user.id}`);
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${user.id}` },
      async (payload) => {
        const nextProfile = payload.new as Database['public']['Tables']['user_profiles']['Row'];
        if (!isAccountActive(nextProfile)) {
          setError(BLOCKED_ACCOUNT_MESSAGE);
          setUser(null);
          setAuthState('unauthenticated');
          await supabase.auth.signOut();
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return { success: false, message: authError.message };
      }

      if (data.user) {
        // Check if profile exists and has full name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!isAccountActive(profile)) {
          await supabase.auth.signOut();
          setUser(null);
          setAuthState('unauthenticated');
          setError(BLOCKED_ACCOUNT_MESSAGE);
          return { success: false, message: BLOCKED_ACCOUNT_MESSAGE };
        }

        if (isProfileComplete(profile, data.user)) {
          setUser(profile ? mapSupabaseUser(profile, data.user.email) : mapAuthUser(data.user));
          setAuthState('authenticated');
        } else {
          setUser(profile ? mapSupabaseUser(profile, data.user.email) : mapAuthUser(data.user));
          setAuthState('onboarding');
        }
      }

      return { success: true, message: 'Đăng nhập thành công!' };
    } catch (err: any) {
      const message = err.message || 'Đăng nhập thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register new user
  const register = useCallback(async (email: string, password: string, fullName: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { success: false, message: signUpError.message };
      }

      if (data.session?.user) {
        setUser(mapAuthUser(data.session.user, fullName));
        setAuthState('onboarding');
      }

      return {
        success: true,
        message: data.session
          ? 'Đăng ký thành công! Vui lòng hoàn thiện hồ sơ.'
          : 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      };
    } catch (err: any) {
      const message = err.message || 'Đăng ký thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Logout error:', signOutError);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local auth state so the app returns to Login even if the
      // network sign-out request fails. Supabase will also emit SIGNED_OUT
      // when the session is cleared successfully.
      setUser(null);
      setAuthState('unauthenticated');
      setIsLoading(false);
    }
  }, []);

  // Verify OTP token
  const verifyOTP = useCallback(async (email: string, token: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (verifyError) {
        setError(verifyError.message);
        return { success: false, message: verifyError.message };
      }

      return { success: true, message: 'Xác thực thành công!' };
    } catch (err: any) {
      const message = err.message || 'Xác thực thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resend OTP
  const resendOTP = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) {
        setError(resendError.message);
        return { success: false, message: resendError.message };
      }

      return { success: true, message: 'Đã gửi lại mã xác thực!' };
    } catch (err: any) {
      const message = err.message || 'Gửi lại mã thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Forgot password - request reset email
  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'smartspendai://reset-password',
      });

      if (resetError) {
        setError(resetError.message);
        return { success: false, message: resetError.message };
      }

      return {
        success: true,
        message: 'Đã gửi liên kết đặt lại mật khẩu đến email của bạn!',
      };
    } catch (err: any) {
      const message = err.message || 'Yêu cầu thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password with token
  const resetPassword = useCallback(async (email: string, newPassword: string, token: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify the token first
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (verifyError) {
        setError(verifyError.message);
        return { success: false, message: verifyError.message };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return { success: false, message: updateError.message };
      }

      return { success: true, message: 'Đặt lại mật khẩu thành công!' };
    } catch (err: any) {
      const message = err.message || 'Đặt lại mật khẩu thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Google login (UI only - actual implementation requires OAuth setup)
  const googleLogin = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl('/login-callback'),
        },
      });

      if (googleError) {
        setError(googleError.message);
        return { success: false, message: googleError.message };
      }

      return { success: true, message: 'Đang chuyển hướng...' };
    } catch (err: any) {
      const message = err.message || 'Đăng nhập Google thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profileData: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Người dùng chưa đăng nhập' };
    }

    setIsLoading(true);
    setError(null);

    // Convert date input to date_of_birth. Fall back to approximate age conversion for old callers.
    let dateOfBirth: string | undefined;
    if (profileData.dateOfBirth !== undefined) {
      dateOfBirth = profileData.dateOfBirth || undefined;
    } else if (profileData.age) {
      // Calculate approximate birth year from age
      const birthYear = new Date().getFullYear() - profileData.age;
      dateOfBirth = `${birthYear}-01-01`; // Default to Jan 1st
    }

    const profileUpdate: Database['public']['Tables']['user_profiles']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (profileData.fullName !== undefined) profileUpdate.full_name = profileData.fullName;
    if (profileData.avatar !== undefined) profileUpdate.avatar_url = profileData.avatar;
    if (profileData.dateOfBirth !== undefined || profileData.age !== undefined) {
      profileUpdate.date_of_birth = dateOfBirth || null;
    }
    if (profileData.job !== undefined) profileUpdate.job = profileData.job;
    if (profileData.income !== undefined) profileUpdate.initial_income = profileData.income;

    try {
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(profileUpdate)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        // Profile might not exist yet, try to create it
        if (updateError.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              full_name: profileData.fullName ?? user.fullName,
              avatar_url: profileData.avatar ?? user.avatar,
              date_of_birth: dateOfBirth ?? user.dateOfBirth ?? null,
              job: profileData.job ?? user.job,
              initial_income: profileData.income ?? user.income,
              currency_code: 'VND',
              locale: 'vi',
              time_zone: 'Asia/Ho_Chi_Minh',
            })
            .select()
            .single();

          if (insertError) {
            setError(insertError.message);
            return { success: false, message: insertError.message };
          }

          await supabase.auth.updateUser({
            data: {
              full_name: profileData.fullName ?? user.fullName,
              onboarding_completed: true,
            },
          });

          setUser(mapSupabaseUser(newProfile, user.email));
          return { success: true, message: 'Cập nhật thông tin thành công!' };
        }

        setError(updateError.message);
        return { success: false, message: updateError.message };
      }

      await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName ?? user.fullName,
          onboarding_completed: true,
        },
      });

      setUser(mapSupabaseUser(data, user.email));
      return { success: true, message: 'Cập nhật thông tin thành công!' };
    } catch (err: any) {
      const message = err.message || 'Cập nhật thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(() => {
    supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
      },
    }).catch((err) => {
      console.error('Failed to persist onboarding status:', err);
    });
    setAuthState('authenticated');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        googleLogin,
        updateProfile,
        completeOnboarding,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
