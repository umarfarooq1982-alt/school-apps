import React, { createContext, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { ScreenProps, useBackHandler } from '../navigation';
import { useI18n } from '../i18n';
import { IconType, InTabsContext } from './ui';

export type TabDef = {
  key: string;
  label: string;
  icon: IconType;
  component: React.ComponentType<ScreenProps>;
};

const TabsContext = createContext<{ go: (key: string) => void } | null>(null);

// Lets a screen inside the tabs switch to another tab, e.g. Home -> Fee.
export function useTabs() {
  return useContext(TabsContext);
}

export function TabShell({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const [visited, setVisited] = useState<string[]>([tabs[0].key]);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const go = (key: string) => {
    setActive(key);
    setVisited(v => (v.includes(key) ? v : [...v, key]));
  };

  // Back on any tab other than the first returns to the first tab.
  useBackHandler(() => {
    if (active !== tabs[0].key) {
      go(tabs[0].key);
      return true;
    }
    return false;
  });

  return (
    <TabsContext.Provider value={{ go }}>
      <View style={styles.root}>
        <InTabsContext.Provider value={true}>
          {tabs.map(tab =>
            visited.includes(tab.key) ? (
              <View
                key={tab.key}
                style={[styles.page, tab.key !== active && styles.hidden]}
              >
                <tab.component params={undefined} />
              </View>
            ) : null,
          )}
        </InTabsContext.Provider>
        <View style={[styles.bar, { paddingBottom: 8 + insets.bottom }]}>
          {tabs.map(tab => {
            const on = tab.key === active;
            const Icon = tab.icon;
            return (
              <Pressable
                key={tab.key}
                onPress={() => go(tab.key)}
                style={styles.item}
              >
                <View style={[styles.iconWrap, on && styles.iconWrapOn]}>
                  <Icon
                    size={20}
                    color={on ? colors.text : colors.textMuted}
                    strokeWidth={on ? 2.4 : 1.8}
                  />
                </View>
                <Text
                  style={[styles.label, on && styles.labelOn]}
                  numberOfLines={1}
                >
                  {t(tab.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </TabsContext.Provider>
  );
}

export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.grabber} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1 },
  hidden: { display: 'none' },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: {
    width: 50,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOn: { backgroundColor: colors.primary },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  labelOn: { color: colors.text, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,14,10,0.45)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
});
