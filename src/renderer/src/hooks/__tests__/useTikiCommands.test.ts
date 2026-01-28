import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTikiCommands } from '../useTikiCommands'

// Mock the window.tikiDesktop API
const mockGetCommands = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // Set up mock for each test
  Object.defineProperty(window, 'tikiDesktop', {
    value: {
      ...window.tikiDesktop,
      tiki: {
        ...window.tikiDesktop?.tiki,
        getCommands: mockGetCommands
      }
    },
    writable: true,
    configurable: true
  })
})

describe('useTikiCommands', () => {
  it('should start with loading state', () => {
    mockGetCommands.mockResolvedValue([])

    const { result } = renderHook(() => useTikiCommands())

    expect(result.current.loading).toBe(true)
    expect(result.current.commands).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should load commands on mount', async () => {
    const mockCommands = [
      { name: 'tiki:yolo', displayName: 'yolo', description: 'YOLO mode' },
      { name: 'tiki:ship', displayName: 'ship', description: 'Ship it' }
    ]
    mockGetCommands.mockResolvedValue(mockCommands)

    const { result } = renderHook(() => useTikiCommands())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.commands).toEqual(mockCommands)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors', async () => {
    mockGetCommands.mockRejectedValue(new Error('Failed to load commands'))

    const { result } = renderHook(() => useTikiCommands())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.commands).toEqual([])
    expect(result.current.error).toBe('Failed to load commands')
  })

  it('should filter commands by search query', async () => {
    const mockCommands = [
      { name: 'tiki:yolo', displayName: 'yolo', description: 'YOLO mode' },
      { name: 'tiki:ship', displayName: 'ship', description: 'Ship to GitHub' },
      { name: 'tiki:release-ship', displayName: 'release-ship', description: 'Ship release' }
    ]
    mockGetCommands.mockResolvedValue(mockCommands)

    const { result } = renderHook(() => useTikiCommands())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Search for "ship"
    act(() => {
      result.current.setSearchQuery('ship')
    })

    expect(result.current.filteredCommands).toHaveLength(2)
    expect(result.current.filteredCommands.map((c) => c.name)).toContain('tiki:ship')
    expect(result.current.filteredCommands.map((c) => c.name)).toContain('tiki:release-ship')
  })

  it('should return all commands when search is empty', async () => {
    const mockCommands = [
      { name: 'tiki:yolo', displayName: 'yolo', description: 'YOLO mode' },
      { name: 'tiki:ship', displayName: 'ship', description: 'Ship it' }
    ]
    mockGetCommands.mockResolvedValue(mockCommands)

    const { result } = renderHook(() => useTikiCommands())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.filteredCommands).toHaveLength(2)
  })

  it('should allow manual reload', async () => {
    mockGetCommands.mockResolvedValue([{ name: 'tiki:test', displayName: 'test', description: 'Test' }])

    const { result } = renderHook(() => useTikiCommands())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockGetCommands).toHaveBeenCalledTimes(1)

    // Manual reload
    await act(async () => {
      await result.current.reload()
    })

    expect(mockGetCommands).toHaveBeenCalledTimes(2)
  })
})
