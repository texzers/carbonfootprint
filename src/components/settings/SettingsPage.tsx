import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { saveUserProfile, saveUserSettings, deleteAllUserData } from '../../services/firestore';
import { auth } from '../../services/firebase';
import { deleteUser } from 'firebase/auth';
import { Card, Button, SectionHeader, FormField, Input, Select, Toggle, Badge } from '../shared';
import { COUNTRY_LIST } from '../../constants/emissionFactors';
import type { DietType, TransportMode, ThemeType, UnitSystem } from '../../types';

export function SettingsPage() {
  const { user, profile, settings, setProfile, setSettings, setTheme, addNotification } = useAppStore();
  const [saving, setSaving] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [householdSize, setHouseholdSize] = useState(profile?.householdSize ?? 2);
  const [dietType, setDietType] = useState<DietType>(profile?.dietType ?? 'medium_meat');

  // Settings state
  const [units, setUnits] = useState<UnitSystem>(settings?.units ?? 'metric');
  const [theme, setThemeLocal] = useState<ThemeType>(settings?.theme ?? 'system');
  const [weeklyDigest, setWeeklyDigest] = useState(settings?.notifications?.weeklyDigest ?? true);
  const [dailyTip, setDailyTip] = useState(settings?.notifications?.dailyTip ?? true);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving('profile');
    try {
      const updates = { displayName, country, city, householdSize, dietType };
      await saveUserProfile(user.uid, updates);
      setProfile({ ...profile!, ...updates });
      addNotification({ type: 'success', message: 'Profile saved!' });
    } catch {
      addNotification({ type: 'error', message: 'Failed to save profile.' });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving('settings');
    try {
      const updates = {
        units,
        theme,
        notifications: { weeklyDigest, dailyTip, goalReminders: true, email: profile?.email ?? '' },
      };
      await saveUserSettings(user.uid, updates as any);
      setSettings({ ...settings!, ...updates });
      setTheme(theme);
      addNotification({ type: 'success', message: 'Settings saved!' });
    } catch {
      addNotification({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setSaving('delete');
    try {
      await deleteAllUserData(user.uid);
      await deleteUser(auth.currentUser!);
      addNotification({ type: 'info', message: 'Account and all data deleted. Goodbye! 👋' });
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        addNotification({ type: 'error', message: 'Please sign out and sign back in, then try again.' });
      } else {
        addNotification({ type: 'error', message: 'Failed to delete account. Please try again.' });
      }
    } finally {
      setSaving(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-eco-ink">Settings ⚙️</h1>
        <p className="text-eco-slate text-sm mt-1">Manage your profile, preferences, and connected services.</p>
      </div>

      {/* Profile */}
      <Card className="p-6">
        <SectionHeader title="Profile" subtitle="Your personal information" />
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-2xl border-2 border-eco-mist" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-eco-leaf flex items-center justify-center text-white text-2xl font-bold">
                {(displayName || 'U')[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-eco-ink">{user?.email}</p>
              <p className="text-eco-slate text-xs">Google Account</p>
            </div>
          </div>

          <FormField label="Display name" htmlFor="settings-name">
            <Input id="settings-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Country" htmlFor="settings-country">
              <select id="settings-country" value={country} onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eco-leaf">
                <option value="">Select…</option>
                {COUNTRY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="City" htmlFor="settings-city">
              <Input id="settings-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Household size" htmlFor="settings-household">
            <input id="settings-household" type="number" min={1} max={20} value={householdSize}
              onChange={(e) => setHouseholdSize(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eco-leaf" />
          </FormField>

          <FormField label="Diet type" htmlFor="settings-diet">
            <Select id="settings-diet" value={dietType} onChange={(e) => setDietType(e.target.value as DietType)}
              options={[
                { value: 'vegan', label: '🌱 Vegan' },
                { value: 'vegetarian', label: '🥗 Vegetarian' },
                { value: 'flexitarian', label: '🥙 Flexitarian' },
                { value: 'low_meat', label: '🍗 Low meat' },
                { value: 'medium_meat', label: '🥩 Meat-eater' },
                { value: 'high_meat', label: '🍖 High meat' },
              ]} />
          </FormField>
        </div>
        <Button onClick={handleSaveProfile} loading={saving === 'profile'} className="mt-4">Save profile</Button>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <SectionHeader title="Preferences" subtitle="Units, theme, and notifications" />
        <div className="space-y-5">
          <FormField label="Units" htmlFor="settings-units">
            <Select id="settings-units" value={units} onChange={(e) => setUnits(e.target.value as UnitSystem)}
              options={[{ value: 'metric', label: 'Metric (kg, km)' }, { value: 'imperial', label: 'Imperial (lbs, miles)' }]} />
          </FormField>

          <FormField label="Theme" htmlFor="settings-theme">
            <Select id="settings-theme" value={theme} onChange={(e) => setThemeLocal(e.target.value as ThemeType)}
              options={[{ value: 'system', label: '💻 System default' }, { value: 'light', label: '☀️ Light' }, { value: 'dark', label: '🌙 Dark' }]} />
          </FormField>

          <div className="space-y-3">
            <p className="text-sm font-medium text-eco-ink">Notifications</p>
            <Toggle id="notif-weekly" label="Weekly digest email" description="Receive a summary of your weekly footprint" checked={weeklyDigest} onChange={setWeeklyDigest} />
            <Toggle id="notif-daily" label="Daily eco tip" description="Get a personalised tip each morning" checked={dailyTip} onChange={setDailyTip} />
          </div>
        </div>
        <Button onClick={handleSaveSettings} loading={saving === 'settings'} className="mt-4">Save preferences</Button>
      </Card>

      {/* Connected services */}
      <Card className="p-6">
        <SectionHeader title="Connected services" subtitle="Google integrations" />
        <div className="space-y-3">
          {[
            { name: 'Google Calendar', icon: '📅', desc: 'Goal reminders & weekly check-ins', connected: !!settings?.connectedServices?.googleCalendar },
            { name: 'Google Sheets', icon: '📊', desc: 'Carbon report exports', connected: !!settings?.connectedServices?.googleSheets },
          ].map((service) => (
            <div key={service.name} className="flex items-center gap-3 p-3 rounded-xl bg-eco-mist/50">
              <span className="text-2xl" aria-hidden="true">{service.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-eco-ink">{service.name}</p>
                <p className="text-xs text-eco-slate">{service.desc}</p>
              </div>
              <Badge variant={service.connected ? 'green' : 'gray'}>
                {service.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          ))}
          <p className="text-xs text-eco-slate mt-2">
            These services use your Google OAuth token from sign-in. Re-sign-in to reconnect.
          </p>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="p-6 border-2 border-red-100">
        <SectionHeader title="Danger zone" subtitle="Irreversible actions" />
        <div className="space-y-4">
          <p className="text-sm text-eco-slate">
            Deleting your account will permanently erase all your carbon logs, goals, and profile data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete my account
            </Button>
          ) : (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm font-semibold text-red-700 mb-3">Are you absolutely sure?</p>
              <p className="text-xs text-red-600 mb-4">All your data will be permanently deleted in accordance with GDPR Article 17 (Right to erasure).</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" loading={saving === 'delete'} onClick={handleDeleteAccount}>
                  Yes, delete everything
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
