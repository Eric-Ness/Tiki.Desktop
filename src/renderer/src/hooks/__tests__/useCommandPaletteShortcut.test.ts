import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommandPaletteShortcut } from '../useCommandPaletteShortcut'

describe('useCommandPaletteShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up event listeners
    document.body.innerHTML = ''
  })

  it('should return isOpen as false initially', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    expect(result.current.isOpen).toBe(false)
  })

  it('should open palette on Ctrl+K (Windows)', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true
        })
      )
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('should open palette on Meta+K (Mac)', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true
        })
      )
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('should toggle palette on repeated shortcut', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    // Open
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true
        })
      )
    })
    expect(result.current.isOpen).toBe(true)

    // Close
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true
        })
      )
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('should close palette when close function is called', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    // Open first
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true
        })
      )
    })
    expect(result.current.isOpen).toBe(true)

    // Close via function
    act(() => {
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('should not trigger when typing in an input', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    // Create an input element
    const input = document.createElement('input')
    document.body.appendChild(input)

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true
      })
      Object.defineProperty(event, 'target', { value: input })
      document.dispatchEvent(event)
    })

    expect(result.current.isOpen).toBe(false)
  })

  it('should not trigger when typing in a textarea', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    // Create a textarea element
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true
      })
      Object.defineProperty(event, 'target', { value: textarea })
      document.dispatchEvent(event)
    })

    expect(result.current.isOpen).toBe(false)
  })

  it('should not trigger on regular K key without modifier', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          bubbles: true
        })
      )
    })

    expect(result.current.isOpen).toBe(false)
  })

  it('should provide setIsOpen function', () => {
    const { result } = renderHook(() => useCommandPaletteShortcut())

    act(() => {
      result.current.setIsOpen(true)
    })

    expect(result.current.isOpen).toBe(true)
  })
})
