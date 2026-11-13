import { TestBed } from '@angular/core/testing';

import { MediaViewer } from '@app/shared/ui/media-viewer/media-viewer';

describe('MediaViewer', () => {
  async function render() {
    await TestBed.configureTestingModule({ imports: [MediaViewer] }).compileComponents();
    const fixture = TestBed.createComponent(MediaViewer);
    fixture.componentRef.setInput('imageUrl', 'asset://crypt.webp');
    fixture.componentRef.setInput('alt', 'Crypte');
    fixture.componentRef.setInput('position', 1);
    fixture.componentRef.setInput('count', 2);
    fixture.componentRef.setInput('hasNext', true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return { fixture, element, button };
  }

  it('zooms by steps and resets the zoom when the image changes', async () => {
    const { fixture, element, button } = await render();

    button('Zoomer').click();
    button('Zoomer').click();
    fixture.detectChanges();
    expect(element.querySelector('.media-viewer__zoom-level')?.textContent).toContain('150 %');

    fixture.componentRef.setInput('imageUrl', 'asset://altar.webp');
    fixture.detectChanges();
    expect(element.querySelector('.media-viewer__zoom-level')?.textContent).toContain('100 %');
    expect(button('Dézoomer').disabled).toBe(true);
  });

  it('asks the page to navigate or close', async () => {
    const { fixture, button } = await render();
    const events: string[] = [];
    fixture.componentInstance.next.subscribe(() => events.push('next'));
    fixture.componentInstance.closed.subscribe(() => events.push('close'));

    button('Image suivante').click();
    button('Fermer l’image').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(events).toEqual(['next', 'close', 'close']);
    expect(button('Image précédente').disabled).toBe(true);
  });
});
