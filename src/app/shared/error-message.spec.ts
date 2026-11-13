import { DEFAULT_ERROR_MESSAGE, errorMessage } from '@app/shared/error-message';

describe('errorMessage', () => {
  it('keeps native Error, string and Tauri object messages', () => {
    expect(errorMessage(new Error('native error'), 'fallback')).toBe('native error');
    expect(errorMessage('database error', 'fallback')).toBe('database error');
    expect(errorMessage({ message: 'no such table: scene' }, 'fallback')).toBe(
      'no such table: scene',
    );
  });

  it('uses the fallback for an unknown error shape', () => {
    expect(errorMessage({ code: 500 }, 'fallback')).toBe('fallback');
  });

  it('uses the default message when no fallback is given', () => {
    expect(errorMessage(undefined)).toBe(DEFAULT_ERROR_MESSAGE);
    expect(errorMessage(new Error(''))).toBe(DEFAULT_ERROR_MESSAGE);
  });
});
