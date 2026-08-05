import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase, Database } from '../data/datasources/supabase/supabase';
import { useAuth } from './AuthContext';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationSettingsRow = Database['public']['Tables']['user_notification_settings']['Row'];

type NotificationSettingsUpdate = {
  pushEnabled?: boolean;
  dailyReminderEnabled?: boolean;
  reminderFrequency?: 'everyday' | 'fixed_date';
  reminderTime?: string | null;
  reminderDate?: string | null;
};

type NotificationContextValue = {
  notifications: NotificationRow[];
  unreadCount: number;
  settings: NotificationSettingsRow | null;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteSelected: (notificationIds: string[]) => Promise<void>;
  deleteAll: () => Promise<void>;
  updateSettings: (settings: NotificationSettingsUpdate) => Promise<{ success: boolean; message: string }>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const defaultReminderTime = '21:00';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  } as any),
});

const getTodayBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return { startIso: start.toISOString() };
};

const getReminderDateTime = (time?: string | null, date?: string | null) => {
  const [hours, minutes] = (time || defaultReminderTime).split(':').map((part) => Number(part));
  const base = date ? new Date(date) : new Date();
  base.setHours(Number.isFinite(hours) ? hours : 21, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return base;
};

const getDeviceType = () => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [settings, setSettings] = useState<NotificationSettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read && !notification.read_at).length,
    [notifications]
  );

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setSettings(null);
      return;
    }

    setIsLoading(true);
    try {
      const [notificationResult, settingsResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .lte('created_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (notificationResult.error) throw notificationResult.error;
      if (settingsResult.error) throw settingsResult.error;

      setNotifications(notificationResult.data ?? []);
      setSettings(settingsResult.data ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const ensureSettings = useCallback(async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        push_enabled: settings?.push_enabled ?? true,
        daily_reminder_enabled: settings?.daily_reminder_enabled ?? false,
        reminder_frequency: settings?.reminder_frequency ?? 'everyday',
        reminder_time: settings?.reminder_time ?? defaultReminderTime,
        reminder_date: settings?.reminder_date ?? null,
        expo_push_token: settings?.expo_push_token ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    setSettings(data);
    return data;
  }, [settings, user?.id]);

  const registerPushToken = useCallback(async () => {
    if (!user?.id || Platform.OS === 'web') return;

    const currentSettings = settings ?? await ensureSettings();
    if (!currentSettings?.push_enabled) return;

    const permission = await Notifications.getPermissionsAsync();
    const finalPermission = permission.granted ? permission : await Notifications.requestPermissionsAsync();
    if (!finalPermission.granted) return;

    const tokenResult = await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data;

    await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        push_enabled: true,
        daily_reminder_enabled: currentSettings.daily_reminder_enabled,
        reminder_frequency: currentSettings.reminder_frequency,
        reminder_time: currentSettings.reminder_time,
        reminder_date: currentSettings.reminder_date,
        expo_push_token: token,
        updated_at: new Date().toISOString(),
      });

    await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token,
        device_type: getDeviceType(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });
  }, [ensureSettings, settings, user?.id]);

  const saveSystemNotification = useCallback(async (
    type: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {}
  ) => {
    if (!user?.id) return;

    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      type,
      title,
      body,
      data,
      campaign_id: null,
      is_read: false,
      deleted_at: null,
      read_at: null,
    });

    if (error) throw error;
    await refreshNotifications();
  }, [refreshNotifications, user?.id]);

  const syncLocalReminderSchedule = useCallback(async (nextSettings: NotificationSettingsRow | null) => {
    if (Platform.OS === 'web') return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!nextSettings?.push_enabled || !nextSettings.daily_reminder_enabled) return;

    const reminderDate = getReminderDateTime(nextSettings.reminder_time, nextSettings.reminder_date);
    if (nextSettings.reminder_frequency === 'fixed_date' && reminderDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nhắc nhở nhập liệu hàng ngày',
        body: 'Đừng quên ghi lại giao dịch hôm nay để SmartSpend AI theo dõi ngân sách chính xác hơn.',
      },
      trigger: nextSettings.reminder_frequency === 'everyday'
        ? ({
            hour: reminderDate.getHours(),
            minute: reminderDate.getMinutes(),
            repeats: true,
          } as any)
        : reminderDate,
    });
  }, []);

  const evaluateReminderDue = useCallback(async () => {
    if (!user?.id || !settings?.daily_reminder_enabled) return;

    const reminderDate = getReminderDateTime(settings.reminder_time, settings.reminder_date);
    const now = new Date();
    const { startIso } = getTodayBounds();

    if (reminderDate > now) return;

    const { data: existingReminder } = await supabase
      .from('notifications')
      .select('notification_id')
      .eq('user_id', user.id)
      .eq('type', 'daily_reminder')
      .gte('created_at', settings.reminder_frequency === 'everyday' ? startIso : reminderDate.toISOString())
      .limit(1);

    if (!existingReminder || existingReminder.length === 0) {
      await saveSystemNotification(
        'daily_reminder',
        'Nhắc nhở nhập liệu hàng ngày',
        'Đừng quên ghi lại giao dịch hôm nay để SmartSpend AI theo dõi ngân sách chính xác hơn.',
        { reminder_frequency: settings.reminder_frequency }
      );
    }

    if (settings.reminder_frequency === 'fixed_date') {
      const { data } = await supabase
        .from('user_notification_settings')
        .update({
          daily_reminder_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) setSettings(data);
    }
  }, [saveSystemNotification, settings, user?.id]);

  const evaluateBudgetWarnings = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase.rpc('evaluate_user_budget_notifications');
    if (error) {
      console.warn('Không thể kiểm tra cảnh báo ngân sách:', error.message);
      return;
    }

    await refreshNotifications();
  }, [refreshNotifications, user?.id]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      evaluateBudgetWarnings().catch((error) => {
        console.warn('Không thể tự động làm mới thông báo:', error);
      });
    }, 60000);

    return () => clearInterval(intervalId);
  }, [evaluateBudgetWarnings]);

  useEffect(() => {
    registerPushToken().catch((error) => {
      console.warn('Không thể đăng ký Expo push token:', error);
    });
  }, [registerPushToken]);

  useEffect(() => {
    syncLocalReminderSchedule(settings).catch((error) => {
      console.warn('Không thể đồng bộ lịch nhắc nhở:', error);
    });
    evaluateReminderDue().catch((error) => {
      console.warn('Không thể kiểm tra nhắc nhở nhập liệu:', error);
    });
  }, [evaluateReminderDue, settings, syncLocalReminderSchedule]);

  useEffect(() => {
    evaluateBudgetWarnings().catch((error) => {
      console.warn('Không thể kiểm tra cảnh báo ngân sách:', error);
    });
  }, [evaluateBudgetWarnings]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`user-notifications-${user.id}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      () => refreshNotifications()
    );
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_notification_settings', filter: `user_id=eq.${user.id}` },
      () => refreshNotifications()
    );
    ['transactions', 'budgets', 'budget_category_allocations'].forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          evaluateBudgetWarnings().catch((error) => {
            console.warn('Không thể kiểm tra cảnh báo ngân sách:', error);
          });
        }
      );
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [evaluateBudgetWarnings, refreshNotifications, user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('notification_id', notificationId);

    if (error) throw error;
    await refreshNotifications();
  }, [refreshNotifications]);

  const deleteSelected = useCallback(async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .in('notification_id', notificationIds);

    if (error) throw error;
    await refreshNotifications();
  }, [refreshNotifications]);

  const deleteAll = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) throw error;
    await refreshNotifications();
  }, [refreshNotifications, user?.id]);

  const updateSettings = useCallback(async (settingsUpdate: NotificationSettingsUpdate) => {
    if (!user?.id) return { success: false, message: 'Người dùng chưa đăng nhập.' };

    try {
      const currentSettings = settings ?? await ensureSettings();
      const nextSettings = {
        user_id: user.id,
        push_enabled: settingsUpdate.pushEnabled ?? currentSettings?.push_enabled ?? true,
        daily_reminder_enabled: settingsUpdate.dailyReminderEnabled ?? currentSettings?.daily_reminder_enabled ?? false,
        reminder_frequency: settingsUpdate.reminderFrequency ?? currentSettings?.reminder_frequency ?? 'everyday',
        reminder_time: settingsUpdate.reminderTime ?? currentSettings?.reminder_time ?? defaultReminderTime,
        reminder_date: settingsUpdate.reminderDate ?? currentSettings?.reminder_date ?? null,
        expo_push_token: currentSettings?.expo_push_token ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_notification_settings')
        .upsert(nextSettings)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      await syncLocalReminderSchedule(data);
      if (data.push_enabled) {
        await registerPushToken();
      }

      return { success: true, message: 'Đã cập nhật cài đặt thông báo.' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Không thể cập nhật cài đặt thông báo.' };
    }
  }, [ensureSettings, registerPushToken, settings, syncLocalReminderSchedule, user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        settings,
        isLoading,
        refreshNotifications,
        markAsRead,
        deleteSelected,
        deleteAll,
        updateSettings,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
