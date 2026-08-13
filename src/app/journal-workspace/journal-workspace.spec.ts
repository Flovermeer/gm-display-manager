import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignContext } from '../campaign-layout/campaign-context';
import type { JournalEntry } from '../journal/journal-entry';
import { JournalEntryService } from '../journal/journal-entry.service';
import { LocationService } from '../location/location.service';
import { NpcService } from '../npc/npc.service';
import { PlayerCharacterService } from '../player-character/player-character.service';
import { JournalEntryList } from '../shared/journal-entry-list/journal-entry-list';
import { JournalWorkspace } from './journal-workspace';

describe('JournalWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
  const linkedEntry: JournalEntry = {
    id: 'entry-id',
    campaignId: campaign.id,
    target: { resourceType: 'npc', resourceId: 'npc-id' },
    sessionAt: '2026-08-13T18:30:00.000Z',
    inGameDate: '',
    title: 'La malédiction',
    content: {
      schemaVersion: 1,
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Syndra explique tout.' }] },
        ],
      },
    },
    createdAt: '2026-08-13T18:30:00.000Z',
    updatedAt: '2026-08-13T18:30:00.000Z',
  };
  const journalEntryService = {
    list: vi.fn(),
    listGlobal: vi.fn(),
    listForTarget: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const npcService = { list: vi.fn() };
  const emptyResourceService = { list: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    journalEntryService.list.mockResolvedValue([linkedEntry]);
    journalEntryService.listGlobal.mockResolvedValue([]);
    npcService.list.mockResolvedValue([{ id: 'npc-id', name: 'Syndra Silvane' }]);
    emptyResourceService.list.mockResolvedValue([]);
    router.navigate.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [JournalWorkspace],
      providers: [
        { provide: CampaignContext, useValue: { campaign: () => campaign, load: () => campaign } },
        { provide: JournalEntryService, useValue: journalEntryService },
        { provide: NpcService, useValue: npcService },
        { provide: LocationService, useValue: emptyResourceService },
        { provide: PlayerCharacterService, useValue: emptyResourceService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('lists resource notes as compact links and opens the referenced entry', async () => {
    const fixture = TestBed.createComponent(JournalWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.resource-note-link',
    );
    expect(link?.textContent).toContain('PNJ');
    expect(link?.textContent).toContain('Syndra explique tout.');
    link?.click();

    await vi.waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith(['/campaigns', campaign.id, 'npcs'], {
        queryParams: { resourceId: 'npc-id', entryId: 'entry-id' },
      }),
    );
  });

  it('asks what to do before leaving a dirty global note', async () => {
    const fixture = TestBed.createComponent(JournalWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Notes générales');
    const journal = fixture.debugElement.query(By.directive(JournalEntryList))
      .componentInstance as JournalEntryList;
    const editable = journal as unknown as {
      createEntry(): void;
      entryForm: { markAsDirty(): void };
    };
    editable.createEntry();
    editable.entryForm.markAsDirty();

    expect(fixture.componentInstance.canDeactivate()).toBeInstanceOf(Promise);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Modifications non enregistrées',
    );
  });
});

async function renderUntil(
  fixture: ComponentFixture<JournalWorkspace>,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
