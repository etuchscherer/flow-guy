import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { StickerContext } from '../types';

export function ChooseStickerScreen() {
  const { next, back, updateContext, context } = useFlow<StickerContext>();
  const stickers = ['⭐', '🚀', '🔥', '🎉', '🐱', '🕶️'];

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>STICKER SMASH WORKFLOW</Text>
      <Text style={styles.title}>2. Choose a Sticker</Text>
      <Text style={styles.subtitle}>
        Photo selected: <Text style={{ fontWeight: '700' }}>{context.selectedImage}</Text>
      </Text>

      <View style={styles.stickerRow}>
        {stickers.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.stickerButton,
              context.selectedSticker === s && styles.selectedSticker,
            ]}
            onPress={() => updateContext({ selectedSticker: s })}>
            <Text style={styles.stickerEmoji}>{s}</Text>
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
            if (!context.selectedSticker) {
              updateContext({ selectedSticker: stickers[0] });
            }
            next();
          }}>
          <Text style={styles.buttonText}>Next &rarr;</Text>
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
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  stickerButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  selectedSticker: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  stickerEmoji: {
    fontSize: 36,
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
