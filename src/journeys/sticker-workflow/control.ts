import { defineFlow } from '@/flows';
import type { StickerContext } from './types';
import { ChooseStickerScreen } from './screens/ChooseStickerScreen';
import { ExportReviewScreen } from './screens/ExportReviewScreen';
import { SelectPhotoScreen } from './screens/SelectPhotoScreen';

import { filterEffectsSubflow } from './subflows/filter-effects';

export const initialStickerContext: StickerContext = {
  selectedImage: '📸 Beach',
  selectedSticker: '⭐',
  filter: 'Vibrant',
};

/**
 * Control Flow: Sticker Smash Full Experience
 */
export const stickerControlFlow = defineFlow<StickerContext>({
  id: 'sticker-control',
  name: 'Sticker Workflow (Full Experience)',
  initial: 'selectPhoto',
  initialContext: initialStickerContext,
  steps: {
    selectPhoto: {
      title: 'Select Photo',
      component: SelectPhotoScreen,
      next: 'chooseSticker',
    },
    chooseSticker: {
      title: 'Choose Sticker',
      component: ChooseStickerScreen,
      next: 'effects',
    },
    effects: {
      type: 'subflow',
      title: 'Filter Effects',
      subflow: filterEffectsSubflow,
      onComplete: () => 'exportReview',
    },
    exportReview: {
      title: 'Export & Share',
      component: ExportReviewScreen,
      next: null,
    },
  },
});
