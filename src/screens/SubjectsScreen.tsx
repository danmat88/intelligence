import { useContext, useMemo } from 'react'
import { Linking, SectionList, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  NATIVE_OFFICIAL_PAPERS,
  OFFICIAL_SOURCE_PACKAGES,
  type NativeOfficialPaper,
  type OfficialSourcePackage,
} from '../archive/content'
import type { OfficialPaperMode } from '../archive/store'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import EmptyState from '../components/ui/EmptyState'
import Entrance from '../components/ui/Entrance'
import Txt from '../components/ui/Txt'
import { useProduct } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'
import { BAC_TRACK_LABELS } from '../product/profile'
import type { RootStackParamList } from '../navigation/types'
import { GoalSheetContext } from '../navigation/GoalSheetContext'

export default function SubjectsScreen() {
  const { theme } = useTheme()
  const { examGoal, bacTrack } = useProduct()
  const c = theme.colors
  const exam = examGoal === 'bac' ? 'bac' : 'en'
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const onChangeGoal = useContext(GoalSheetContext)

  const papers = useMemo(
    () => NATIVE_OFFICIAL_PAPERS.filter(
      (paper) => paper.exam === exam && (exam !== 'bac' || paper.profile === bacTrack),
    ),
    [bacTrack, exam],
  )
  const sources = useMemo(
    () => OFFICIAL_SOURCE_PACKAGES.filter(
      (source) => source.exam === exam && (exam !== 'bac' || source.profile === bacTrack),
    ),
    [bacTrack, exam],
  )
  
  const sections = useMemo(() => {
    const years = [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a)
    return years.map((year) => ({
      title: year,
      data: papers.filter((paper) => paper.year === year),
    }))
  }, [papers])

  const onOpenPaper = (item: NativeOfficialPaper, mode: OfficialPaperMode) => {
    navigation.navigate('SubiectOficial', { item, mode })
  }
  const onSolve = () => navigation.navigate('Rezolva')

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Entrance delay={0}>
        <ScreenHeading
          eyebrow="ARHIVĂ"
          title="Subiecte oficiale"
          description="Fiecare variantă este legată de sursa Ministerului și de baremul ei."
          style={styles.intro}
        />
      </Entrance>
      {exam === 'bac' && (
        <Entrance delay={45}>
          <Press
            onPress={onChangeGoal}
            pressDepth={2.5}
            style={[styles.profile, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}
          >
            <View style={[styles.profileIcon, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
              <RezIcon name="exam-bac" size={24} color={c.text} accent={c.accent} />
            </View>
            <View style={styles.profileCopy}>
              <Txt size={11} weight="bold" color={c.textMuted}>Programa curentă</Txt>
              <Txt weight="bold" size={14.5} color={c.text}>{BAC_TRACK_LABELS[bacTrack ?? 'mate_info']}</Txt>
            </View>
            <Txt weight="bold" size={12} color={c.bubblyRedDark}>Schimbă</Txt>
          </Press>
        </Entrance>
      )}
    </View>
  )

  const renderEmpty = () => (
    <Entrance delay={90}>
      <View style={styles.sourceOnly}>
        <EmptyState
          icon="verified"
          title="Documentele oficiale sunt disponibile"
          message="Deschide arhiva exactă a Ministerului. Pentru ajutor la o cerință, revino și trimite fotografia prin Rezolvă."
        />
        {sources.map((source) => <SourceCard key={source.id} source={source} onSolve={onSolve} />)}
      </View>
    </Entrance>
  )

  return (
    <View style={styles.flex}>
      <ScreenContent>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          renderSectionHeader={({ section: { title } }) => (
            <Entrance delay={90}>
              <View style={styles.yearRow}>
                <View style={[styles.yearBadge, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
                  <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>
                    {title}
                  </Txt>
                </View>
                <View style={[styles.yearLine, { backgroundColor: c.border }]} />
              </View>
            </Entrance>
          )}
          renderItem={({ item, index }) => (
            <Entrance delay={90 + (index % 10) * 45}>
              <View style={styles.itemWrapper}>
                <PaperCard paper={item} onOpen={onOpenPaper} />
              </View>
            </Entrance>
          )}
          stickySectionHeadersEnabled={false}
        />
      </ScreenContent>
    </View>
  )
}

function SourceCard({ source, onSolve }: { source: OfficialSourcePackage; onSolve: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={[styles.sourceCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}>
      <View style={styles.sourceCopy}>
        <View style={[styles.sourceIcon, { backgroundColor: c.bubblyGreen, borderColor: c.border }]}>
          <RezIcon name="verified" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <Txt weight="bold" size={14.5} color={c.text}>{source.session} · {source.year}</Txt>
          <Txt size={11.5} color={c.textMuted}>Subiect și barem originale · amprente verificate</Txt>
        </View>
      </View>
      <Press
        onPress={() => void Linking.openURL(source.sourceUrl)}
        pressDepth={3}
        style={[styles.sourceButton, { backgroundColor: c.chalkDark, borderColor: c.border, borderBottomColor: c.border }]}
      >
        <RezIcon name="download" size={17} color="#FFFFFF" />
        <Txt weight="bold" size={13} color="#FFFFFF">Deschide sursa Ministerului</Txt>
      </Press>
      <Press onPress={onSolve} style={styles.solveSourceButton}>
        <RezIcon name="solve" size={17} color={c.accent} accent={c.accent} />
        <Txt weight="bold" size={13} color={c.accent}>Rezolvă o cerință din document</Txt>
      </Press>
    </View>
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
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 7,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileIcon: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  profileCopy: { flex: 1, gap: 1 },

  // List additions
  headerContainer: {
    paddingBottom: 16,
  },
  itemWrapper: {
    marginBottom: 12,
  },

  // Year groups
  list: { flexGrow: 1, paddingBottom: 24 },
  sourceOnly: { gap: 14, paddingTop: 12 },
  sourceCard: {
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 7,
    gap: 14,
    padding: 16,
  },
  sourceCopy: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  sourceIcon: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sourceButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 3,
    borderBottomWidth: 6,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  solveSourceButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 42,
  },
  yearGroup: { gap: 12, marginTop: 16 },
  yearRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  yearBadge: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
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
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
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
    borderRadius: 18,
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
    borderWidth: 2,
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
    borderBottomWidth: 6,
    gap: 4,
    justifyContent: 'center',
    minHeight: 76,
    paddingVertical: 10,
    width: '100%',
  },
})
