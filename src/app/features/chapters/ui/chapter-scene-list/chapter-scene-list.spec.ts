import { TestBed } from '@angular/core/testing';

import type { Scene } from '@app/features/scenes/domain/scene';
import { ChapterSceneList } from '@app/features/chapters/ui/chapter-scene-list/chapter-scene-list';

describe('ChapterSceneList', () => {
  it('emits opening, ordering and attachment commands', async () => {
    await TestBed.configureTestingModule({ imports: [ChapterSceneList] }).compileComponents();
    const fixture = TestBed.createComponent(ChapterSceneList);
    const second = { ...scene, id: 'scene-2', name: 'Audience', position: 1 };
    const candidate = { ...scene, id: 'scene-3', name: 'Campement', chapterId: 'chapter-2' };
    const opened = vi.fn();
    const moved = vi.fn();
    const attached = vi.fn();
    fixture.componentRef.setInput('scenes', [scene, second]);
    fixture.componentRef.setInput('candidates', [{ scene: candidate, chapterTitle: 'La jungle' }]);
    fixture.componentInstance.openScene.subscribe(opened);
    fixture.componentInstance.moveScene.subscribe(moved);
    fixture.componentInstance.attachScene.subscribe(attached);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.chapter-scene__open')?.click();
    const orderButtons = element.querySelectorAll<HTMLButtonElement>(
      '.chapter-scene__order button',
    );
    orderButtons[1]?.click();
    const select = element.querySelector<HTMLSelectElement>('select');
    if (!select) throw new Error('Scene selector not found.');
    select.value = candidate.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    findButton(element, 'Rattacher').click();

    expect(opened).toHaveBeenCalledWith(scene);
    expect(moved).toHaveBeenCalledWith({ scene, direction: 1 });
    expect(attached).toHaveBeenCalledWith(candidate);
  });
});

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

const scene: Scene = {
  id: 'scene-1',
  campaignId: 'campaign-id',
  chapterId: 'chapter-1',
  position: 0,
  name: 'Débarquement',
  summary: '',
  locationId: null,
  npcIds: [],
  monsterIds: [],
  itemIds: [],
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
};
