import localforage from 'localforage';

// 初始化 localforage 实例
const storage = localforage.createInstance({
  name: 'silver-moon',
  storeName: 'app_data',
});

/**
 * 统一存储接口
 * 所有本地数据读写必须通过此模块
 */
export const StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await storage.getItem<T>(key);
      return value ?? null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await storage.setItem(key, value);
    } catch (error) {
      console.error(`[Storage] 写入失败: ${key}`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await storage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] 删除失败: ${key}`, error);
    }
  },

  async keys(): Promise<string[]> {
    try {
      return await storage.keys();
    } catch {
      return [];
    }
  },
};