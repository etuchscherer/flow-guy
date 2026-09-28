import { defineJourney } from '@/flows';
import type { StickerContext } from './types';
import { stickerControlFlow } from './control';
import { quickSmashFlow } from './variants/quick-smash';

/**
 * Main Journey: Sticker Smash Editor Workflow
 */
export const stickerWorkflowJourney = defineJourney<StickerContext>({
  id: 'sticker-workflow',
  name: 'Sticker Creation Journey',
  description:
    'Full interactive flow for picking a photo, applying a sticker, tuning effects via subflow, and exporting.',
  defaultVariant: 'control',
  variants: {
    control: stickerControlFlow,
    'quick-smash': quickSmashFlow,
  },
});

export default stickerControlFlow;
export { stickerControlFlow, quickSmashFlow };
