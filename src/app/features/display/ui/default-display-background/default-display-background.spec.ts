import { resolveFogFactory } from '@app/features/display/ui/default-display-background/default-display-background';

describe('resolveFogFactory', () => {
  const fog = () => ({ destroy: () => undefined });

  it('finds the factory whatever the CommonJS wrapping produced by the build', () => {
    expect(resolveFogFactory(fog)).toBe(fog);
    expect(resolveFogFactory({ default: fog })).toBe(fog);
    // Build de production : l'export par défaut du chunk est le `module.exports` de Vanta.
    expect(resolveFogFactory({ default: { default: fog, __esModule: true } })).toBe(fog);
  });

  it('rejects a module without factory', () => {
    expect(() => resolveFogFactory({ default: {} })).toThrow(TypeError);
    expect(() => resolveFogFactory(null)).toThrow(TypeError);
  });
});
