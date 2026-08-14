export type MonitorDescriptor = Readonly<{
  id: string;
  fingerprint: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
  isPrimary: boolean;
}>;
