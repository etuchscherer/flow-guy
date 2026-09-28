import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { StickerContext } from '../types';

export function ExportReviewScreen() {
  const { next, back, context } = useFlow<StickerContext>();

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>FINAL STEP: EXPORT REVIEW</Text>
      <Text style={styles.title}>Ready to Smash!</Text>
      <Text style={styles.subtitle}>Review your creation summary.</Text>

      <View style={styles.canvasPreview}>
        <Text style={styles.previewBase}>{context.selectedImage || '📸 Photo'}</Text>
        <Text style={styles.previewSticker}>{context.selectedSticker || '⭐'}</Text>
        <Text style={styles.previewFilter}>Filter: {context.filter || 'Normal'}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={back}>
          <Text style={styles.secondaryButtonText}>&larr; Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => next()}>
          <Text style={styles.buttonText}>Save & Finish &rarr;</Text>
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
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
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
  canvasPreview: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  previewBase: {
    color: '#94a3b8',
    fontSize: 16,
  },
  previewSticker: {
    fontSize: 54,
  },
  previewFilter: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
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
