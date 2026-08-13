import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import type { Chapter } from '../chapter/chapter';
import { ChapterService } from '../chapter/chapter.service';
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
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    chapterService.list.mockResolvedValue([chapter]);
    chapterService.create.mockResolvedValue(chapter);
    chapterService.update.mockResolvedValue(chapter);
    chapterService.delete.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ChapterWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        { provide: ChapterService, useValue: chapterService },
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

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.chapter-list-item')
      ?.click();
    await renderUntil(fixture, 'Bienvenue à Chult');

    const element = fixture.nativeElement as HTMLElement;
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
