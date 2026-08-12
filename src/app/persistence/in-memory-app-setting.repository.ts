import { AppSettingRepository } from './app-setting.repository';

export class InMemoryAppSettingRepository extends AppSettingRepository {
  private readonly values = new Map<string, string>();

  override get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  override set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }

  override delete(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
}
