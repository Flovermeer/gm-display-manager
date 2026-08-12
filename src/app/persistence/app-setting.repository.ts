export abstract class AppSettingRepository {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
}
