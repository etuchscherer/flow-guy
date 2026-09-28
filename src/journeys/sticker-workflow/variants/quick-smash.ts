import { defineFlow } from '@/flows';
import type { StickerContext } from '../types';
import { ChooseStickerScreen } from '../screens/ChooseStickerScreen';

import { stickerControlFlow } from '../control';

/**
 * Variant: Quick Smash
 * Overrides control by skipping the filter effects subflow directly to export review.
 */
export const quickSmashFlow = defineFlow<StickerContext>({
  ...stickerControlFlow,
  id: 'sticker-quick',
  name: 'Quick Smash (No Effects Subflow)',
  initialContext: {
    selectedImage: '🏔️ Mountains',
    selectedSticker: '🚀',
    filter: 'Normal',
  },
  steps: {
    ...stickerControlFlow.steps,
    chooseSticker: {
      title: 'Choose Sticker',
      component: ChooseStickerScreen,
      next: 'exportReview',
    },
  },
});
