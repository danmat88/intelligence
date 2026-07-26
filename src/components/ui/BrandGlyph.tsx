import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'

export default function BrandGlyph({
  size = 28,
  quiet = false,
}: {
  size?: number
  quiet?: boolean
}) {
  const ink = quiet ? '#8C73F7' : '#7C5CFF'
  const deep = quiet ? '#6550D8' : '#4E35E8'

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient id="rezolvoGlyph" x1="4" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={ink} />
          <Stop offset="1" stopColor={deep} />
        </LinearGradient>
      </Defs>
      <Path
        d="M4.4 21V9.5c0-4.1 2.9-6.8 7.4-6.8h2.7v4.15a5.5 5.5 0 0 0-3.15-.96c-2.1 0-3.55 1.45-3.55 3.7V21Z"
        fill="url(#rezolvoGlyph)"
      />
      <Path
        d="m7.15 11.05 4.63 5.15 7.72-9.05 2.1 1.82-9.73 11.37-6.8-7.45Z"
        fill="url(#rezolvoGlyph)"
      />
      <Rect x="9.1" y="9.15" width="3.45" height="1.05" rx="0.3" fill={ink} />
      <Rect x="9.1" y="11.05" width="3.45" height="1.05" rx="0.3" fill={ink} />
    </Svg>
  )
}
