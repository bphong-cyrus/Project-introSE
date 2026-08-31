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
  resendOTP: (email: string, type?: 'signup' | 'reset_password') => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPassword: string, verificationToken: string) => Promise<{ success: boolean; message: string }>;
  verifyResetPasswordOTP: (email: string, otpCode: string) => Promise<{ success: boolean; message: string; verificationToken?: string }>;
  googleLogin: () => Promise<{ success: boolean; message: string }>;

  // Profile methods
  updateProfile: (profile: Partial<User>) => Promise<{ success: boolean; message: string }>;
  completeOnboarding: () => void;

  // Utility
  clearError: () => void;
}

// Edge Function URLs - Cấu hình Supabase Edge Functions
const SUPABASE_FUNCTIONS_URL = 'https://ndtkwtsmseibznarqvsw.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdGt3dHNtc2VpYnpuYXJxdnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTE0MzEsImV4cCI6MjEwMDEyNzQzMX0.ETM2DZpUh1bIj_QsPR1NusQyFmEYgRtOqqqJxZlPQHw';

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
          return;
        }

        setUser(mapSupabaseUser(nextProfile, user.email));
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, user?.id]);

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

  // ========================================================================
  // LUỒNG QUÊN MẬT KHẨU (UC03) - Sử dụng OTP 6 số
  // ========================================================================

  // Bước 1: Gửi mã OTP qua email (Edge Function)
  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Định dạng email không hợp lệ.');
        return { success: false, message: 'Định dạng email không hợp lệ.' };
      }

      // Gọi Edge Function để gửi OTP qua Resend
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-password-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Không thể gửi mã OTP. Vui lòng thử lại.');
        return { success: false, message: result.error || 'Không thể gửi mã OTP. Vui lòng thử lại.' };
      }

      return {
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc spam).',
      };
    } catch (err: any) {
      const message = err.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bước 2: Xác thực OTP (cho cả đăng ký và reset password)
  const verifyOTP = useCallback(async (email: string, token: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Sử dụng Supabase Auth OTP cho signup
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

  // Bước 2b: Xác thực OTP cho reset password (gọi Edge Function)
  const verifyResetPasswordOTP = useCallback(async (email: string, otpCode: string): Promise<{ success: boolean; message: string; verificationToken?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        setError('Mã OTP phải là 6 chữ số.');
        return { success: false, message: 'Mã OTP phải là 6 chữ số.' };
      }

      // Gọi Edge Function để verify OTP
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-password-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp_code: otpCode
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
        return { success: false, message: result.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.' };
      }

      return {
        success: true,
        message: 'Xác thực OTP thành công!',
        verificationToken: result.verification_token,
      };
    } catch (err: any) {
      const message = err.message || 'Không thể xác thực OTP. Vui lòng thử lại.';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bước 3: Gửi lại mã OTP
  const resendOTP = useCallback(async (email: string, type: 'signup' | 'reset_password' = 'signup'): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      if (type === 'reset_password') {
        // Gọi Edge Function để gửi lại OTP reset password
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-password-reset-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
          return { success: false, message: result.error || 'Không thể gửi lại mã OTP. Vui lòng thử lại.' };
        }

        return { success: true, message: 'Đã gửi lại mã OTP đến email của bạn.' };
      } else {
        // Sử dụng Supabase Auth cho signup
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
        });

        if (resendError) {
          setError(resendError.message);
          return { success: false, message: resendError.message };
        }

        return { success: true, message: 'Đã gửi lại mã xác thực!' };
      }
    } catch (err: any) {
      const message = err.message || 'Gửi lại mã thất bại';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bước 4: Đặt lại mật khẩu với verification token (gọi Edge Function)
  const resetPassword = useCallback(async (email: string, newPassword: string, verificationToken: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Decode token để lấy user_id
      const tokenParts = verificationToken.split('.');
      if (tokenParts.length !== 3) {
        setError('Token không hợp lệ. Vui lòng xác thực OTP lại.');
        return { success: false, message: 'Token không hợp lệ. Vui lòng xác thực OTP lại.' };
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        setError('Token đã hết hạn. Vui lòng xác thực OTP lại.');
        return { success: false, message: 'Token đã hết hạn. Vui lòng xác thực OTP lại.' };
      }

      if (payload.purpose !== 'reset_password') {
        setError('Token không hợp lệ cho mục đích đặt lại mật khẩu.');
        return { success: false, message: 'Token không hợp lệ cho mục đích đặt lại mật khẩu.' };
      }

      const userId = payload.user_id;
      if (!userId) {
        setError('Token không chứa thông tin user. Vui lòng xác thực OTP lại.');
        return { success: false, message: 'Token không chứa thông tin user. Vui lòng xác thực OTP lại.' };
      }

      // Gọi Edge Function để đặt lại mật khẩu
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/reset-password-with-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          new_password: newPassword,
          verification_token: verificationToken,
        }),
      });

      const result = await response.json();
      console.log('reset-password-with-token response:', { status: response.status, result });

      // Kiểm tra: nếu có error trong body hoặc status không phải 200-299
      if (!response.ok || result.error) {
        const errorMsg = result.error || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }

      return { success: true, message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' };
    } catch (err: any) {
      const message = err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
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
        verifyResetPasswordOTP,
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
