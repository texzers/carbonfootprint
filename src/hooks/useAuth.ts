import { useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { useAppStore } from '../store';
import { getUserProfile, saveUserProfile } from '../services/firestore';
import type { UserProfile } from '../types';

export function useAuth() {
  const {
    user,
    isAuthLoading,
    accessToken,
    setUser,
    setAccessToken,
    setAuthLoading,
    setProfile,
    setIsOnboarding,
    setOnboardingStep,
  } = useAppStore();

  const isPlaceholderKey =
    !import.meta.env.VITE_FIREBASE_API_KEY ||
    import.meta.env.VITE_FIREBASE_API_KEY.includes('XXXXXX') ||
    import.meta.env.VITE_FIREBASE_API_KEY === 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';

  useEffect(() => {
    if (isPlaceholderKey) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we are in demo mode, ignore this listener unless there is an actual firebaseUser
      const currentStoreState = useAppStore.getState();
      if (!firebaseUser && currentStoreState.user?.uid === 'demo-user') {
        setAuthLoading(false);
        return;
      }

      setUser(firebaseUser);
      setAuthLoading(false);

      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setProfile(profile);
            setIsOnboarding(!profile.onboardingComplete);
            setOnboardingStep(profile.onboardingStep ?? 1);
          } else {
            // New user — start onboarding
            await saveUserProfile(firebaseUser.uid, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? '',
              email: firebaseUser.email ?? '',
              photoURL: firebaseUser.photoURL ?? '',
              onboardingComplete: false,
              onboardingStep: 1,
            });
            setIsOnboarding(true);
          }
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (isPlaceholderKey) {
      setAuthLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate Google popup roundtrip
      signInAsDemo();
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Extract Google OAuth access token for Calendar/Sheets
      const credential = result as any;
      const token = credential?._tokenResponse?.oauthAccessToken;
      if (token) setAccessToken(token);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        throw err;
      }
    }
  };

  const signInAsDemo = () => {
    setAuthLoading(true);
    const mockUser: any = {
      uid: 'demo-user',
      displayName: 'Demo User',
      email: 'demo@ecotrack.ai',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    };
    const mockProfile: UserProfile = {
      uid: 'demo-user',
      displayName: 'Demo User',
      email: 'demo@ecotrack.ai',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
      country: 'United Kingdom',
      city: 'London',
      dietType: 'medium_meat',
      primaryTransport: 'petrol_car',
      householdSize: 2,
      homeSize: 85,
      hasGreenTariff: false,
      gridRegion: 'uk',
      createdAt: new Date(),
      onboardingComplete: true,
      onboardingStep: 4,
    };
    setUser(mockUser);
    setProfile(mockProfile);
    setIsOnboarding(false);
    setAuthLoading(false);
  };

  const signOut = async () => {
    if (user?.uid === 'demo-user') {
      setUser(null);
      setProfile(null);
      setAccessToken(null);
      return;
    }
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setAccessToken(null);
  };

  return { user, accessToken, isAuthLoading, signInWithGoogle, signInAsDemo, signOut };
}
