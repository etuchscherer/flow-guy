import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { StickerContext } from '../types';

export function FilterEffectsScreen() {
  const { next, back, updateContext, context, subflowDepth } = useFlow<StickerContext>();
  const filters = ['Normal', 'Vibrant', 'Retro', 'Black & White'];

  return (
    <View style={styles.container}>
      {subflowDepth > 0 && (
        <View style={styles.subflowHeader}>
          <Text style={styles.subflowBadge}>EFFECTS SUBFLOW (Depth {subflowDepth})</Text>
        </View>
      )}
      <Text style={styles.title}>Visual Filter Tuning</Text>
      <Text style={styles.subtitle}>
        Tune your canvas before the final composition.
      </Text>

      <View style={styles.photoGrid}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterCard,
              context.filter === f && styles.selectedCard,
            ]}
            onPress={() => updateContext({ filter: f })}>
            <Text style={styles.filterText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={back}>
          <Text style={styles.secondaryButtonText}>&larr; Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            if (!context.filter) updateContext({ filter: 'Vibrant' });
            next(); // Returns to parent flow
          }}>
          <Text style={styles.buttonText}>Apply & Exit Subflow &rarr;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  subflowHeader: {
    alignSelf: 'flex-start',
  },
  subflowBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  filterText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1e293b',
  },
  selectedCard: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
});
