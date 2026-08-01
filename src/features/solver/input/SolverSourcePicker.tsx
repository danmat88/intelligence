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
            { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
            <RezIcon name="document" size={19} color={c.text} accent={c.accent} />
          </View>
          <View style={styles.copy}>
            <Txt numberOfLines={1} weight="extrabold" size={14.5} color={c.text} style={{ fontFamily: theme.font.display }}>
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
          style={[styles.primary, { backgroundColor: c.chalk, borderColor: c.border, borderBottomColor: c.border }]}
        >
          <View style={[styles.icon, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
            <RezIcon name="camera" size={28} color={c.text} accent={c.text} />
          </View>
          <View style={styles.copy}>
            <Txt weight="extrabold" size={18} color="#FFFFFF" style={{ fontFamily: theme.font.display, letterSpacing: 0.5 }}>FOTOGRAFIAZĂ</Txt>
            <Txt size={13} color="rgba(255,255,255,0.9)" weight="bold">Încadrează enunțul complet</Txt>
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
      style={[styles.secondary, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
    >
      <View style={[styles.icon, { backgroundColor: background, borderColor: c.border, borderBottomColor: c.border }]}>
        <RezIcon name={icon} size={26} color={c.text} accent={c.text} />
      </View>
      <Txt weight="extrabold" size={14} color={c.text} style={{ fontFamily: theme.font.display }}>{title}</Txt>
      <Txt size={11.5} color={c.textMuted} weight="bold">{detail}</Txt>
    </Press>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 1, minWidth: 0 },
  continueCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 6,
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    minHeight: 64,
    padding: 10,
    paddingRight: 14,
  },
  toolIcon: { alignItems: 'center', borderRadius: 16, borderWidth: 3, borderBottomWidth: 5, height: 48, justifyContent: 'center', width: 48 },
  actions: { gap: 12 },
  primary: {
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 3,
    borderBottomWidth: 10,
    flexDirection: 'row',
    gap: 16,
    minHeight: 96,
    paddingHorizontal: 20,
  },
  secondaryRow: { flexDirection: 'row', gap: 12 },
  secondarySlot: { flex: 1 },
  secondary: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    gap: 6,
    justifyContent: 'center',
    minHeight: 140,
    padding: 14,
  },
  icon: { alignItems: 'center', borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, height: 56, justifyContent: 'center', width: 56 },
})
