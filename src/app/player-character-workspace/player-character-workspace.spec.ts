import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  type PlayerCharacter,
} from '../player-character/player-character';
import { PlayerCharacterService } from '../player-character/player-character.service';
import { PlayerCharacterPortraitGateway } from '../media/player-character-portrait.gateway';
import { PlayerCharacterWorkspace } from './player-character-workspace';

describe('PlayerCharacterWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const character: PlayerCharacter = {
    id: 'character-id',
    campaignId: campaign.id,
    name: 'Nyssa',
    playerName: 'Flore',
    status: 'active',
    currentHitPoints: 18,
    maxHitPoints: 24,
    portraitPath: null,
    sheet: {
      ...EMPTY_PLAYER_CHARACTER_SHEET,
      species: 'Elfe',
      className: 'Rôdeuse',
      level: 3,
      armorClass: 15,
      passivePerception: 14,
    },
    sheetSchemaVersion: 1,
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const campaignService = { findById: vi.fn(), activate: vi.fn() };
  const characterService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateHitPoints: vi.fn(),
    delete: vi.fn(),
  };
  const portraitGateway = {
    chooseAndImport: vi.fn(),
    resolveUrl: vi.fn(),
    discard: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    characterService.list.mockResolvedValue([character]);
    characterService.create.mockResolvedValue(character);
    characterService.update.mockResolvedValue(character);
    characterService.updateHitPoints.mockResolvedValue(character);
    characterService.delete.mockResolvedValue(undefined);
    portraitGateway.chooseAndImport.mockResolvedValue(null);
    portraitGateway.resolveUrl.mockResolvedValue('asset://portrait');
    portraitGateway.discard.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [PlayerCharacterWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        { provide: PlayerCharacterService, useValue: characterService },
        { provide: PlayerCharacterPortraitGateway, useValue: portraitGateway },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => campaign.id } } },
        },
      ],
    }).compileComponents();
  });

  it('shows a permanent group summary with hit points', async () => {
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');

    const item = (fixture.nativeElement as HTMLElement).querySelector('.character-list-item');
    expect(item?.textContent).toContain('18 / 24 PV');
    expect(item?.textContent).toContain('Flore');
    expect(item?.textContent).toContain('Rôdeuse · niveau 3');
  });

  it('edits current hit points from the read-only reference sheet', async () => {
    const updatedCharacter = { ...character, currentHitPoints: 9 };
    characterService.updateHitPoints.mockResolvedValue(updatedCharacter);
    characterService.list.mockResolvedValueOnce([character]).mockResolvedValue([updatedCharacter]);
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.character-list-item')?.click();
    await renderUntil(fixture, 'Points de vie actuels');
    const input = element.querySelector<HTMLInputElement>('#current-hit-points');
    if (!input) throw new Error('Current hit points field not found.');
    input.value = '9';
    input.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('.hit-point-editor .primary-button')?.click();

    await vi.waitFor(() => {
      expect(characterService.updateHitPoints).toHaveBeenCalledWith(character, 9);
    });
  });

  it('asks for confirmation before resetting hit points to the maximum', async () => {
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.character-list-item')?.click();
    await renderUntil(fixture, 'Remettre au maximum');
    const resetButton = [
      ...element.querySelectorAll<HTMLButtonElement>('.hit-point-editor button'),
    ].find((button) => button.textContent?.includes('maximum'));
    resetButton?.click();
    await renderUntil(fixture, 'Remettre les PV au maximum ?');

    const confirmButton = [...element.querySelectorAll<HTMLButtonElement>('.dialog button')].find(
      (button) => button.textContent?.includes('Confirmer'),
    );
    confirmButton?.click();

    await vi.waitFor(() => {
      expect(characterService.updateHitPoints).toHaveBeenCalledWith(character, 24);
    });
  });

  it('disables save and explains an invalid field while typing', async () => {
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.create-button')?.click();
    await renderUntil(fixture, 'Créer un PJ');
    const levelInput = element.querySelector<HTMLInputElement>('#character-level');
    const nameInput = element.querySelector<HTMLInputElement>('#character-name');
    if (!levelInput || !nameInput) throw new Error('Character form fields not found.');
    nameInput.value = 'Ariane';
    nameInput.dispatchEvent(new Event('input'));
    levelInput.value = '21';
    levelInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveButton = [
      ...element.querySelectorAll<HTMLButtonElement>('.detail-actions button'),
    ].find((button) => button.textContent?.includes('Enregistrer'));
    expect(saveButton?.disabled).toBe(true);
    expect(levelInput.closest('.field')?.querySelector('.field-error')?.textContent).toContain(
      'entre 1 et 20',
    );
    expect(characterService.create).not.toHaveBeenCalled();
  });

  it('explains when current hit points exceed the maximum', async () => {
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.create-button')?.click();
    await renderUntil(fixture, 'Créer un PJ');
    const currentInput = element.querySelector<HTMLInputElement>('#character-current-hp');
    const maximumInput = element.querySelector<HTMLInputElement>('#character-max-hp');
    if (!currentInput || !maximumInput) throw new Error('Hit point fields not found.');
    maximumInput.value = '10';
    maximumInput.dispatchEvent(new Event('input'));
    currentInput.value = '12';
    currentInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(currentInput.closest('.field')?.querySelector('.field-error')?.textContent).toContain(
      'ne peuvent pas dépasser',
    );
  });

  it('shows the exhaustion range error while typing', async () => {
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.create-button')?.click();
    await renderUntil(fixture, 'Créer un PJ');
    const exhaustionInput = element.querySelector<HTMLInputElement>('#character-exhaustion');
    if (!exhaustionInput) throw new Error('Exhaustion field not found.');
    exhaustionInput.value = '7';
    exhaustionInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(exhaustionInput.closest('.field')?.querySelector('.field-error')?.textContent).toContain(
      'entre 0 et 6',
    );
  });

  it('previews an imported portrait and passes it when saving', async () => {
    const portraitPath = 'campaigns/campaign-id/media/player-character-portraits/nyssa.webp';
    portraitGateway.chooseAndImport.mockResolvedValue(portraitPath);
    const fixture = TestBed.createComponent(PlayerCharacterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Nyssa');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.character-list-item')?.click();
    await renderUntil(fixture, 'Modifier');
    element.querySelector<HTMLButtonElement>('.detail-actions .primary-button')?.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.portrait-action')?.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        element.querySelector<HTMLImageElement>('.character-portrait-frame img')?.src,
      ).toContain('asset://portrait');
    });
    const saveButton = [
      ...element.querySelectorAll<HTMLButtonElement>('.detail-actions button'),
    ].find((button) => button.textContent?.includes('Enregistrer'));
    saveButton?.click();

    await vi.waitFor(() => {
      expect(characterService.update).toHaveBeenCalledWith(
        character,
        expect.any(Object),
        portraitPath,
      );
    });
  });
});

async function renderUntil(fixture: ComponentFixture<PlayerCharacterWorkspace>, text: string) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
