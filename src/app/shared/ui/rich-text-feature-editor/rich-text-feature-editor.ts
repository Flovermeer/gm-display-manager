import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { FormField } from '@app/shared/ui/form-field/form-field';

export type RichTextFeature = Readonly<{
  id: string;
  name: string;
  description: RichTextDocument;
}>;

@Component({
  selector: 'app-rich-text-feature-editor',
  imports: [ButtonDirective, FormField, RichTextEditor],
  templateUrl: './rich-text-feature-editor.html',
  styleUrl: './rich-text-feature-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextFeatureEditor {
  readonly inputIdPrefix = input.required<string>();
  readonly title = input.required<string>();
  readonly singularLabel = input.required<string>();
  readonly features = input<readonly RichTextFeature[]>([]);
  readonly mentionCandidates = input<readonly ResourceMentionCandidate[]>([]);
  readonly featuresChange = output<readonly RichTextFeature[]>();
  readonly mentionActivate = output<ResourceMentionCandidate>();

  protected add(): void {
    this.featuresChange.emit([
      ...this.features(),
      {
        id: crypto.randomUUID(),
        name: '',
        description: createEmptyRichTextDocument(),
      },
    ]);
  }

  protected remove(featureId: string): void {
    this.featuresChange.emit(this.features().filter(({ id }) => id !== featureId));
  }

  protected updateName(featureId: string, value: string | number | null): void {
    this.update(featureId, (feature) => ({ ...feature, name: String(value ?? '') }));
  }

  protected updateDescription(featureId: string, description: RichTextDocument): void {
    this.update(featureId, (feature) => ({ ...feature, description }));
  }

  private update(
    featureId: string,
    transform: (feature: RichTextFeature) => RichTextFeature,
  ): void {
    this.featuresChange.emit(
      this.features().map((feature) => (feature.id === featureId ? transform(feature) : feature)),
    );
  }
}
