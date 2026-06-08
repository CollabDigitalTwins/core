import { formatName, formatDate, stripHtml } from './utils'

describe('formatName', () => {
  it('returns empty string for empty input', () => {
    expect(formatName('')).toBe('')
  })

  it('capitalises only the first letter when the input already has spaces', () => {
    expect(formatName('hello world')).toBe('Hello world')
  })

  it('converts a slug to a title (underscores and hyphens)', () => {
    expect(formatName('open_data_portal')).toBe('Open Data Portal')
    expect(formatName('open-data-portal')).toBe('Open Data Portal')
    expect(formatName('open__data--portal')).toBe('Open Data Portal')
  })
})

describe('formatDate', () => {
  it('formats an ISO date to YYYY-MM-DD', () => {
    expect(formatDate('2024-03-15T12:30:00Z')).toBe('2024-03-15')
  })

  it('returns the original string when parsing fails', () => {
    // Date constructor returns Invalid Date; toISOString throws → caught → original returned.
    expect(formatDate('not-a-real-date')).toBe('not-a-real-date')
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('trims surrounding whitespace', () => {
    expect(stripHtml('  <span>x</span>  ')).toBe('x')
  })

  it('returns empty string for null-ish input', () => {
    expect(stripHtml(undefined as unknown as string)).toBe('')
    expect(stripHtml('')).toBe('')
  })
})
