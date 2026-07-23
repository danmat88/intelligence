import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg'

export type RezIconName =
  | 'home'
  | 'solve'
  | 'practice'
  | 'exam-en'
  | 'exam-bac'
  | 'math'
  | 'camera'
  | 'gallery'
  | 'write'
  | 'arrow'
  | 'history'
  | 'plus'
  | 'close'
  | 'user'
  | 'settings'
  | 'check'
  | 'shield'
  | 'document'
  | 'language'
  | 'logout'
  | 'login'
  | 'trash'
  | 'chevron'
  | 'send'
  | 'learn'
  | 'drill'
  | 'simulate'
  | 'search'
  | 'spark'
  | 'premium'
  | 'message'
  | 'offline'
  | 'alert'
  | 'back'
  | 'forward'
  | 'retry'
  | 'camera-off'

type Props = {
  name: RezIconName
  size?: number
  color?: string
  accent?: string
  strokeWidth?: number
}

/**
 * Rezolvo's own compact icon alphabet. The open geometry and single coloured
 * signal are shared across the shell, while every symbol is drawn as vector
 * paths so it remains sharp at accessibility and tablet sizes.
 */
export default function RezIcon({ name, size = 20, color = '#15121F', accent = color, strokeWidth = 1.8 }: Props) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  const signal = { fill: accent }

  const glyph = (() => {
    switch (name) {
      case 'home':
        return (
          <>
            <Path d="M4.2 10.4 12 4l7.8 6.4v8.2a1.4 1.4 0 0 1-1.4 1.4H5.6a1.4 1.4 0 0 1-1.4-1.4Z" {...line} />
            <Path d="M9 20v-5.8h6V20" {...line} />
            <Circle cx="17.8" cy="7.2" r="1.45" {...signal} />
          </>
        )
      case 'solve':
        return (
          <>
            <Path d="M3.2 11.8h3.1l2.15 6.25L12.75 5h7.8" {...line} strokeWidth={2.05} />
            <Path d="m14.2 16.1 2.05 2.05 4.2-4.5" {...line} stroke={accent} strokeWidth={2.1} />
            <Rect x="18.35" y="4" width="2.7" height="2.7" rx="0.7" fill={accent} />
          </>
        )
      case 'practice':
        return (
          <>
            <Path d="M3.8 5.4c3.1-.7 5.8.1 8.2 2.2v12c-2.4-2.1-5.1-2.8-8.2-2.1ZM20.2 5.4c-3.1-.7-5.8.1-8.2 2.2v12c2.4-2.1 5.1-2.8 8.2-2.1Z" {...line} />
            <Path d="M7 9.1c1.3 0 2.3.3 3.2.9M17 9.1c-1.3 0-2.3.3-3.2.9" {...line} />
            <Rect x="17.4" y="4.2" width="2.5" height="5.2" rx="0.8" fill={accent} />
          </>
        )
      case 'exam-en':
        return (
          <>
            <Path d="M3.7 5.6c3.2-.8 6 .1 8.3 2.2v11.7c-2.3-2-5.1-2.7-8.3-2ZM20.3 5.6c-3.2-.8-6 .1-8.3 2.2v11.7c2.3-2 5.1-2.7 8.3-2Z" {...line} />
            <Path d="M7 9.6h2.6M14.4 9.6H17M7 12.6h2.6" {...line} />
            <Circle cx="18.5" cy="15.5" r="1.35" {...signal} />
          </>
        )
      case 'exam-bac':
        return (
          <>
            <Path d="m3.1 9.2 8.9-5 8.9 5-8.9 5Z" {...line} />
            <Path d="M6.3 11v5.1c3.8 2.7 7.6 2.7 11.4 0V11M20.9 9.2v6.3" {...line} />
            <Circle cx="20.9" cy="17.6" r="1.35" {...signal} />
          </>
        )
      case 'math':
        return (
          <>
            <Path d="M4 19.5V4.5M3 16.5h17.5" {...line} />
            <Path d="M6.2 15.2c2.2-7.5 6-7.5 8.2 0" {...line} stroke={accent} strokeWidth={2} />
            <Path d="m17.4 4.8 1.5 1.5 2.2-2.4" {...line} stroke={accent} />
          </>
        )
      case 'camera':
        return (
          <>
            <Path d="M4.2 8.4h3.1l1.4-2.2h6.6l1.4 2.2h3.1v9.4a1.7 1.7 0 0 1-1.7 1.7H5.9a1.7 1.7 0 0 1-1.7-1.7Z" {...line} />
            <Circle cx="12" cy="13.4" r="3.1" {...line} />
            <Circle cx="18" cy="10" r="1.15" {...signal} />
          </>
        )
      case 'gallery':
        return (
          <>
            <Rect x="3.8" y="4.2" width="16.4" height="15.6" rx="2.3" {...line} />
            <Path d="m5.8 17 4.2-4.4 2.8 2.7 2.1-2 3.3 3.7" {...line} />
            <Circle cx="15.8" cy="8.5" r="1.6" fill={accent} />
          </>
        )
      case 'write':
        return (
          <>
            <Path d="M5.1 18.9 6 14.8 15.9 5a2 2 0 0 1 2.9 0l.2.2a2 2 0 0 1 0 2.9L9.2 18Z" {...line} />
            <Path d="m14.4 6.5 3.1 3.1M6 14.8 9.2 18" {...line} />
            <Circle cx="5.2" cy="19" r="1.2" {...signal} />
          </>
        )
      case 'arrow':
        return <Path d="M6.2 17.8 17.8 6.2M9 6.2h8.8V15" {...line} />
      case 'history':
        return (
          <>
            <Path d="M5.2 7.8A8 8 0 1 1 4.4 15M5.2 7.8V3.9M5.2 7.8h3.9M12 7.3v5l3.3 1.9" {...line} />
            <Circle cx="4.4" cy="15" r="1.2" {...signal} />
          </>
        )
      case 'plus':
        return <Path d="M12 5v14M5 12h14" {...line} />
      case 'close':
        return <Path d="m6.5 6.5 11 11m0-11-11 11" {...line} />
      case 'user':
        return (
          <>
            <Circle cx="12" cy="8.1" r="3.5" {...line} />
            <Path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" {...line} />
            <Circle cx="18.2" cy="5.6" r="1.3" {...signal} />
          </>
        )
      case 'settings':
        return (
          <>
            <Circle cx="12" cy="12" r="3.2" {...line} />
            <Path d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" {...line} />
            <Circle cx="12" cy="12" r="1.15" {...signal} />
          </>
        )
      case 'check':
        return <Path d="m5.2 12.2 4.2 4.2L19 6.8" {...line} stroke={accent} strokeWidth={2.2} />
      case 'shield':
        return (
          <>
            <Path d="M12 3.6c2.4 1.7 4.7 2.2 7 2.4v5.1c0 4.5-2.2 7.6-7 9.3-4.8-1.7-7-4.8-7-9.3V6c2.3-.2 4.6-.7 7-2.4Z" {...line} />
            <Path d="m8.7 12 2.2 2.2 4.5-4.7" {...line} stroke={accent} />
          </>
        )
      case 'document':
        return (
          <>
            <Path d="M6 3.8h8l4 4v12.4H6Z" {...line} />
            <Path d="M14 3.8v4h4M9 12h6M9 15.5h4.2" {...line} />
            <Circle cx="8" cy="8.2" r="1.2" {...signal} />
          </>
        )
      case 'language':
        return (
          <>
            <Circle cx="12" cy="12" r="8.2" {...line} />
            <Path d="M4.3 12h15.4M12 3.8c2.3 2.2 3.4 4.9 3.4 8.2s-1.1 6-3.4 8.2c-2.3-2.2-3.4-4.9-3.4-8.2s1.1-6 3.4-8.2Z" {...line} />
            <Circle cx="17.8" cy="6.2" r="1.25" {...signal} />
          </>
        )
      case 'logout':
      case 'login': {
        const incoming = name === 'login'
        return (
          <>
            <Path d="M10 4.2H5.2v15.6H10M13.2 8.2l3.8 3.8-3.8 3.8M7.8 12H17" {...line} transform={incoming ? 'rotate(180 12 12)' : undefined} />
            <Circle cx={incoming ? '18.8' : '5.2'} cy="19.2" r="1.15" {...signal} />
          </>
        )
      }
      case 'trash':
        return (
          <>
            <Path d="M5.3 7.3h13.4M9 7.3V4.5h6v2.8M7.1 7.3l.8 12.2h8.2l.8-12.2M10.2 10.5v5.8M13.8 10.5v5.8" {...line} />
            <Circle cx="18.4" cy="5.1" r="1.2" {...signal} />
          </>
        )
      case 'chevron':
        return <Polyline points="9,5.8 15.2,12 9,18.2" {...line} />
      case 'send':
        return (
          <>
            <Path d="m4 5 16 7-16 7 2.4-7Z" {...line} />
            <Line x1="6.4" y1="12" x2="15.5" y2="12" {...line} stroke={accent} />
          </>
        )
      case 'learn':
        return (
          <>
            <Path d="M8.2 15.8c-1.4-1.2-2.2-2.9-2.2-4.9a6 6 0 1 1 9.8 4.7c-.9.7-1.3 1.4-1.4 2.3H9.6c-.1-.8-.5-1.5-1.4-2.1ZM9.7 21h4.6" {...line} />
            <Path d="m9.4 11.3 1.8 1.8 3.5-3.7" {...line} stroke={accent} />
          </>
        )
      case 'drill':
        return (
          <>
            <Circle cx="11" cy="13" r="7.2" {...line} />
            <Circle cx="11" cy="13" r="3.2" {...line} />
            <Path d="m13.4 10.6 5.8-5.8M16.1 4.8h3.1v3.1" {...line} stroke={accent} />
          </>
        )
      case 'simulate':
        return (
          <>
            <Circle cx="12" cy="13" r="7.4" {...line} />
            <Path d="M9.2 3.3h5.6M12 5.6V3.3M12 9v4.5l3 1.8" {...line} />
            <Circle cx="18.2" cy="7.2" r="1.25" {...signal} />
          </>
        )
      case 'search':
        return (
          <>
            <Circle cx="10.6" cy="10.6" r="6.2" {...line} />
            <Path d="m15.2 15.2 4.5 4.5" {...line} />
            <Circle cx="14.8" cy="6.2" r="1.15" {...signal} />
          </>
        )
      case 'spark':
        return (
          <>
            <Path d="M12 3.4c.8 4.8 2.1 6.1 6.9 6.9-4.8.8-6.1 2.1-6.9 6.9-.8-4.8-2.1-6.1-6.9-6.9 4.8-.8 6.1-2.1 6.9-6.9Z" {...line} stroke={accent} />
            <Circle cx="18.7" cy="18.2" r="1.35" {...signal} />
          </>
        )
      case 'premium':
        return (
          <>
            <Path d="m13.4 2.8-7 10.1h5L10.6 21l7-10.2h-5Z" {...line} stroke={accent} />
            <Circle cx="18.5" cy="5.3" r="1.2" {...signal} />
          </>
        )
      case 'message':
        return (
          <>
            <Path d="M4.1 5.2h15.8v11.2H9.2L4.1 20Z" {...line} />
            <Path d="M8.1 9.1h7.8M8.1 12.5h4.8" {...line} />
            <Circle cx="18.3" cy="6.1" r="1.2" {...signal} />
          </>
        )
      case 'offline':
        return (
          <>
            <Path d="M4 9.3a12.8 12.8 0 0 1 4.2-2.1M12.4 6.4A13 13 0 0 1 20 9.3M6.7 13a8 8 0 0 1 5.3-1.9c1 0 2 .2 2.9.5M9.5 16.3a3.8 3.8 0 0 1 4.2-.4" {...line} />
            <Circle cx="12" cy="19.2" r="1.2" {...signal} />
            <Path d="m4.2 4.2 15.6 15.6" {...line} stroke={accent} />
          </>
        )
      case 'alert':
        return (
          <>
            <Path d="M12 3.8 21 20H3Z" {...line} />
            <Path d="M12 9v5" {...line} stroke={accent} strokeWidth={2.1} />
            <Circle cx="12" cy="17" r="1.1" {...signal} />
          </>
        )
      case 'back':
        return <Path d="m10.2 5.8-6.1 6.2 6.1 6.2M4.5 12h15.4" {...line} />
      case 'forward':
        return <Path d="m13.8 5.8 6.1 6.2-6.1 6.2M19.5 12H4.1" {...line} />
      case 'retry':
        return (
          <>
            <Path d="M5.6 8.1A7.7 7.7 0 1 1 4.7 15M5.6 8.1V4.2M5.6 8.1h3.9" {...line} />
            <Circle cx="4.7" cy="15" r="1.15" {...signal} />
          </>
        )
      case 'camera-off':
        return (
          <>
            <Path d="M7 8.4h.3l1.4-2.2h6.6l1.4 2.2h3.1v8.8M17.2 19.5H5.9a1.7 1.7 0 0 1-1.7-1.7V9.2" {...line} />
            <Path d="M9.2 12.2a3.1 3.1 0 0 0 4.5 4M4.2 4.2l15.6 15.6" {...line} stroke={accent} />
          </>
        )
    }
  })()

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {glyph}
    </Svg>
  )
}
