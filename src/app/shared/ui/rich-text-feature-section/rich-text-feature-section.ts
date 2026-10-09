import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import type { RichTextFeature } from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';

@Component({
  selector: 'app-rich-text-feature-section',
  imports: [RichTextEditor],
  templateUrl: './rich-text-feature-section.html',
  styleUrl: './rich-text-feature-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextFeatureSection {
  readonly title = input.required<string>();
  readonly features = input.required<readonly RichTextFeature[]>();
  readonly mentionCandidates = input<readonly ResourceMentionCandidate[]>([]);
  readonly mentionActivate = output<ResourceMentionCandidate>();
}
