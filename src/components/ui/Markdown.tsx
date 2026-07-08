import { useMemo, type ReactNode } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/tokens'
import Txt from './Txt'

/**
 * Lightweight, theme-aware Markdown renderer — no dependency, so it hot-reloads.
 * Handles headings, bold/italic, inline code, code blocks, links, and
 * bullet/numbered lists: the formatting Gemini actually returns.
 */
type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; content: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'p'; text: string }

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

/** Exported for tests. */
export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let i = 0
  const flush = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ').trim() })
      para = []
    }
  }
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      flush()
      i++
      const buf: string[] = []
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++])
      i++ // closing fence
      blocks.push({ type: 'code', content: buf.join('\n') })
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      flush()
      blocks.push({ type: 'heading', level: Math.min(h[1].length, 3), text: h[2].trim() })
      i++
      continue
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      flush()
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''))
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flush()
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''))
      blocks.push({ type: 'ol', items })
      continue
    }
    if (/^\s*>\s?/.test(line)) {
      flush()
      const buf: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''))
      blocks.push({ type: 'quote', text: buf.join(' ') })
      continue
    }
    if (line.trim() === '') {
      flush()
      i++
      continue
    }
    para.push(line.trim())
    i++
  }
  flush()
  return blocks
}

const INLINE = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g

function renderInline(str: string, theme: Theme, color: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = new RegExp(INLINE)
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) out.push(str.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) {
      out.push(<Txt key={k++} weight="semibold" color={color}>{tok.slice(2, -2)}</Txt>)
    } else if (tok.startsWith('`')) {
      out.push(<Txt key={k++} color={theme.colors.accent} style={{ fontFamily: MONO }}>{tok.slice(1, -1)}</Txt>)
    } else if (tok.startsWith('[')) {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (mm) out.push(
        <Txt key={k++} color={theme.colors.accent} style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(mm[2])}>
          {mm[1]}
        </Txt>,
      )
    } else {
      out.push(<Txt key={k++} color={color} style={{ fontStyle: 'italic' }}>{tok.slice(1, -1)}</Txt>)
    }
    last = re.lastIndex
  }
  if (last < str.length) out.push(str.slice(last))
  return out
}

export default function Markdown({ text, color }: { text: string; color?: string }) {
  const { theme } = useTheme()
  const c = color ?? theme.colors.text
  // re-parse only when the text actually changes (not on theme/parent renders)
  const blocks = useMemo(() => parseBlocks(text), [text])

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          const size = b.level === 1 ? 21 : b.level === 2 ? 18 : 16
          return (
            <Txt key={i} weight="bold" size={size} color={c} style={{ lineHeight: size + 6 }}>
              {renderInline(b.text, theme, c)}
            </Txt>
          )
        }
        if (b.type === 'code') {
          return (
            <View key={i} style={[styles.code, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Txt size={13.5} color={c} style={{ fontFamily: MONO, lineHeight: 20 }}>
                  {b.content}
                </Txt>
              </ScrollView>
            </View>
          )
        }
        if (b.type === 'ul' || b.type === 'ol') {
          return (
            <View key={i} style={{ gap: 5 }}>
              {b.items.map((item, j) => (
                <View key={j} style={styles.li}>
                  <Txt size={16} color={theme.colors.textMuted} style={styles.bullet}>
                    {b.type === 'ol' ? `${j + 1}.` : '•'}
                  </Txt>
                  <Txt size={16} color={c} style={{ flex: 1, lineHeight: 24 }}>
                    {renderInline(item, theme, c)}
                  </Txt>
                </View>
              ))}
            </View>
          )
        }
        if (b.type === 'quote') {
          return (
            <View key={i} style={[styles.quote, { borderLeftColor: theme.colors.accent }]}>
              <Txt size={16} color={theme.colors.textMuted} style={{ fontStyle: 'italic', lineHeight: 24 }}>
                {renderInline(b.text, theme, theme.colors.textMuted)}
              </Txt>
            </View>
          )
        }
        return (
          <Txt key={i} size={16} color={c} style={{ lineHeight: 24 }}>
            {renderInline(b.text, theme, c)}
          </Txt>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  code: { borderWidth: 1, padding: 14 },
  li: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { minWidth: 18, lineHeight: 24 },
  quote: { borderLeftWidth: 3, paddingLeft: 12 },
})
