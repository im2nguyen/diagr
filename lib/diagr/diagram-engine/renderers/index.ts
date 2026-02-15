import { registerNodeRenderer } from '@/lib/diagr/diagram-engine/registry';
import { CardsRenderer } from '@/lib/diagr/diagram-engine/renderers/cards';
import { CodeRenderer } from '@/lib/diagr/diagram-engine/renderers/code';
import { DefaultRenderer } from '@/lib/diagr/diagram-engine/renderers/default';
import { GroupCardRenderer } from '@/lib/diagr/diagram-engine/renderers/groupCard';
import { ImageRenderer } from '@/lib/diagr/diagram-engine/renderers/image';
import { MarkdownRenderer } from '@/lib/diagr/diagram-engine/renderers/markdown';
import { MissingRenderer } from '@/lib/diagr/diagram-engine/renderers/missing';

let initialized = false;

export function ensureBuiltinsRegistered(): void {
  if (initialized) {
    return;
  }

  registerNodeRenderer('default', DefaultRenderer);
  registerNodeRenderer('groupCard', GroupCardRenderer);
  registerNodeRenderer('cards', CardsRenderer);
  registerNodeRenderer('code', CodeRenderer);
  registerNodeRenderer('image', ImageRenderer);
  registerNodeRenderer('markdown', MarkdownRenderer);

  initialized = true;
}

export { MissingRenderer };
