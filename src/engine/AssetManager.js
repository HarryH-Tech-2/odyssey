export class AssetManager {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
    return value;
  }

  has(key) {
    return this.cache.has(key);
  }
}
