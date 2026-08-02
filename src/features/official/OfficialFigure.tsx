import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Ellipse, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg'
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
        : figure.kind === 'segment'
          ? <Segment figure={figure} />
          : <Sketch figure={figure} />}
      <Txt size={10.5} color={c.textMuted} style={styles.caption}>{description}</Txt>
    </View>
  )
}

function BarChart({ figure }: { figure: Extract<OfficialFigureSpec, { kind: 'bar-chart' }> }) {
  const { theme } = useTheme()
  const c = theme.colors
  const max = Math.max(...figure.values, 1)
  const chartTop = 18
  const baseline = 122
  const left = 28
  const right = 348
  const gap = Math.max(5, 14 - figure.values.length)
  const barWidth = (right - left - gap * Math.max(0, figure.values.length - 1)) / figure.values.length
  return (
    <Svg width="100%" height={160} viewBox="0 0 376 160">
      <Line x1={18} y1={baseline} x2={358} y2={baseline} stroke={c.text} strokeWidth={2} />
      {figure.values.map((value, index) => {
        const height = ((baseline - chartTop) * value) / max
        const x = left + index * (barWidth + gap)
        const highlighted = index === figure.highlightIndex
        const label = figure.labels[index]
          .replace(/^Nota\s+/i, '')
          .replace(/\s+de puncte$/i, '')
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
              y={143}
              fill={c.text}
              fontSize={10}
              fontWeight="700"
              textAnchor="middle"
            >
              {label}
            </SvgText>
            <SvgText
              x={x + barWidth / 2}
              y={Math.max(13, baseline - height - 5)}
              fill={c.text}
              fontSize={9}
              fontWeight="700"
              textAnchor="middle"
            >
              {value}
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
  const positions = figure.points.map((point) => point.position)
  const min = Math.min(...positions)
  const max = Math.max(...positions)
  const span = Math.max(max - min, 1)
  const pointX = (position: number) => left + (right - left) * ((position - min) / span)
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

function Sketch({ figure }: { figure: Extract<OfficialFigureSpec, { kind: 'sketch' }> }) {
  const { theme } = useTheme()
  const c = theme.colors
  const byId = new Map(figure.points.map((point) => [point.id, point]))
  const pointList = (ids: string[]) => ids
    .map((id) => byId.get(id))
    .filter((point): point is NonNullable<typeof point> => Boolean(point))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  return (
    <Svg width="100%" height={210} viewBox="0 0 280 190">
      {figure.circles?.map((circle, index) => {
        const center = byId.get(circle.center)
        if (!center) return null
        return (
          <Circle
            key={`circle-${index}`}
            cx={center.x}
            cy={center.y}
            r={circle.radius}
            fill="none"
            stroke={c.text}
            strokeWidth={1.8}
            strokeDasharray={circle.dashed ? '6 5' : undefined}
          />
        )
      })}
      {figure.ellipses?.map((ellipse, index) => {
        const center = byId.get(ellipse.center)
        if (!center) return null
        return (
          <Ellipse
            key={`ellipse-${index}`}
            cx={center.x}
            cy={center.y}
            rx={ellipse.radiusX}
            ry={ellipse.radiusY}
            fill="none"
            stroke={c.text}
            strokeWidth={1.8}
            strokeDasharray={ellipse.dashed ? '6 5' : undefined}
          />
        )
      })}
      {figure.strokes.map((stroke, index) => (
        <Polyline
          key={`stroke-${index}`}
          points={pointList(stroke.closed ? [...stroke.points, stroke.points[0]] : stroke.points)}
          fill="none"
          stroke={c.text}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={stroke.dashed ? '7 5' : undefined}
        />
      ))}
      {figure.points.map((point) => (
        <G key={point.id}>
          {point.showDot === false ? null : (
            <Circle cx={point.x} cy={point.y} r={3.2} fill={c.accent} stroke={c.text} strokeWidth={1} />
          )}
          {point.label ? (
            <SvgText
              x={point.x + (point.labelDx ?? 7)}
              y={point.y + (point.labelDy ?? -7)}
              fill={c.text}
              fontSize={12}
              fontWeight="700"
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          ) : null}
        </G>
      ))}
    </Svg>
  )
}

const styles = StyleSheet.create({
  frame: { borderRadius: 24, borderWidth: 3, borderBottomWidth: 7, marginTop: 15, overflow: 'hidden', paddingHorizontal: 10, paddingTop: 8 },
  caption: { lineHeight: 15, paddingBottom: 10, textAlign: 'center' },
})
