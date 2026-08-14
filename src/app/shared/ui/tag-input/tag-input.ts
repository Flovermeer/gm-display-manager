import { Component, input, output, signal } from '@angular/core';

import { TagPill } from '@app/shared/ui/tag-pill/tag-pill';

@Component({
  selector: 'app-tag-input',
  imports: [TagPill],
  templateUrl: './tag-input.html',
  styleUrl: './tag-input.scss',
})
export class TagInput {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input('Ajouter puis appuyer sur Entrée');
  readonly value = input<readonly string[]>([]);
  readonly valueChange = output<readonly string[]>();
  protected readonly draft = signal('');

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    this.commitDraft();
  }

  protected commitDraft(): void {
    const candidates = this.draft()
      .split(/[,;\n]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;

    const existing = new Set(this.value().map(normalizedTagKey));
    const additions = candidates.filter((tag) => {
      const key = normalizedTagKey(tag);
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    this.draft.set('');
    if (additions.length > 0) this.valueChange.emit([...this.value(), ...additions]);
  }

  protected removeTag(index: number): void {
    this.valueChange.emit(this.value().filter((_, candidateIndex) => candidateIndex !== index));
  }
}

function normalizedTagKey(value: string): string {
  return value.toLocaleLowerCase('fr');
}
