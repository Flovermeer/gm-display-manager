import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { CampaignContext } from '../campaign-layout/campaign-context';
import type { Chapter } from '../chapter/chapter';
import { ChapterService } from '../chapter/chapter.service';
import { LocationService } from '../location/location.service';
import { NpcService } from '../npc/npc.service';
import { NarrativeItemService } from '../narrative-item/narrative-item.service';
import { PlayerCharacterService } from '../player-character/player-character.service';
import { RICH_TEXT_SCHEMA_VERSION } from '../shared/rich-text-editor/rich-text-document';
import { ChapterWorkspace } from './chapter-workspace';

describe('ChapterWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
  const chapter = createChapter();
  const campaignService = { findById: vi.fn(), activate: vi.fn() };
  const chapterService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    delete: vi.fn(),
  };
  const emptyResourceService = { list: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    chapterService.list.mockResolvedValue([chapter]);
    chapterService.create.mockResolvedValue(chapter);
    chapterService.update.mockResolvedValue(chapter);
    chapterService.move.mockResolvedValue(chapter);
    chapterService.delete.mockResolvedValue(undefined);
    emptyResourceService.list.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [ChapterWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        {
          provide: CampaignContext,
          useValue: { campaign: () => campaign, load: () => Promise.resolve(campaign) },
        },
        { provide: ChapterService, useValue: chapterService },
        { provide: LocationService, useValue: emptyResourceService },
        { provide: NpcService, useValue: emptyResourceService },
        { provide: PlayerCharacterService, useValue: emptyResourceService },
        { provide: NarrativeItemService, useValue: emptyResourceService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => campaign.id } } },
        },
      ],
    }).compileComponents();
  });

  it('lists, selects and displays a persisted rich chapter', async () => {
    const fixture = TestBed.createComponent(ChapterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Le port');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.chapter-overview')).toBeTruthy();
    expect(element.querySelector('.chapter-tree')?.textContent).toContain('Arrivée à Chult');

    element.querySelector<HTMLButtonElement>('.chapter-tree button')?.click();
    await renderUntil(fixture, 'Bienvenue à Chult');

    expect(element.querySelector('h2')?.textContent).toContain('Le port');
    expect(element.querySelector('.tiptap')?.textContent).toContain('Bienvenue à Chult');
  });

  it('protects rich content changes before navigating away', async () => {
    const fixture = TestBed.createComponent(ChapterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Le port');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.chapter-list-item')?.click();
    await renderUntil(fixture, 'Bienvenue à Chult');
    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Modifier')
      ?.click();
    fixture.detectChanges();
    (
      fixture.componentInstance as unknown as {
        updateContent(content: Chapter['content']): void;
      }
    ).updateContent(chapter.content);

    const canLeave = fixture.componentInstance.canDeactivate();
    expect(canLeave).toBeInstanceOf(Promise);
  });

  it('shows ordering actions only for the selected chapter', async () => {
    const secondChapter = { ...chapter, id: 'second-id', title: 'La jungle', position: 1 };
    chapterService.list.mockResolvedValue([chapter, secondChapter]);
    chapterService.move.mockResolvedValue({ ...chapter, position: 1 });
    const fixture = TestBed.createComponent(ChapterWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'La jungle');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.order-actions')).toBeNull();
    element.querySelector<HTMLButtonElement>('.chapter-list-item')?.click();
    await renderUntil(fixture, 'Bienvenue à Chult');

    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.order-actions button')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      '↑ Monter',
      '↓ Descendre',
    ]);
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(false);
    buttons[1]?.click();
    await vi.waitFor(() => expect(chapterService.move).toHaveBeenCalledWith(chapter, 1));
  });
});

function createChapter(): Chapter {
  return {
    id: 'chapter-id',
    campaignId: 'campaign-id',
    title: 'Le port',
    summary: 'Arrivée à Chult',
    content: {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bienvenue à Chult' }] }],
      },
    },
    position: 0,
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  };
}

async function renderUntil(
  fixture: ComponentFixture<ChapterWorkspace>,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
