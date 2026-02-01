import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReleaseList } from '../ReleaseList'
import type { Release } from '../../../stores/tiki-store'

// Mock the tiki store
const mockReleases: Release[] = []
const mockSetSelectedRelease = vi.fn()
const mockSetSelectedNode = vi.fn()
const mockSetSelectedIssue = vi.fn()
const mockSetSelectedKnowledge = vi.fn()
const mockSetSelectedHook = vi.fn()
const mockSetSelectedCommand = vi.fn()

vi.mock('../../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      releases: mockReleases,
      selectedRelease: null,
      setSelectedRelease: mockSetSelectedRelease,
      setSelectedNode: mockSetSelectedNode,
      setSelectedIssue: mockSetSelectedIssue,
      setSelectedKnowledge: mockSetSelectedKnowledge,
      setSelectedHook: mockSetSelectedHook,
      setSelectedCommand: mockSetSelectedCommand
    }
    return selector(state)
  })
}))

describe('ReleaseList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReleases.length = 0
  })

  describe('archive sorting and limiting', () => {
    it('should sort shipped releases in descending order (newest first)', () => {
      // Add shipped releases in ascending order
      mockReleases.push(
        { version: 'v0.8.0', status: 'shipped', issues: [] } as Release,
        { version: 'v0.9.0', status: 'shipped', issues: [] } as Release,
        { version: 'v0.7.0', status: 'shipped', issues: [] } as Release,
        { version: 'v1.0.0', status: 'active', issues: [] } as Release
      )

      render(<ReleaseList />)

      // Find all version texts in the archive section
      const archiveSection = screen.getByText('Archive').parentElement
      expect(archiveSection).toBeTruthy()

      // Get the versions in order they appear
      const versionElements = archiveSection!.querySelectorAll('.font-medium')
      const versions = Array.from(versionElements).map((el) => el.textContent)

      // Should be sorted descending: v0.9.0, v0.8.0, v0.7.0
      expect(versions).toEqual(['v0.9.0', 'v0.8.0', 'v0.7.0'])
    })

    it('should limit shipped releases to 10 items', () => {
      // Add 15 shipped releases
      for (let i = 1; i <= 15; i++) {
        const version = `v0.${i}.0`
        mockReleases.push({ version, status: 'shipped', issues: [] } as Release)
      }

      render(<ReleaseList />)

      // Find all version texts in the archive section
      const archiveSection = screen.getByText('Archive').parentElement
      expect(archiveSection).toBeTruthy()

      const versionElements = archiveSection!.querySelectorAll('.font-medium')

      // Should only show 10 releases
      expect(versionElements.length).toBe(10)
    })

    it('should show the 10 newest shipped releases when more than 10 exist', () => {
      // Add 15 shipped releases (v0.1.0 through v0.15.0)
      for (let i = 1; i <= 15; i++) {
        const version = `v0.${i.toString().padStart(2, '0')}.0` // v0.01.0, v0.02.0, etc for proper sorting
        mockReleases.push({ version, status: 'shipped', issues: [] } as Release)
      }

      render(<ReleaseList />)

      const archiveSection = screen.getByText('Archive').parentElement
      const versionElements = archiveSection!.querySelectorAll('.font-medium')
      const versions = Array.from(versionElements).map((el) => el.textContent)

      // Should have newest 10 (v0.15.0 down to v0.06.0) in descending order
      expect(versions[0]).toBe('v0.15.0')
      expect(versions[9]).toBe('v0.06.0')
      expect(versions.length).toBe(10)
    })

    it('should sort using semantic versioning (v1.12 > v1.7)', () => {
      // Add releases in random order to test semantic sorting
      mockReleases.push(
        { version: 'v1.7.0', status: 'shipped', issues: [] } as Release,
        { version: 'v1.12.0', status: 'shipped', issues: [] } as Release,
        { version: 'v1.2.0', status: 'shipped', issues: [] } as Release,
        { version: 'v1.10.0', status: 'shipped', issues: [] } as Release,
        { version: 'v2.0.0', status: 'active', issues: [] } as Release
      )

      render(<ReleaseList />)

      const archiveSection = screen.getByText('Archive').parentElement
      const versionElements = archiveSection!.querySelectorAll('.font-medium')
      const versions = Array.from(versionElements).map((el) => el.textContent)

      // Should be sorted by semantic version descending: v1.12.0, v1.10.0, v1.7.0, v1.2.0
      expect(versions).toEqual(['v1.12.0', 'v1.10.0', 'v1.7.0', 'v1.2.0'])
    })

    it('should sort major versions correctly', () => {
      mockReleases.push(
        { version: 'v1.0.0', status: 'shipped', issues: [] } as Release,
        { version: 'v10.0.0', status: 'shipped', issues: [] } as Release,
        { version: 'v2.0.0', status: 'shipped', issues: [] } as Release,
        { version: 'v11.0.0', status: 'shipped', issues: [] } as Release
      )

      render(<ReleaseList />)

      const archiveSection = screen.getByText('Archive').parentElement
      const versionElements = archiveSection!.querySelectorAll('.font-medium')
      const versions = Array.from(versionElements).map((el) => el.textContent)

      // Should be sorted by semantic version descending
      expect(versions).toEqual(['v11.0.0', 'v10.0.0', 'v2.0.0', 'v1.0.0'])
    })
  })
})
