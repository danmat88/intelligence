import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import type { ArchiveExam } from '../archive/catalog'
import { NATIVE_OFFICIAL_PAPERS, type NativeOfficialPaper } from '../archive/content'
import type { OfficialPaperMode } from '../archive/store'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import SegmentedControl from '../components/ui/SegmentedControl'
import EmptyState from '../components/ui/EmptyState'
import Txt from '../components/ui/Txt'
import { useProduct } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'

type Props = {
  onOpenSettings: () => void
  onOpenPaper: (item: NativeOfficialPaper, mode: OfficialPaperMode) => void
}

export default function SubjectsScreen({ onOpenSettings, onOpenPaper }: Props) {
  const { theme } = useTheme()
  const { goal, bacProfile } = useProduct()
  const c = theme.colors
  const [exam, setExam] = useState<ArchiveExam>(goal === 'bac' ? 'bac' : 'en')
  const papers = useMemo(
    () => NATIVE_OFFICIAL_PAPERS.filter(
      (paper) => paper.exam === exam && (exam !== 'bac' || paper.profile === bacProfile),
    ),
    [bacProfile, exam],
  )
  const years = useMemo(
    () => [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a),
    [papers],
  )

  useEffect(() => {
    if (goal === 'en' || goal === 'bac') setExam(goal)
  }, [goal])

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <ScreenContent>
        <ScreenHeading
          eyebrow="ARHIVĂ"
          title="Subiecte oficiale"
          description="Alegi modul și lucrezi varianta direct în aplicație."
          style={styles.intro}
        />
        <SegmentedControl
          value={exam}
          accessibilityLabel="Examen"
          segments={[
            { value: 'en', label: 'Evaluare Națională' },
            { value: 'bac', label: 'Bacalaureat' },
          ]}
          onChange={setExam}
        />

        {exam === 'bac' && (
          <Press
            onPress={onOpenSettings}
            pressDepth={2.5}
            style={[styles.profile, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}
          >
            <View style={[styles.profileIcon, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
              <RezIcon name="exam-bac" size={24} color={c.text} accent={c.accent} />
            </View>
            <View style={styles.profileCopy}>
              <Txt size={11} weight="bold" color={c.textMuted}>Programa curentă</Txt>
              <Txt weight="bold" size={14.5} color={c.text}>{bacProfile}</Txt>
            </View>
            <Txt weight="bold" size={12} color={c.bubblyRedDark}>Schimbă</Txt>
          </Press>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {papers.length === 0 ? (
            <EmptyState
              icon="workspace"
              title={exam === 'bac' ? 'Nu există încă variante BAC în aplicație' : 'Nu există variante pentru selecția curentă'}
              message={exam === 'bac'
                ? 'Arhiva disponibilă acum este cea pentru Evaluarea Națională.'
                : 'Schimbă examenul sau programa pentru a vedea conținutul disponibil.'}
              action={exam === 'bac'
                ? { title: 'Vezi Evaluarea Națională', icon: 'exam-en', onPress: () => setExam('en') }
                : undefined}
            />
          ) : (
            years.map((year) => (
              <View key={year} style={styles.yearGroup}>
                <View style={styles.yearRow}>
                  <View style={[styles.yearBadge, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
                    <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>
                      {year}
                    </Txt>
                  </View>
                  <View style={[styles.yearLine, { backgroundColor: c.border }]} />
                </View>
                {papers.filter((paper) => paper.year === year).map((paper) => (
                  <PaperCard key={paper.id} paper={paper} onOpen={onOpenPaper} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </ScreenContent>
    </ScreenBackground>
  )
}

function PaperCard({
  paper,
  onOpen,
}: {
  paper: NativeOfficialPaper
  onOpen: (paper: NativeOfficialPaper, mode: OfficialPaperMode) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const exerciseCount = paper.sections.reduce((total, section) => total + section.exercises.length, 0)
  return (
    <View style={[styles.paper, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}>
      <View style={styles.paperHead}>
        <View style={[styles.paperIcon, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}>
          <RezIcon name="document" size={28} color={c.text} accent={c.text} />
        </View>
        <View style={styles.paperCopy}>
          <Txt weight="bold" size={16} color={c.text}>{paper.session}</Txt>
          <Txt size={12} color={c.textMuted} style={styles.paperMeta}>
            {exerciseCount} exerciții  ·  {paper.durationMinutes} min  ·  100 puncte
          </Txt>
        </View>
        <View style={[styles.official, { backgroundColor: c.bubblyGreen, borderColor: c.border, borderBottomColor: c.border }]}>
          <RezIcon name="verified" size={16} color="#FFFFFF" />
          <Txt weight="extrabold" size={10.5} color="#FFFFFF">OFICIAL</Txt>
        </View>
      </View>
      <View style={[styles.modes, { borderTopColor: c.border }]}>
        <ModeButton icon="teacher" label="Ghidat" sub="Cu ajutor" featured onPress={() => onOpen(paper, 'guided')} />
        <ModeButton icon="simulate" label="Simulare" sub="Cronometrat" onPress={() => onOpen(paper, 'simulation')} />
        <ModeButton icon="learn" label="Studiază" sub="Doar citești" onPress={() => onOpen(paper, 'study')} />
      </View>
    </View>
  )
}

function ModeButton({
  icon,
  label,
  sub,
  featured,
  onPress,
}: {
  icon: 'learn' | 'teacher' | 'simulate'
  label: string
  sub: string
  featured?: boolean
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Press
      onPress={onPress}
      pressDepth={3}
      containerStyle={styles.modeSlot}
      style={[
        styles.modeButton,
        featured
          ? { backgroundColor: c.accent, borderColor: c.border, borderBottomColor: c.border }
          : { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border },
      ]}
    >
      <RezIcon name={icon} size={22} color={featured ? '#FFFFFF' : c.text} accent={featured ? '#FFFFFF' : c.text} />
      <Txt weight="extrabold" size={14} color={featured ? '#FFFFFF' : c.text} style={{ fontFamily: theme.font.display }}>{label}</Txt>
      <Txt size={11} color={featured ? 'rgba(255,255,255,0.8)' : c.textMuted} weight="bold">{sub}</Txt>
    </Press>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { paddingBottom: 10, paddingTop: 2 },

  // Profile pill — full-width card
  profile: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileIcon: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  profileCopy: { flex: 1, gap: 1 },

  // Year groups
  list: { flexGrow: 1, paddingBottom: 24 },
  yearGroup: { gap: 12, marginTop: 16 },
  yearRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  yearBadge: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 3,
    borderBottomWidth: 6,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  yearLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },

  // Paper card
  paper: {
    borderRadius: 28,
    borderWidth: 3,
    borderBottomWidth: 10,
    overflow: 'hidden',
  },
  paperHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  paperIcon: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  paperCopy: { flex: 1, gap: 3 },
  paperMeta: { lineHeight: 16 },
  official: {
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 3,
    borderBottomWidth: 6,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // Mode buttons
  modes: {
    borderTopWidth: 3,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  modeSlot: { flex: 1 },
  modeButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 8,
    gap: 4,
    justifyContent: 'center',
    minHeight: 76,
    paddingVertical: 10,
    width: '100%',
  },
})
