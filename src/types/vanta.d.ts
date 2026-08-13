declare module 'three' {
  const three: Record<string, unknown>;
  export = three;
}

declare module 'vanta/dist/vanta.fog.min' {
  type VantaEffect = { destroy(): void };
  const fog: (options: Record<string, unknown>) => VantaEffect;
  export default fog;
}
