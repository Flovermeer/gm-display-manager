import { TestBed } from '@angular/core/testing';

import type { JournalEntry } from '../../journal/journal-entry';
import { JournalEntryService } from '../../journal/journal-entry.service';
import { createEmptyRichTextDocument } from '../rich-text-editor/rich-text-document';
import { ResourceMentionNavigationService } from '../rich-text-editor/resource-mention-navigation.service';
import { JournalEntryList } from './journal-entry-list';

describe('JournalEntryList', () => {
  const entry: JournalEntry = {
    id: 'entry-id',
    campaignId: 'campaign-id',
    target: { resourceType: 'npc', resourceId: 'npc-id' },
    sessionAt: '2026-08-13T18:30:00.000Z',
    inGameDate: '12 Ches',
    title: 'Rencontre',
    content: {
      schemaVersion: 1,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Syndra parle de la malédiction.' }],
          },
        ],
      },
    },
    createdAt: '2026-08-13T18:30:00.000Z',
    updatedAt: '2026-08-13T18:30:00.000Z',
  };
  const service = {
    listForTarget: vi.fn(),
    listGlobal: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mentionNavigation = { listCandidates: vi.fn(), open: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    service.listForTarget.mockResolvedValue([entry]);
    service.listGlobal.mockResolvedValue([]);
    service.create.mockResolvedValue(entry);
    service.update.mockResolvedValue(entry);
    service.delete.mockResolvedValue(undefined);
    mentionNavigation.listCandidates.mockResolvedValue([]);
    mentionNavigation.open.mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [JournalEntryList],
      providers: [
        { provide: JournalEntryService, useValue: service },
        { provide: ResourceMentionNavigationService, useValue: mentionNavigation },
      ],
    });
  });

  it('lists target entries and opens one for editing', async () => {
    const fixture = TestBed.createComponent(JournalEntryList);
    fixture.componentRef.setInput('campaignId', 'campaign-id');
    fixture.componentRef.setInput('resourceType', 'npc');
    fixture.componentRef.setInput('resourceId', 'npc-id');
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rencontre');
    });

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.journal-entry__actions .ui-button--secondary')
      ?.click();
    fixture.detectChanges();

    expect(service.listForTarget).toHaveBeenCalledWith('campaign-id', {
      resourceType: 'npc',
      resourceId: 'npc-id',
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#journal-title')
        ?.value,
    ).toBe('Rencontre');
  });

  it('uses only global entries when no target is provided', async () => {
    const fixture = TestBed.createComponent(JournalEntryList);
    fixture.componentRef.setInput('campaignId', 'campaign-id');
    fixture.detectChanges();
    await vi.waitFor(() => expect(service.listGlobal).toHaveBeenCalledWith('campaign-id'));
    expect(service.listForTarget).not.toHaveBeenCalled();
  });
});
