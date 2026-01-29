import { describe, it, expect, beforeEach } from 'vitest'
import { LRUCache } from '../lru-cache'

describe('LRUCache', () => {
  describe('basic get/set operations', () => {
    it('should set and get a value', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)

      expect(cache.get('a')).toBe(1)
    })

    it('should return undefined for non-existent key', () => {
      const cache = new LRUCache<string, number>(3)

      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should overwrite existing value with same key', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('a', 2)

      expect(cache.get('a')).toBe(2)
      expect(cache.size).toBe(1)
    })

    it('should track size correctly', () => {
      const cache = new LRUCache<string, number>(5)

      expect(cache.size).toBe(0)

      cache.set('a', 1)
      expect(cache.size).toBe(1)

      cache.set('b', 2)
      expect(cache.size).toBe(2)

      cache.set('c', 3)
      expect(cache.size).toBe(3)
    })

    it('should check if key exists with has()', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)

      expect(cache.has('a')).toBe(true)
      expect(cache.has('b')).toBe(false)
    })

    it('should delete a key', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)

      expect(cache.delete('a')).toBe(true)
      expect(cache.has('a')).toBe(false)
      expect(cache.size).toBe(1)
    })

    it('should return false when deleting non-existent key', () => {
      const cache = new LRUCache<string, number>(3)

      expect(cache.delete('nonexistent')).toBe(false)
    })

    it('should clear all entries', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.has('a')).toBe(false)
      expect(cache.has('b')).toBe(false)
      expect(cache.has('c')).toBe(false)
    })
  })

  describe('LRU eviction when maxSize exceeded', () => {
    it('should evict oldest entry when maxSize exceeded', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1) // oldest
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4) // this should evict 'a'

      expect(cache.has('a')).toBe(false)
      expect(cache.has('b')).toBe(true)
      expect(cache.has('c')).toBe(true)
      expect(cache.has('d')).toBe(true)
      expect(cache.size).toBe(3)
    })

    it('should evict multiple entries when adding many items', () => {
      const cache = new LRUCache<string, number>(2)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3) // evicts 'a'
      cache.set('d', 4) // evicts 'b'

      expect(cache.has('a')).toBe(false)
      expect(cache.has('b')).toBe(false)
      expect(cache.has('c')).toBe(true)
      expect(cache.has('d')).toBe(true)
    })

    it('should not evict when updating existing key', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('a', 10) // update existing, should not evict

      expect(cache.size).toBe(3)
      expect(cache.get('a')).toBe(10)
      expect(cache.has('b')).toBe(true)
      expect(cache.has('c')).toBe(true)
    })
  })

  describe('access updates position (get moves to end)', () => {
    it('should move accessed item to most recently used position', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1) // oldest
      cache.set('b', 2)
      cache.set('c', 3)

      // Access 'a', making it most recently used
      cache.get('a')

      // Add new item, should evict 'b' (now oldest) instead of 'a'
      cache.set('d', 4)

      expect(cache.has('a')).toBe(true) // was accessed, should still be here
      expect(cache.has('b')).toBe(false) // should be evicted
      expect(cache.has('c')).toBe(true)
      expect(cache.has('d')).toBe(true)
    })

    it('should update position on multiple accesses', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      // Access pattern: c, a, b (b becomes most recent)
      cache.get('c')
      cache.get('a')
      cache.get('b')

      // Add two new items
      cache.set('d', 4) // evicts 'c' (oldest after accesses)
      cache.set('e', 5) // evicts 'a'

      expect(cache.has('b')).toBe(true) // most recently accessed
      expect(cache.has('d')).toBe(true)
      expect(cache.has('e')).toBe(true)
      expect(cache.has('a')).toBe(false)
      expect(cache.has('c')).toBe(false)
    })

    it('should not update position for non-existent key access', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)

      // Try to get non-existent key
      const result = cache.get('nonexistent')

      expect(result).toBeUndefined()
      expect(cache.size).toBe(2)
    })
  })

  describe('size never exceeds maxSize', () => {
    it('should never exceed maxSize of 1', () => {
      const cache = new LRUCache<string, number>(1)

      cache.set('a', 1)
      expect(cache.size).toBe(1)

      cache.set('b', 2)
      expect(cache.size).toBe(1)

      cache.set('c', 3)
      expect(cache.size).toBe(1)

      expect(cache.get('c')).toBe(3)
      expect(cache.has('a')).toBe(false)
      expect(cache.has('b')).toBe(false)
    })

    it('should never exceed maxSize under rapid operations', () => {
      const cache = new LRUCache<number, string>(10)

      // Add 100 items
      for (let i = 0; i < 100; i++) {
        cache.set(i, `value-${i}`)
        expect(cache.size).toBeLessThanOrEqual(10)
      }

      expect(cache.size).toBe(10)

      // Only last 10 items should be present
      for (let i = 0; i < 90; i++) {
        expect(cache.has(i)).toBe(false)
      }
      for (let i = 90; i < 100; i++) {
        expect(cache.has(i)).toBe(true)
      }
    })

    it('should maintain maxSize with mixed operations', () => {
      const cache = new LRUCache<string, number>(5)

      // Fill cache
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4)
      cache.set('e', 5)
      expect(cache.size).toBe(5)

      // Access some items
      cache.get('a')
      cache.get('c')

      // Add more items
      cache.set('f', 6)
      cache.set('g', 7)

      expect(cache.size).toBe(5)
    })
  })

  describe('iteration methods', () => {
    it('should iterate over values', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      const values = Array.from(cache.values())

      expect(values).toHaveLength(3)
      expect(values).toContain(1)
      expect(values).toContain(2)
      expect(values).toContain(3)
    })

    it('should iterate over entries', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      const entries = Array.from(cache.entries())

      expect(entries).toHaveLength(3)
      expect(entries).toContainEqual(['a', 1])
      expect(entries).toContainEqual(['b', 2])
      expect(entries).toContainEqual(['c', 3])
    })

    it('should return entries in insertion order', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      const entries = Array.from(cache.entries())

      expect(entries[0]).toEqual(['a', 1])
      expect(entries[1]).toEqual(['b', 2])
      expect(entries[2]).toEqual(['c', 3])
    })
  })

  describe('edge cases', () => {
    it('should work with numeric keys', () => {
      const cache = new LRUCache<number, string>(3)

      cache.set(1, 'one')
      cache.set(2, 'two')
      cache.set(3, 'three')

      expect(cache.get(1)).toBe('one')
      expect(cache.get(2)).toBe('two')
      expect(cache.get(3)).toBe('three')
    })

    it('should work with object values', () => {
      interface TestObject {
        name: string
        value: number
      }

      const cache = new LRUCache<string, TestObject>(3)

      const obj = { name: 'test', value: 42 }
      cache.set('key', obj)

      expect(cache.get('key')).toBe(obj)
    })

    it('should handle undefined values correctly', () => {
      const cache = new LRUCache<string, string | undefined>(3)

      cache.set('a', undefined)

      // Note: get returns undefined for both missing keys and undefined values
      // has() should distinguish between them
      expect(cache.has('a')).toBe(true)
      expect(cache.get('a')).toBeUndefined()
    })

    it('should handle null values', () => {
      const cache = new LRUCache<string, null>(3)

      cache.set('a', null)

      expect(cache.has('a')).toBe(true)
      expect(cache.get('a')).toBeNull()
    })
  })
})
