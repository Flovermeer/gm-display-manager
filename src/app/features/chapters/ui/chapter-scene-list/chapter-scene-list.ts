import { Component, computed, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import type { Scene } from '@app/features/scenes/domain/scene';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';

export type ChapterSceneCandidate = Readonly<{
  scene: Scene;
  chapterTitle: string;
}>;

@Component({
  selector: 'app-chapter-scene-list',
  imports: [ReactiveFormsModule, ButtonDirective, FormField],
  templateUrl: './chapter-scene-list.html',
  styleUrl: './chapter-scene-list.scss',
})
export class ChapterSceneList {
  readonly scenes = input.required<readonly Scene[]>();
  readonly candidates = input.required<readonly ChapterSceneCandidate[]>();
  readonly isBusy = input(false);

  readonly createScene = output<void>();
  readonly openScene = output<Scene>();
  readonly attachScene = output<Scene>();
  readonly moveScene = output<{ scene: Scene; direction: -1 | 1 }>();

  protected readonly selectedSceneId = new FormControl('', { nonNullable: true });
  protected readonly candidateOptions = computed<readonly FormFieldOption[]>(() =>
    this.candidates().map(({ scene, chapterTitle }) => ({
      value: scene.id,
      label: `${scene.name} — ${chapterTitle}`,
    })),
  );

  protected requestAttach(): void {
    const candidate = this.candidates().find(
      ({ scene }) => scene.id === this.selectedSceneId.value,
    );
    if (!candidate) return;
    this.attachScene.emit(candidate.scene);
    this.selectedSceneId.reset('');
  }

  protected canMove(index: number, direction: -1 | 1): boolean {
    const target = index + direction;
    return target >= 0 && target < this.scenes().length;
  }
}
