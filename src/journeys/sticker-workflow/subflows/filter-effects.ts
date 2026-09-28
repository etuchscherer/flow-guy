import { defineFlow } from '@/flows';
import type { StickerContext } from '../types';
import { FilterEffectsScreen } from '../screens/FilterEffectsScreen';


/**
 * Subflow: Photo Filter and Tuning
 * Tune lighting and tint before sticker placement.
 */
export const filterEffectsSubflow = defineFlow<StickerContext>({
  id: 'filter-effects-subflow',
  name: 'Canvas Filter Effects Subflow',
  description: 'Tune lighting and tint before sticker placement.',
  initial: 'tuneFilter',
  steps: {
    tuneFilter: {
      title: 'Apply Filter',
      component: FilterEffectsScreen,
      next: null, // Completing exits subflow
    },
  },
});
