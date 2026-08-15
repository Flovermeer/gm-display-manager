import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { createEmptyMonsterSheet, type Monster } from '@app/features/bestiary/domain/monster';
import { JournalEntryService } from '@app/features/journal/application/journal-entry.service';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { BestiaryWorkspace } from '@app/features/bestiary/pages/bestiary-workspace/bestiary-workspace';

describe('BestiaryWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    universeId: 'forgotten-realms',
    createdAt: '2026-08-14T12:00:00.000Z',
    updatedAt: '2026-08-14T12:00:00.000Z',
  };
  const monster: Monster = {
    id: 'monster-id',
    campaignId: campaign.id,
    name: 'Atropal',
    imagePath: null,
    sheet: { ...createEmptyMonsterSheet(), creatureType: 'Mort-vivant' },
    sheetSchemaVersion: 1,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
  const monsterService = {
    list: vi.fn(),
    listAvailable: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
  };
  const journalEntryService = {
    listForTarget: vi.fn(),
    listGlobal: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    monsterService.list.mockResolvedValue([monster]);
    monsterService.update.mockImplementation(
      async (current: Monster, input: Pick<Monster, 'name' | 'imagePath' | 'sheet'>) => ({
        ...current,
        ...input,
      }),
    );
    journalEntryService.listForTarget.mockResolvedValue([]);
    const queryParamMap = new BehaviorSubject(
      convertToParamMap({ resourceId: monster.id, entryId: 'entry-id' }),
    );

    await TestBed.configureTestingModule({
      imports: [BestiaryWorkspace],
      providers: [
        { provide: CampaignContext, useValue: { campaign: () => campaign, load: () => campaign } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap,
            snapshot: { queryParamMap: queryParamMap.value },
          },
        },
        { provide: MonsterService, useValue: monsterService },
        {
          provide: MonsterImageGateway,
          useValue: { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() },
        },
        { provide: JournalEntryService, useValue: journalEntryService },
        {
          provide: ResourceMentionNavigationService,
          useValue: { listCandidates: () => Promise.resolve([]), open: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('opens a requested monster and loads its journal entries', async () => {
    const fixture = TestBed.createComponent(BestiaryWorkspace);
    fixture.detectChanges();

    await renderUntil(fixture, 'Atropal');

    expect(journalEntryService.listForTarget).toHaveBeenCalledWith(campaign.id, {
      resourceType: 'monster',
      resourceId: monster.id,
    });
  });

  it('edits and saves a repeatable monster action', async () => {
    const fixture = TestBed.createComponent(BestiaryWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Atropal');
    const element = fixture.nativeElement as HTMLElement;

    findButton(element, 'Modifier').click();
    await renderUntil(fixture, 'Actions légendaires');
    const actionsEditor = [...element.querySelectorAll('app-rich-text-feature-editor')].find(
      (editor) => editor.querySelector('h3')?.textContent?.trim() === 'Actions',
    );
    if (!actionsEditor) throw new Error('Monster actions editor not found.');
    actionsEditor.querySelector<HTMLButtonElement>('.ui-button')?.click();
    fixture.detectChanges();

    const nameInput = actionsEditor.querySelector<HTMLInputElement>('input');
    if (!nameInput) throw new Error('Monster action name field not found.');
    nameInput.value = 'Attaques multiples';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    findButton(element, 'Enregistrer').click();

    await vi.waitFor(() => {
      expect(monsterService.update).toHaveBeenCalledWith(
        monster,
        expect.objectContaining({
          sheet: expect.objectContaining({
            actions: [expect.objectContaining({ name: 'Attaques multiples' })],
          }),
        }),
      );
    });
  });

  it('renders saved monster actions in the detailed sheet', async () => {
    monsterService.list.mockResolvedValue([
      {
        ...monster,
        sheet: {
          ...monster.sheet,
          actions: [
            {
              id: 'action-id',
              name: 'Morsure',
              description: {
                schemaVersion: 1,
                content: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Attaque au corps à corps.' }],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);
    const fixture = TestBed.createComponent(BestiaryWorkspace);
    fixture.detectChanges();

    await renderUntil(fixture, 'Attaque au corps à corps.');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Morsure');
  });
});

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

async function renderUntil(
  fixture: ComponentFixture<BestiaryWorkspace>,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
