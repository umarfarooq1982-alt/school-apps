import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigator } from './src/navigation';
import { screens } from './src/screens';
import { useI18n } from './src/i18n';
import { colors } from './src/theme';

function App() {
  const { isRTL } = useI18n();
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {/* Urdu flips the whole layout right-to-left without restarting the app. */}
      <View style={[styles.root, isRTL ? styles.rtl : styles.ltr]}>
        <Navigator screens={screens} initial="RoleSelect" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  rtl: { direction: 'rtl' },
  ltr: { direction: 'ltr' },
});

export default App;
