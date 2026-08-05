import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import EmptyState from '../components/ui/EmptyState'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import Txt from '../components/ui/Txt'
import { setProblemSaved, subscribeProblems, type Problem } from '../solve/store'
import { useTheme } from '../theme/ThemeProvider'

export default function SavedScreen({
  onOpenProblem,
  onSolve,
}: {
  onOpenProblem: (problem: Problem) => void
  onSolve: () => void
}) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const c = theme.colors
  const [items, setItems] = useState<Problem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setItems([])
    setLoaded(false)
    if (!user) return
    return subscribeProblems(user.id, (problems) => {
      setItems(problems.filter((problem) => problem.saved))
      setLoaded(true)
    })
  }, [user?.id])

  return (
    <ScreenBackground>
      <ScreenContent>
        <ScreenHeading
          eyebrow="SALVATE"
          title="Problemele importante"
          description="Aici apar numai problemele pe care alegi să le păstrezi la îndemână."
        />
        {!loaded ? (
          <View style={styles.center}><ActivityIndicator color={c.accent} /></View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title="Nu ai salvat încă nicio problemă"
            message="Salvează o problemă din Istoric sau începe una nouă."
            action={{ title: 'Rezolvă o problemă', icon: 'solve', onPress: onSolve }}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Press
                onPress={() => onOpenProblem(item)}
                pressDepth={3}
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
              >
                <View style={[styles.icon, { backgroundColor: c.sunnySoft }]}>
                  <RezIcon name="bookmark" size={22} color={c.text} accent={c.bubblyRed} />
                </View>
                <View style={styles.copy}>
                  <Txt numberOfLines={2} weight="bold" size={15} color={c.text}>{item.topic || item.title}</Txt>
                  <Txt size={11.5} color={c.textMuted}>
                    {new Date(item.createdAt).toLocaleDateString('ro-RO')}
                  </Txt>
                </View>
                <Press
                  accessibilityLabel="Elimină din salvate"
                  onPress={(event) => {
                    event.stopPropagation()
                    if (user) void setProblemSaved(user.id, item.id, false)
                  }}
                  hitSlop={8}
                  style={styles.remove}
                >
                  <RezIcon name="close" size={17} color={c.textFaint} />
                </Press>
              </Press>
            )}
          />
        )}
      </ScreenContent>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  list: { gap: 10, paddingBottom: 24, paddingTop: 14 },
  card: { alignItems: 'center', borderRadius: 24, borderWidth: 3, borderBottomWidth: 7, flexDirection: 'row', gap: 12, minHeight: 82, padding: 14 },
  icon: { alignItems: 'center', borderRadius: 17, height: 50, justifyContent: 'center', width: 50 },
  copy: { flex: 1, gap: 4 },
  remove: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
})
