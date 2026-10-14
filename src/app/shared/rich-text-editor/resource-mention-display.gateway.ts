import type { Signal } from '@angular/core';

import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';

export abstract class ResourceMentionDisplayGateway {
  abstract readonly isPlayerDisplayOpen: Signal<boolean>;
  abstract readonly isPublishing: Signal<boolean>;

  abstract refreshPlayerDisplayStatus(): Promise<void>;
  abstract isDisplayed(candidate: ResourceMentionCandidate): boolean;
  abstract display(candidate: ResourceMentionCandidate): Promise<void>;
}
