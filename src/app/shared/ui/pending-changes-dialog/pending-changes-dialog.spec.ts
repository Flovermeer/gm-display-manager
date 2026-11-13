import { TestBed } from '@angular/core/testing';

import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

describe('PendingChangesDialog', () => {
  async function render(saving = false) {
    await TestBed.configureTestingModule({ imports: [PendingChangesDialog] }).compileComponents();
    const fixture = TestBed.createComponent(PendingChangesDialog);
    fixture.componentRef.setInput('headingId', 'pending-title');
    fixture.componentRef.setInput('message', 'Tes modifications seront perdues.');
    fixture.componentRef.setInput('saving', saving);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    return { fixture, element, buttons };
  }

  it('shows the shared title, the screen message and the three decisions', async () => {
    const { element, buttons } = await render();

    expect(element.querySelector('h2')?.textContent).toContain('Que veux-tu faire ?');
    expect(element.textContent).toContain('Tes modifications seront perdues.');
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Enregistrer et quitter',
      'Quitter sans enregistrer',
      'Continuer la modification',
    ]);
  });

  it('emits the decision chosen by the user', async () => {
    const { fixture, buttons } = await render();
    const decisions: string[] = [];
    fixture.componentInstance.save.subscribe(() => decisions.push('save'));
    fixture.componentInstance.discard.subscribe(() => decisions.push('discard'));
    fixture.componentInstance.keepEditing.subscribe(() => decisions.push('keep'));

    buttons.forEach((button) => button.click());

    expect(decisions).toEqual(['save', 'discard', 'keep']);
  });

  it('disables saving while a save is running', async () => {
    const { buttons } = await render(true);

    expect(buttons[0].disabled).toBe(true);
  });
});
