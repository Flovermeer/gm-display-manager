import { TestBed } from '@angular/core/testing';

import { RichTextFeatureSection } from '@app/shared/ui/rich-text-feature-section/rich-text-feature-section';

describe('RichTextFeatureSection', () => {
  it('renders named rich text entries', async () => {
    const fixture = TestBed.createComponent(RichTextFeatureSection);
    fixture.componentRef.setInput('title', 'Actions');
    fixture.componentRef.setInput('features', [
      {
        id: 'action-id',
        name: 'Morsure',
        description: {
          schemaVersion: 1,
          content: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Attaque au corps à corps.' }] },
            ],
          },
        },
      },
    ]);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Morsure');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Attaque au corps à corps.',
      );
    });
  });
});
