import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChangeSummary } from '../ChangeSummary'

describe('ChangeSummary', () => {
  it('should render additions and deletions', () => {
    render(<ChangeSummary additions={10} deletions={5} filesChanged={3} />)

    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('-5')).toBeInTheDocument()
  })

  it('should render files changed count', () => {
    render(<ChangeSummary additions={10} deletions={5} filesChanged={3} />)

    expect(screen.getByText(/3 files? changed/i)).toBeInTheDocument()
  })

  it('should use singular "file" for 1 file', () => {
    render(<ChangeSummary additions={1} deletions={0} filesChanged={1} />)

    expect(screen.getByText(/1 file changed/i)).toBeInTheDocument()
  })

  it('should render zero values correctly', () => {
    render(<ChangeSummary additions={0} deletions={0} filesChanged={0} />)

    expect(screen.getByText('+0')).toBeInTheDocument()
    expect(screen.getByText('-0')).toBeInTheDocument()
    expect(screen.getByText(/0 files changed/i)).toBeInTheDocument()
  })

  it('should apply green color to additions', () => {
    render(<ChangeSummary additions={10} deletions={5} filesChanged={3} />)

    const additionsElement = screen.getByText('+10')
    expect(additionsElement).toHaveClass('text-green-500')
  })

  it('should apply red color to deletions', () => {
    render(<ChangeSummary additions={10} deletions={5} filesChanged={3} />)

    const deletionsElement = screen.getByText('-5')
    expect(deletionsElement).toHaveClass('text-red-500')
  })

  it('should accept optional className', () => {
    render(
      <ChangeSummary additions={10} deletions={5} filesChanged={3} className="custom-class" />
    )

    const container = screen.getByTestId('change-summary')
    expect(container).toHaveClass('custom-class')
  })
})
