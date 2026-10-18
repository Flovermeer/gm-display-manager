import { TestBed } from '@angular/core/testing';

import { GameRuleOptionService } from '@app/features/game-systems/application/game-rule-option.service';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import type { GameUniverse } from '@app/features/game-systems/domain/game-system';
import { CharacterRuleCatalogSettings } from '@app/features/game-systems/ui/character-rule-catalog-settings/character-rule-catalog-settings';

const genericUniverse: GameUniverse = {
  id: 'dnd5e:generic',
  gameSystemId: 'dnd5e',
  name: 'Dungeons & Dragons 5e (générique)',
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const forgottenRealms: GameUniverse = {
  ...genericUniverse,
  id: 'forgotten-realms',
  name: 'Forgotten Realms',
};

const genericRace: GameRuleOption = {
  id: 'elf',
  gameSystemId: 'dnd5e',
  universeId: genericUniverse.id,
  category: 'race',
  parentOptionId: null,
  code: 'elfe',
  label: 'Elfe',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const specificRace: GameRuleOption = {
  ...genericRace,
  id: 'shadar-kai',
  universeId: forgottenRealms.id,
  code: 'shadar-kai',
  label: 'Shadar-kai',
};

describe('CharacterRuleCatalogSettings', () => {
  it('shows inherited values but only allows removing values owned by the selected universe', async () => {
    const service = {
      listForUniverse: vi.fn().mockResolvedValue([genericRace, specificRace]),
      addForUniverse: vi.fn(),
      removeFromUniverse: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [CharacterRuleCatalogSettings],
      providers: [{ provide: GameRuleOptionService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CharacterRuleCatalogSettings);
    fixture.componentRef.setInput('universe', forgottenRealms);
    fixture.componentRef.setInput('universes', [genericUniverse, forgottenRealms]);
    fixture.componentRef.setInput('category', 'race');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Dungeons & Dragons 5e (générique)');
    expect(element.textContent).toContain('Forgotten Realms');
    expect(element.querySelector('button[aria-label="Supprimer Elfe"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Supprimer Shadar-kai"]')).not.toBeNull();
  });
});
