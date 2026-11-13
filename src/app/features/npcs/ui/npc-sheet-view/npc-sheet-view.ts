import { Component, input, output } from '@angular/core';

import { npcTypeLine, type NpcSheet } from '@app/features/npcs/domain/npc';
import {
  abilityScoreWithModifier,
  armorClassLabel,
  challengeLabel,
  hitPointsLabel,
} from '@app/shared/domain/creature-sheet-format';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { CREATURE_FEATURE_SECTIONS } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';
import { RichTextFeatureSection } from '@app/shared/ui/rich-text-feature-section/rich-text-feature-section';

@Component({
  selector: 'app-npc-sheet-view',
  imports: [RichTextEditor, RichTextFeatureSection],
  templateUrl: './npc-sheet-view.html',
  styleUrl: './npc-sheet-view.scss',
})
export class NpcSheetView {
  readonly sheet = input.required<NpcSheet>();
  /** Une organisation n’affiche que sa description, sans fiche technique. */
  readonly organization = input(false);
  readonly mentionCandidates = input<readonly ResourceMentionCandidate[]>([]);
  readonly mentionActivate = output<ResourceMentionCandidate>();

  protected readonly featureSections = CREATURE_FEATURE_SECTIONS;
  protected readonly npcTypeLine = npcTypeLine;
  protected readonly armorClassLabel = armorClassLabel;
  protected readonly hitPointsLabel = hitPointsLabel;
  protected readonly challengeLabel = challengeLabel;
  protected readonly abilityScoreWithModifier = abilityScoreWithModifier;
}
