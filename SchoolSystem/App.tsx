import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigator, rootNav } from './src/navigation';
import { screens } from './src/screens';
import { useI18n } from './src/i18n';
import { colors } from './src/theme';
import { setSignOutHook, setShared } from './src/store';
import { restoreSession } from './src/api/session';
import { setUnauthorizedHandler } from './src/api/client';
import { appRoleFor, signOutEverywhere } from './src/api/auth';
import { HOME_ROUTE } from './src/screens/auth';
import { toast } from './src/components/ui';
import type { StaffRole } from './src/data/admin';
import { getAppRole, setAppRole, SIGN_IN_ROUTE } from './src/appRole';
import type { Role } from './src/store';

type Props = { appRole?: Role };

function App({ appRole }: Props) {
  // The Android flavor decides the role; in a single-role app "RoleSelect"
  // (where every sign-out returns) is that role's own sign-in screen.
  setAppRole(appRole);
  const fixed = getAppRole();
  const appScreens = fixed ? { ...screens, RoleSelect: screens[SIGN_IN_ROUTE[fixed]] } : screens;
  const { isRTL } = useI18n();
  const [initial, setInitial] = useState<string | null>(null);

  useEffect(() => {
    // Every "Sign out" in the app ends the server session and clears the token.
    setSignOutHook(() => {
      signOutEverywhere();
    });
    let shown = false;
    setUnauthorizedHandler(() => {
      signOutEverywhere();
      if (!shown) {
        shown = true;
        toast('Your session has ended. Please sign in again.');
        setTimeout(() => (shown = false), 4000);
      }
      rootNav.current?.reset('RoleSelect');
    });
    // Stay signed in across app restarts while the token is valid.
    restoreSession().then(s => {
      const role = s ? appRoleFor(s.user.role) : null;
      const only = getAppRole();
      if (s && role && only && role !== only) {
        // A login saved by another role's app never opens here.
        signOutEverywhere();
        setInitial('RoleSelect');
      } else if (s && role) {
        if (role === 'admin') {
          setShared<StaffRole>('admin.role', s.user.role as StaffRole);
        }
        setShared('session.role', role);
        setInitial(s.user.mustChangePw ? 'SetPassword' : HOME_ROUTE[role]);
      } else {
        setInitial('RoleSelect');
      }
    });
    return () => {
      setSignOutHook(null);
      setUnauthorizedHandler(null);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {/* Urdu flips the whole layout right-to-left without restarting the app. */}
      <View style={[styles.root, isRTL ? styles.rtl : styles.ltr]}>
        {initial ? (
          <Navigator screens={appScreens} initial={initial} />
        ) : (
          <View style={styles.splash}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  rtl: { direction: 'rtl' },
  ltr: { direction: 'ltr' },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default App;
