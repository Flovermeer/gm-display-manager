import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';

describe('PendingChangesPrompt', () => {
  it('opens a confirmation and resolves it with the user decision', async () => {
    const prompt = new PendingChangesPrompt();

    const decision = prompt.request();
    expect(prompt.isOpen()).toBe(true);

    prompt.resolve(true);
    await expect(decision).resolves.toBe(true);
    expect(prompt.isOpen()).toBe(false);
  });

  it('refuses a second request while a confirmation is already open', async () => {
    const prompt = new PendingChangesPrompt();
    const first = prompt.request();

    expect(prompt.request()).toBe(false);

    prompt.resolve(false);
    await expect(first).resolves.toBe(false);
  });

  it('ignores a resolution without pending request', () => {
    const prompt = new PendingChangesPrompt();

    expect(() => prompt.resolve(true)).not.toThrow();
    expect(prompt.isOpen()).toBe(false);
  });
});
