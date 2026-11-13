import { TestBed } from '@angular/core/testing';

import { createEmptyNpcSheet } from '@app/features/npcs/domain/npc';
import { NpcSheetView } from '@app/features/npcs/ui/npc-sheet-view/npc-sheet-view';

describe('NpcSheetView', () => {
  it('shows the formatted reference sheet of an NPC', async () => {
    await TestBed.configureTestingModule({ imports: [NpcSheetView] }).compileComponents();
    const fixture = TestBed.createComponent(NpcSheetView);
    fixture.componentRef.setInput('sheet', {
      ...createEmptyNpcSheet(),
      race: 'Elfe',
      occupation: 'Aubergiste',
      armorClass: 12,
      armorClassDetails: 'armure de cuir',
      abilities: { ...createEmptyNpcSheet().abilities, dexterity: 16 },
      languages: ['Commun', 'Elfique'],
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Elfe');
    expect(text).toContain('Aubergiste');
    expect(text).toContain('12 (armure de cuir)');
    expect(text).toContain('16 (+3)');
    expect(text).toContain('Commun, Elfique');
  });

  it('shows only the description of an organization', async () => {
    await TestBed.configureTestingModule({ imports: [NpcSheetView] }).compileComponents();
    const fixture = TestBed.createComponent(NpcSheetView);
    fixture.componentRef.setInput('sheet', { ...createEmptyNpcSheet(), armorClass: 12 });
    fixture.componentRef.setInput('organization', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.stat-block')).toBeNull();
    expect(element.textContent).toContain('Description officielle');
  });
});
