import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlow } from '@/flows';
import type { StickerContext } from '../types';

export function SelectPhotoScreen() {
  const { next, updateContext, context } = useFlow<StickerContext>();
  const photos = ['📸 Beach', '🏔️ Mountains', '🌆 City', '🌲 Forest'];

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>STICKER SMASH WORKFLOW</Text>
      <Text style={styles.title}>1. Select Photo</Text>
      <Text style={styles.subtitle}>Choose a base photo for your sticker canvas.</Text>

      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo}
            style={[
              styles.photoCard,
              context.selectedImage === photo && styles.selectedCard,
            ]}
            onPress={() => updateContext({ selectedImage: photo })}>
            <Text style={styles.photoEmoji}>{photo.split(' ')[0]}</Text>
            <Text style={styles.photoTitle}>{photo.split(' ')[1]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          if (!context.selectedImage) {
            updateContext({ selectedImage: photos[0] });
          }
          next();
        }}>
        <Text style={styles.buttonText}>Next: Add Sticker &rarr;</Text>
      </TouchableOpacity>
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  selectedCard: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  photoEmoji: {
    fontSize: 32,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  primaryButton: {
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
});
