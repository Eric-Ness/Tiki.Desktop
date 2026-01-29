/**
 * LRU (Least Recently Used) Cache implementation using Map.
 *
 * Uses JavaScript's Map which maintains insertion order.
 * On access (get), items are moved to the end to mark them as recently used.
 * When capacity is exceeded, the first (oldest) item is evicted.
 *
 * Time complexity: O(1) for all operations
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get a value from the cache.
   * Moves the accessed item to the end (most recently used position).
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  /**
   * Set a value in the cache.
   * If key exists, updates value and moves to end.
   * If cache is at capacity, evicts the least recently used item.
   */
  set(key: K, value: V): void {
    // Remove existing to update position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  /**
   * Check if a key exists in the cache.
   * Does not affect LRU order.
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * Delete a key from the cache.
   * Returns true if the key was found and deleted.
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current number of entries in the cache.
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get an iterator over all values in the cache.
   * Note: Iteration does not affect LRU order.
   */
  values(): IterableIterator<V> {
    return this.cache.values()
  }

  /**
   * Get an iterator over all entries [key, value] in the cache.
   * Note: Iteration does not affect LRU order.
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries()
  }
}
