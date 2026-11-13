import { TestBed } from '@angular/core/testing';

import { EMPTY_CHARACTER_RULE_CATALOG } from '@app/features/game-systems/domain/character-rule-catalog';
import { EMPTY_CREATURE_RULE_CATALOG } from '@app/features/game-systems/domain/creature-rule-catalog';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import { createNpcForm } from '@app/features/npcs/pages/npc-workspace/npc-form';
import { NpcSheetForm } from '@app/features/npcs/ui/npc-sheet-form/npc-sheet-form';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { emptyCreatureFeatureDrafts } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';

function option(
  id: string,
  category: GameRuleOption['category'],
  label: string,
  parentOptionId: string | null = null,
): GameRuleOption {
  return {
    id,
    gameSystemId: 'dnd5e',
    universeId: 'forgotten-realms',
    category,
    parentOptionId,
    code: id,
    label,
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
  };
}

describe('NpcSheetForm', () => {
  async function render() {
    await TestBed.configureTestingModule({ imports: [NpcSheetForm] }).compileComponents();
    const fixture = TestBed.createComponent(NpcSheetForm);
    const form = createNpcForm();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('catalogs', {
      creature: EMPTY_CREATURE_RULE_CATALOG,
      character: {
        ...EMPTY_CHARACTER_RULE_CATALOG,
        races: [option('elf', 'race', 'Elfe'), option('dwarf', 'race', 'Nain')],
        subraces: [option('high-elf', 'subrace', 'Haut-elfe', 'elf')],
      },
    });
    fixture.componentRef.setInput('featureDrafts', emptyCreatureFeatureDrafts());
    fixture.componentRef.setInput('officialDescription', createEmptyRichTextDocument());
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, form, element: fixture.nativeElement as HTMLElement };
  }

  it('clears a subspecies that does not belong to the newly chosen species', async () => {
    const { fixture, form, element } = await render();
    form.controls.race.setValue('elf');
    form.controls.subrace.setValue('high-elf');
    fixture.detectChanges();

    const race = element.querySelector<HTMLSelectElement>('#npc-race')!;
    race.value = 'dwarf';
    race.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(form.controls.race.value).toBe('dwarf');
    expect(form.controls.subrace.value).toBe('');
  });

  it('asks the page to save and to import an idle video', async () => {
    const { fixture, element } = await render();
    const events: string[] = [];
    fixture.componentInstance.submitted.subscribe(() => events.push('submit'));
    fixture.componentInstance.idleVideoRequested.subscribe(() => events.push('video'));

    element.querySelector<HTMLButtonElement>('.media-field button')!.click();
    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(events).toEqual(['video', 'submit']);
  });

  it('keeps only the description of an organization and preserves its hidden sheet', async () => {
    const { fixture, form, element } = await render();
    form.controls.armorClass.setValue(14);
    expect(element.querySelector('#npc-profile-form-title')).not.toBeNull();

    const kind = element.querySelector<HTMLSelectElement>('#npc-kind')!;
    kind.value = 'organization';
    kind.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(form.controls.kind.value).toBe('organization');
    expect(element.querySelector('#npc-profile-form-title')).toBeNull();
    expect(element.querySelector('#npc-description-form-title')).not.toBeNull();
    expect(form.controls.armorClass.value).toBe(14);
  });
});
