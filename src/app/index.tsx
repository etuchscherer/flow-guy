import * as Device from 'expo-device';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { FlowDemoModal } from '@/components/flows/FlowDemoModal';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={{ alignItems: 'center', gap: Spacing.three }}
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.heroSection}>
            <AnimatedIcon />
            <ThemedText type="title" style={styles.title}>
              StickerSmash
            </ThemedText>
            <ThemedText style={{ color: '#64748b', textAlign: 'center' }}>
              Featuring Headless Flow Orchestration
            </ThemedText>
          </ThemedView>

          <FlowDemoModal />

          <ThemedText type="code" style={styles.code}>
            expo development
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.stepContainer}>
            <HintRow
              title="Visualize Flows"
              hint={<ThemedText type="code">npm run flows:viz</ThemedText>}
            />
            <HintRow
              title="Add Journey"
              hint={<ThemedText type="code">src/journeys/*.ts</ThemedText>}
            />
            <HintRow title="Dev tools" hint={getDevMenuHint()} />
          </ThemedView>

          {Platform.OS === 'web' && <WebBadge />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
