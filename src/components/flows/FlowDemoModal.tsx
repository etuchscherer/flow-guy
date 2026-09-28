import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ABFlowRenderer,
  getDefaultMockAdapter,
  resolveJourneyVariant,
  type EventRecord,
  type ExperimentUser,
  type ExposureRecord,
} from '@/flows';
import '@/journeys'; // Ensure all journeys are registered

// Configure default test users and experiment allocations in mock adapter
const mockAdapter = getDefaultMockAdapter();
mockAdapter.setExperimentConfig('exp_auth_v2', {
  defaultVariant: 'control',
  userOverrides: {
    user_treatment: 'upgrade_sheet',
    user_control: 'control',
  },
});
mockAdapter.setExperimentConfig('exp_sticker_editor', {
  defaultVariant: 'control',
  userOverrides: {
    user_treatment: 'quick_smash',
    user_control: 'control',
  },
});

interface Persona {
  id: string;
  name: string;
  badge: string;
  user: ExperimentUser;
}

const PERSONAS: Persona[] = [
  {
    id: 'control',
    name: 'Alice (Control Group)',
    badge: 'CONTROL',
    user: { userId: 'user_control', email: 'alice@example.com' },
  },
  {
    id: 'treatment',
    name: 'Bob (Treatment Group)',
    badge: 'TREATMENT',
    user: { userId: 'user_treatment', email: 'bob@example.com' },
  },
  {
    id: 'random',
    name: 'Charlie (Random/New)',
    badge: 'UNASSIGNED',
    user: { userId: 'user_charlie', email: 'charlie@example.com' },
  },
];

export function FlowDemoModal() {
  const [activeTab, setActiveTab] = useState<'ab' | 'direct'>('ab');
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [authOverride, setAuthOverride] = useState<'auto' | 'control' | 'upgrade_sheet'>('auto');
  const [stickerOverride, setStickerOverride] = useState<'auto' | 'control' | 'quick_smash'>('auto');

  // Active Runner State
  const [activeJourney, setActiveJourney] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<ExperimentUser | undefined>(undefined);
  const [forceVariant, setForceVariant] = useState<string | undefined>(undefined);

  // Live Telemetry Logs
  const [exposures, setExposures] = useState<ExposureRecord[]>(() => mockAdapter.getExposures());
  const [events, setEvents] = useState<EventRecord[]>(() => mockAdapter.getEvents());

  useEffect(() => {
    const unsubExp = mockAdapter.onExposure((exp) => {
      setExposures((prev) => [exp, ...prev].slice(0, 20));
    });
    const unsubEvt = mockAdapter.onEvent((evt) => {
      setEvents((prev) => [evt, ...prev].slice(0, 20));
    });
    return () => {
      unsubExp();
      unsubEvt();
    };
  }, []);

  // Update overrides on mock adapter when user toggles buttons
  const handleAuthOverrideChange = (val: 'auto' | 'control' | 'upgrade_sheet') => {
    setAuthOverride(val);
    if (val === 'auto') {
      mockAdapter.overrideVariant('exp_auth_v2', '');
      mockAdapter.clearOverrides();
    } else {
      mockAdapter.overrideVariant('exp_auth_v2', val);
    }
  };

  const handleStickerOverrideChange = (val: 'auto' | 'control' | 'quick_smash') => {
    setStickerOverride(val);
    if (val === 'auto') {
      mockAdapter.overrideVariant('exp_sticker_editor', '');
      mockAdapter.clearOverrides();
    } else {
      mockAdapter.overrideVariant('exp_sticker_editor', val);
    }
  };

  const openABJourney = (journeyId: string) => {
    setActiveJourney(journeyId);
    setActiveUser(selectedPersona.user);
    setForceVariant(undefined);
  };

  const openDirectVariant = (journeyId: string, variant: string) => {
    setActiveJourney(journeyId);
    setActiveUser({ userId: 'direct_tester' });
    setForceVariant(variant);
  };

  const closeJourney = () => {
    setActiveJourney(null);
    setActiveUser(undefined);
    setForceVariant(undefined);
  };

  // Preview what variant the selected persona gets
  const authPreview = resolveJourneyVariant('auth', selectedPersona.user);
  const stickerPreview = resolveJourneyVariant('sticker-workflow', selectedPersona.user);

  return (
    <View style={styles.launcherCard}>
      <Text style={styles.cardHeader}>⚡ FLOW ENGINE & A/B ADAPTER</Text>
      <Text style={styles.cardTitle}>Test State Machine Journeys</Text>
      <Text style={styles.cardSubtitle}>
        The Flow Engine is decoupled from experimentation. Journeys automatically map to experiments,
        evaluate variants, report exposure, and stream analytics events.
      </Text>

      {/* Tabs: A/B Testing vs Direct Variants */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ab' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ab')}>
          <Text style={[styles.tabButtonText, activeTab === 'ab' && styles.tabButtonTextActive]}>
            🔬 A/B Adapter Test Harness
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'direct' && styles.tabButtonActive]}
          onPress={() => setActiveTab('direct')}>
          <Text style={[styles.tabButtonText, activeTab === 'direct' && styles.tabButtonTextActive]}>
            ⚡ Direct Variants
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ab' ? (
        <View style={styles.abContainer}>
          {/* Persona Picker */}
          <Text style={styles.sectionHeading}>1. SELECT USER PERSONA (BUCKET):</Text>
          <View style={styles.personaRow}>
            {PERSONAS.map((p) => {
              const isSelected = selectedPersona.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.personaChip, isSelected && styles.personaChipActive]}
                  onPress={() => setSelectedPersona(p)}>
                  <Text style={[styles.personaName, isSelected && styles.personaNameActive]}>
                    {p.name.split(' ')[0]}
                  </Text>
                  <Text style={[styles.personaTag, isSelected && styles.personaTagActive]}>
                    {p.badge}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Overrides */}
          <Text style={styles.sectionHeading}>2. TEST OVERRIDES (OPTIONAL):</Text>
          <View style={styles.overrideRow}>
            <Text style={styles.overrideLabel}>Auth Exp:</Text>
            <View style={styles.btnGroup}>
              {(['auto', 'control', 'upgrade_sheet'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.miniBtn, authOverride === mode && styles.miniBtnActive]}
                  onPress={() => handleAuthOverrideChange(mode)}>
                  <Text
                    style={[styles.miniBtnText, authOverride === mode && styles.miniBtnTextActive]}>
                    {mode === 'auto' ? 'Auto' : mode === 'control' ? 'Control' : 'Upsell'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.overrideRow}>
            <Text style={styles.overrideLabel}>Sticker Exp:</Text>
            <View style={styles.btnGroup}>
              {(['auto', 'control', 'quick_smash'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.miniBtn, stickerOverride === mode && styles.miniBtnActive]}
                  onPress={() => handleStickerOverrideChange(mode)}>
                  <Text
                    style={[
                      styles.miniBtnText,
                      stickerOverride === mode && styles.miniBtnTextActive,
                    ]}>
                    {mode === 'auto' ? 'Auto' : mode === 'control' ? 'Control' : 'Quick'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Launch Buttons with Evaluated Variant Preview */}
          <Text style={styles.sectionHeading}>3. LAUNCH DYNAMIC EXPERIMENT:</Text>
          <View style={styles.buttonList}>
            <TouchableOpacity
              style={styles.abLaunchBtn}
              onPress={() => openABJourney('auth')}>
              <View style={styles.buttonTextGroup}>
                <View style={styles.titleRow}>
                  <Text style={styles.journeyButtonTitle}>👤 Classic Auth Journey</Text>
                  <View style={styles.variantBadge}>
                    <Text style={styles.variantBadgeText}>
                      Variant: {authPreview.resolvedVariant}
                    </Text>
                  </View>
                </View>
                <Text style={styles.journeyButtonDesc}>
                  Evaluated via exp_auth_v2 for {selectedPersona.user.userId}
                </Text>
              </View>
              <Text style={styles.arrow}>&rarr;</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.abLaunchBtn}
              onPress={() => openABJourney('sticker-workflow')}>
              <View style={styles.buttonTextGroup}>
                <View style={styles.titleRow}>
                  <Text style={styles.journeyButtonTitle}>🎨 Sticker Smash Journey</Text>
                  <View style={styles.variantBadge}>
                    <Text style={styles.variantBadgeText}>
                      Variant: {stickerPreview.resolvedVariant}
                    </Text>
                  </View>
                </View>
                <Text style={styles.journeyButtonDesc}>
                  Evaluated via exp_sticker_editor for {selectedPersona.user.userId}
                </Text>
              </View>
              <Text style={styles.arrow}>&rarr;</Text>
            </TouchableOpacity>
          </View>

          {/* Live Telemetry Feed */}
          <View style={styles.telemetryBox}>
            <View style={styles.telemetryHeader}>
              <Text style={styles.telemetryTitle}>📡 LIVE A/B TELEMETRY FEED</Text>
              <TouchableOpacity
                onPress={() => {
                  mockAdapter.clearRecords();
                  setExposures([]);
                  setEvents([]);
                }}>
                <Text style={styles.clearLogsText}>Clear Logs</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.logList} nestedScrollEnabled>
              {exposures.length === 0 && events.length === 0 ? (
                <Text style={styles.emptyLogText}>
                  No exposures or events yet. Launch a journey above to see real-time tracking!
                </Text>
              ) : (
                <>
                  {exposures.slice(0, 4).map((exp, idx) => (
                    <Text key={`exp-${idx}`} style={styles.exposureLogItem}>
                      <Text style={styles.expPrefix}>[EXPOSURE] </Text>
                      {exp.experimentName} &rarr; <Text style={styles.bold}>{exp.variant}</Text> (
                      {exp.user?.userId ?? 'anon'})
                    </Text>
                  ))}
                  {events.slice(0, 4).map((evt, idx) => (
                    <Text key={`evt-${idx}`} style={styles.eventLogItem}>
                      <Text style={styles.evtPrefix}>[EVENT] </Text>
                      {evt.eventName} ({evt.user?.userId ?? 'anon'})
                      {evt.metadata?.variant ? ` [${evt.metadata.variant}]` : ''}
                    </Text>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Direct manual variant launchers */
        <View style={styles.buttonList}>
          <TouchableOpacity
            style={styles.journeyButton}
            onPress={() => openDirectVariant('auth', 'control')}>
            <View style={styles.buttonTextGroup}>
              <Text style={styles.journeyButtonTitle}>👤 Classic Auth Flow (Control)</Text>
              <Text style={styles.journeyButtonDesc}>
                Password vs OTP &rarr; Subflows &rarr; 2s Guard check
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.journeyButton}
            onPress={() => openDirectVariant('auth', 'auth-with-upgrade-sheet')}>
            <View style={styles.buttonTextGroup}>
              <Text style={styles.journeyButtonTitle}>✨ Auth with Upgrade Sheet</Text>
              <Text style={styles.journeyButtonDesc}>
                Password / OTP &rarr; Registration with bottom sheet upsell
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.journeyButton}
            onPress={() => openDirectVariant('sticker-workflow', 'control')}>
            <View style={styles.buttonTextGroup}>
              <Text style={styles.journeyButtonTitle}>🎨 Sticker Smash Journey (Control)</Text>
              <Text style={styles.journeyButtonDesc}>
                Photo &rarr; Sticker &rarr; Effects Subflow &rarr; Export
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.journeyButton}
            onPress={() => openDirectVariant('sticker-workflow', 'quick-smash')}>
            <View style={styles.buttonTextGroup}>
              <Text style={styles.journeyButtonTitle}>⚡ Sticker Smash (Quick-Smash)</Text>
              <Text style={styles.journeyButtonDesc}>
                Photo &rarr; Sticker &rarr; Export (Bypasses Effects)
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full-screen Flow Runner Modal */}
      <Modal
        visible={activeJourney !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeJourney}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalBadge}>
                ACTIVE JOURNEY: {activeJourney?.toUpperCase()}
              </Text>
              <Text style={styles.modalVariant}>
                User: {activeUser?.userId ?? 'anonymous'}
                {forceVariant ? ` (Forced: ${forceVariant})` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={closeJourney}>
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {activeJourney && (
            <View style={styles.flowContent}>
              <ABFlowRenderer
                key={`${activeJourney}-${activeUser?.userId}-${forceVariant}`}
                journey={activeJourney}
                user={activeUser}
                forceVariant={forceVariant}
                onComplete={(ctx) => {
                  console.log(`[Journey Completed: ${activeJourney}]`, ctx);
                }}
                onCancel={() => {
                  console.log(`[Journey Cancelled: ${activeJourney}]`);
                  closeJourney();
                }}
                renderCompleted={({ context, reset }) => (
                  <View style={styles.completedCard}>
                    <Text style={styles.completedEmoji}>🎉</Text>
                    <Text style={styles.completedTitle}>Journey Completed!</Text>
                    <Text style={styles.completedDesc}>
                      The state machine reached its terminal state. Flow completion event was
                      reported to the A/B adapter.
                    </Text>
                    <View style={styles.contextBox}>
                      <Text style={styles.contextCode}>
                        {JSON.stringify(context, null, 2)}
                      </Text>
                    </View>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.actionBtnSecondary} onPress={reset}>
                        <Text style={styles.actionBtnTextSecondary}>Restart Flow</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtnPrimary} onPress={closeJourney}>
                        <Text style={styles.actionBtnTextPrimary}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  launcherCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    marginVertical: 12,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#0284c7',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginVertical: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  abContainer: {
    gap: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  personaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  personaChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  personaChipActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
  },
  personaName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  personaNameActive: {
    color: '#0284c7',
  },
  personaTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  personaTagActive: {
    color: '#0369a1',
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overrideLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  miniBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  miniBtnTextActive: {
    color: '#ffffff',
  },
  buttonList: {
    gap: 10,
    marginTop: 4,
  },
  abLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    padding: 14,
    borderRadius: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  variantBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  variantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  journeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    borderRadius: 12,
  },
  buttonTextGroup: {
    flex: 1,
    gap: 4,
  },
  journeyButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  journeyButtonDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  arrow: {
    fontSize: 18,
    color: '#94a3b8',
    marginLeft: 8,
  },
  telemetryBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  clearLogsText: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
  logList: {
    maxHeight: 120,
  },
  emptyLogText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  exposureLogItem: {
    fontSize: 11,
    color: '#cbd5e1',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  expPrefix: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  eventLogItem: {
    fontSize: 11,
    color: '#cbd5e1',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  evtPrefix: {
    color: '#34d399',
    fontWeight: '700',
  },
  bold: {
    fontWeight: '700',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  modalVariant: {
    fontSize: 12,
    color: '#64748b',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  flowContent: {
    flex: 1,
  },
  completedCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  completedEmoji: {
    fontSize: 48,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  completedDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 340,
  },
  contextBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    maxHeight: 180,
  },
  contextCode: {
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnTextPrimary: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnTextSecondary: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '600',
  },
});
