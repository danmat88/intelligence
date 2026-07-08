import { parseBlocks } from '../Markdown'

describe('parseBlocks', () => {
  it('merges consecutive lines into one paragraph and splits on blank lines', () => {
    expect(parseBlocks('line one\nline two\n\nsecond para')).toEqual([
      { type: 'p', text: 'line one line two' },
      { type: 'p', text: 'second para' },
    ])
  })

  it('parses headings and caps the level at 3', () => {
    expect(parseBlocks('# Title\n##### Deep')).toEqual([
      { type: 'heading', level: 1, text: 'Title' },
      { type: 'heading', level: 3, text: 'Deep' },
    ])
  })

  it('preserves code fence content verbatim and stops at the closing fence', () => {
    const src = '```\nconst a = 1\n  indented\n```\nafter'
    expect(parseBlocks(src)).toEqual([
      { type: 'code', content: 'const a = 1\n  indented' },
      { type: 'p', text: 'after' },
    ])
  })

  it('collects bullet list items and strips their markers', () => {
    expect(parseBlocks('- one\n* two\n+ three')).toEqual([{ type: 'ul', items: ['one', 'two', 'three'] }])
  })

  it('collects numbered list items in order', () => {
    expect(parseBlocks('1. first\n2. second')).toEqual([{ type: 'ol', items: ['first', 'second'] }])
  })

  it('joins multi-line quotes', () => {
    expect(parseBlocks('> a\n> b')).toEqual([{ type: 'quote', text: 'a b' }])
  })

  it('normalizes Windows line endings', () => {
    expect(parseBlocks('a\r\n\r\nb')).toEqual([
      { type: 'p', text: 'a' },
      { type: 'p', text: 'b' },
    ])
  })

  it('survives an unclosed code fence (streaming mid-reply)', () => {
    expect(parseBlocks('```\npartial code')).toEqual([{ type: 'code', content: 'partial code' }])
  })
})
