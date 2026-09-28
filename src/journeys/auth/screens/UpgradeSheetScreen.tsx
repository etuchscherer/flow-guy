import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFlow } from '@/flows';
import type { AuthContext } from '../types';

export function UpgradeSheetScreen() {
  const { next, back, updateContext, context } = useFlow<AuthContext>();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  // Animation values for smooth bottom-sheet slide-up and backdrop fade-in
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleUpgrade = () => {
    updateContext({
      tier: 'pro',
      upgradedAtRegistration: true,
      selectedPlan,
    });
    next();
  };

  const handleSkip = () => {
    updateContext({
      tier: 'free',
      upgradedAtRegistration: false,
    });
    next();
  };

  return (
    <View style={styles.container}>
      {/* Dimmed backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <View style={styles.backgroundPreview}>
          <Text style={styles.subflowBadge}>REGISTRATION SUBFLOW (Step 3/3)</Text>
          <Text style={styles.previewTitle}>Welcome, {context.firstName || 'Creator'}!</Text>
          <Text style={styles.previewSubtitle}>Your profile has been created.</Text>
        </View>
      </Animated.View>

      {/* Bottom Sheet Modal Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}>
        {/* Grab Handle */}
        <View style={styles.handleBar} />

        <View style={styles.sheetHeader}>
          <View style={styles.offerBadge}>
            <Text style={styles.offerBadgeText}>✨ EXCLUSIVE WELCOME OFFER</Text>
          </View>
          <Text style={styles.title}>Upgrade to StickerSmash Pro</Text>
          <Text style={styles.subtitle}>
            Unlock premium creation tools, unlimited sticker storage, and 4K exports.
          </Text>
        </View>

        {/* Feature List */}
        <View style={styles.perksList}>
          <View style={styles.perkItem}>
            <Text style={styles.perkIcon}>⭐</Text>
            <Text style={styles.perkText}>Unlimited sticker packs & AI generation</Text>
          </View>
          <View style={styles.perkItem}>
            <Text style={styles.perkIcon}>🎨</Text>
            <Text style={styles.perkText}>Exclusive canvas filters & color grading</Text>
          </View>
          <View style={styles.perkItem}>
            <Text style={styles.perkIcon}>⚡</Text>
            <Text style={styles.perkText}>Instant cloud backup & multi-device sync</Text>
          </View>
          <View style={styles.perkItem}>
            <Text style={styles.perkIcon}>💎</Text>
            <Text style={styles.perkText}>Ultra HD 4K watermark-free exports</Text>
          </View>
        </View>

        {/* Plan Selector */}
        <View style={styles.planSelector}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}>
            <View style={styles.planBadgeContainer}>
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>SAVE 40%</Text>
              </View>
            </View>
            <Text style={styles.planName}>Annual</Text>
            <Text style={styles.planPrice}>$29.99 / yr</Text>
            <Text style={styles.planSubprice}>($2.50 / mo)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}>
            <View style={styles.planBadgeContainer}>
              <View style={styles.flexibleBadge}>
                <Text style={styles.flexibleText}>FLEXIBLE</Text>
              </View>
            </View>
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>$4.99 / mo</Text>
            <Text style={styles.planSubprice}>Cancel anytime</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>
              🚀 Upgrade to Pro ({selectedPlan === 'annual' ? '$29.99/yr' : '$4.99/mo'})
            </Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.backButton} onPress={back}>
              <Text style={styles.backButtonText}>&larr; Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>No thanks, continue Free</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backgroundPreview: {
    alignItems: 'center',
    gap: 8,
  },
  subflowBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
    boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.12)',
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 6,
  },
  offerBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerBadgeText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  perksList: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkIcon: {
    fontSize: 15,
  },
  perkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  planSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 2,
  },
  planCardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  planBadgeContainer: {
    height: 18,
    justifyContent: 'center',
  },
  bestValueBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  flexibleBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flexibleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284c7',
  },
  planSubprice: {
    fontSize: 11,
    color: '#64748b',
  },
  actionContainer: {
    gap: 10,
    marginTop: 4,
  },
  upgradeButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(2, 132, 199, 0.28)',
    elevation: 3,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
