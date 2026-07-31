import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg'
import type { OfficialFigureSpec } from '../../archive/content'
import Txt from '../../components/ui/Txt'
import { useTheme } from '../../theme/ThemeProvider'

export default function OfficialFigure({
  figure,
  description,
}: {
  figure: OfficialFigureSpec
  description: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={description}
      style={[styles.frame, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      {figure.kind === 'bar-chart'
        ? <BarChart figure={figure} />
        : <Segment figure={figure} />}
      <Txt size={10.5} color={c.textMuted} style={styles.caption}>{description}</Txt>
    </View>
  )
}

function BarChart({ figure }: { figure: Extract<OfficialFigureSpec, { kind: 'bar-chart' }> }) {
  const { theme } = useTheme()
  const c = theme.colors
  const max = Math.max(...figure.values, 1)
  const chartTop = 18
  const baseline = 112
  const barWidth = 38
  const gap = 22
  return (
    <Svg width="100%" height={145} viewBox="0 0 280 145">
      <Line x1={20} y1={baseline} x2={264} y2={baseline} stroke={c.text} strokeWidth={2} />
      {figure.values.map((value, index) => {
        const height = ((baseline - chartTop) * value) / max
        const x = 30 + index * (barWidth + gap)
        const highlighted = index === figure.highlightIndex
        return (
          <G key={`${figure.labels[index]}-${index}`}>
            <Rect
              x={x}
              y={baseline - height}
              width={barWidth}
              height={height}
              rx={7}
              fill={highlighted ? c.accent : c.sunny}
              stroke={c.text}
              strokeWidth={1.5}
            />
            <SvgText
              x={x + barWidth / 2}
              y={134}
              fill={c.text}
              fontSize={11}
              fontWeight="700"
              textAnchor="middle"
            >
              {figure.labels[index]}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

function Segment({ figure }: { figure: Extract<OfficialFigureSpec, { kind: 'segment' }> }) {
  const { theme } = useTheme()
  const c = theme.colors
  const left = 28
  const right = 252
  const y = 72
  const pointX = (position: number) => left + (right - left) * position
  const byLabel = new Map(figure.points.map((point) => [point.label, pointX(point.position)]))
  return (
    <Svg width="100%" height={130} viewBox="0 0 280 130">
      <Line x1={left} y1={y} x2={right} y2={y} stroke={c.text} strokeWidth={3} strokeLinecap="round" />
      {figure.points.map((point) => (
        <G key={point.label}>
          <Circle cx={pointX(point.position)} cy={y} r={5} fill={c.accent} stroke={c.text} strokeWidth={1.5} />
          <SvgText x={pointX(point.position)} y={98} fill={c.text} fontSize={13} fontWeight="700" textAnchor="middle">
            {point.label}
          </SvgText>
        </G>
      ))}
      {figure.measures?.map((measure, index) => {
        const x1 = byLabel.get(measure.from) ?? left
        const x2 = byLabel.get(measure.to) ?? right
        const measureY = 40 - index * 22
        return (
          <G key={`${measure.from}-${measure.to}`}>
            <Line x1={x1} y1={measureY} x2={x2} y2={measureY} stroke={c.chalk} strokeWidth={1.5} />
            <Line x1={x1} y1={measureY - 4} x2={x1} y2={measureY + 4} stroke={c.chalk} strokeWidth={1.5} />
            <Line x1={x2} y1={measureY - 4} x2={x2} y2={measureY + 4} stroke={c.chalk} strokeWidth={1.5} />
            <SvgText x={(x1 + x2) / 2} y={measureY - 4} fill={c.chalk} fontSize={10.5} fontWeight="700" textAnchor="middle">
              {measure.label}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

const styles = StyleSheet.create({
  frame: { borderRadius: 18, borderWidth: 1.5, marginTop: 15, overflow: 'hidden', paddingHorizontal: 10, paddingTop: 8 },
  caption: { lineHeight: 15, paddingBottom: 10, textAlign: 'center' },
})
