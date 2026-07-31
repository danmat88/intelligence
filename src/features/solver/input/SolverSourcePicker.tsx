import { StyleSheet, View } from 'react-native'
import Press from '../../../components/ui/Press'
import RezIcon from '../../../components/ui/RezIcon'
import Txt from '../../../components/ui/Txt'
import { useTheme } from '../../../theme/ThemeProvider'

type Props = {
  hasOpenSolution: boolean
  solving: boolean
  activeTopic?: string
  onContinue: () => void
  onCamera: () => void
  onLibrary: () => void
  onType: () => void
}

export default function SolverSourcePicker({
  hasOpenSolution,
  solving,
  activeTopic,
  onContinue,
  onCamera,
  onLibrary,
  onType,
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <>
      {hasOpenSolution && (
        <Press
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continuă ultima soluție"
          style={[
            styles.continueCard,
            { backgroundColor: c.sunnySoft, borderColor: c.text, shadowColor: c.text },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: c.sunny }]}>
            <RezIcon name="document" size={19} color={c.text} accent={c.accent} />
          </View>
          <View style={styles.copy}>
            <Txt numberOfLines={1} weight="bold" size={13.5} color={c.text}>
              Continuă soluția deschisă
            </Txt>
            <Txt numberOfLines={1} size={10.5} color={c.textMuted}>
              {solving ? 'Rezolvare în curs' : activeTopic || 'Problema curentă'}
            </Txt>
          </View>
          <RezIcon name="forward" size={17} color={c.text} accent={c.accent} />
        </Press>
      )}

      <View style={styles.actions}>
        <Press
          onPress={onCamera}
          accessibilityRole="button"
          accessibilityLabel="Fotografiază problema"
          style={[styles.primary, { backgroundColor: c.chalkDark }]}
        >
          <View style={[styles.icon, { backgroundColor: c.sunny }]}>
            <RezIcon name="camera" size={23} color={c.text} accent={c.accent} />
          </View>
          <View style={styles.copy}>
            <Txt weight="bold" size={15} color="#FFFFFF">Fotografiază</Txt>
            <Txt size={11.5} color="rgba(255,255,255,0.7)">Încadrează enunțul complet</Txt>
          </View>
          <RezIcon name="arrow" size={18} color="#FFFFFF" />
        </Press>

        <View style={styles.secondaryRow}>
          <SourceButton
            icon="gallery"
            title="Galerie"
            detail="Imagine salvată"
            background={c.accentSoft}
            onPress={onLibrary}
          />
          <SourceButton
            icon="write"
            title="Scrie"
            detail="Editor matematic"
            background={c.sunnySoft}
            onPress={onType}
          />
        </View>
      </View>
    </>
  )
}

function SourceButton({
  icon,
  title,
  detail,
  background,
  onPress,
}: {
  icon: 'gallery' | 'write'
  title: string
  detail: string
  background: string
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={icon === 'gallery' ? 'Alege o imagine din galerie' : 'Scrie problema'}
      containerStyle={styles.secondarySlot}
      style={[styles.secondary, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.icon, { backgroundColor: background }]}>
        <RezIcon name={icon} size={22} color={icon === 'gallery' ? c.accent : c.text} accent={c.accent} />
      </View>
      <Txt weight="bold" size={13} color={c.text}>{title}</Txt>
      <Txt size={10.5} color={c.textMuted}>{detail}</Txt>
    </Press>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 1, minWidth: 0 },
  continueCard: {
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    minHeight: 54,
    padding: 7,
    paddingRight: 12,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
  },
  toolIcon: { alignItems: 'center', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  actions: { gap: 9 },
  primary: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
  },
  secondaryRow: { flexDirection: 'row', gap: 9 },
  secondarySlot: { flex: 1 },
  secondary: {
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1.5,
    gap: 3,
    justifyContent: 'center',
    minHeight: 112,
    padding: 10,
  },
  icon: { alignItems: 'center', borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
})
