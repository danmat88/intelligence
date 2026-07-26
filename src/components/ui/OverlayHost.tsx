import {
  createContext,
  Fragment,
  useContext,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { StyleSheet, View } from 'react-native'

type Entry = {
  id: string
  node: ReactNode
}

class OverlayStore {
  private entries = new Map<string, ReactNode>()
  private listeners = new Set<() => void>()
  private version = 0

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.version

  getEntries = (): Entry[] =>
    Array.from(this.entries, ([id, node]) => ({ id, node }))

  set(id: string, node: ReactNode) {
    this.entries.set(id, node)
    this.emit()
  }

  remove(id: string) {
    if (!this.entries.delete(id)) return
    this.emit()
  }

  private emit() {
    this.version += 1
    this.listeners.forEach((listener) => listener())
  }
}

const OverlayContext = createContext<OverlayStore | null>(null)

/**
 * The single transient-surface layer for the application.
 *
 * Sheets and dialogs are registered here instead of opening a second native
 * Android window. They therefore share the app's edge-to-edge background,
 * system bars, and touch hierarchy.
 */
export function OverlayHostProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<OverlayStore | null>(null)
  if (!storeRef.current) storeRef.current = new OverlayStore()

  return (
    <OverlayContext.Provider value={storeRef.current}>
      <View style={styles.root}>
        {children}
        <OverlayViewport store={storeRef.current} />
      </View>
    </OverlayContext.Provider>
  )
}

function OverlayViewport({ store }: { store: OverlayStore }) {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      {store.getEntries().map(({ id, node }) => (
        <Fragment key={id}>{node}</Fragment>
      ))}
    </View>
  )
}

export function useOverlayHost() {
  const store = useContext(OverlayContext)
  if (!store) {
    throw new Error('Overlay must be rendered inside OverlayHostProvider')
  }
  return store
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: {
    ...StyleSheet.absoluteFillObject,
    elevation: 1000,
    zIndex: 1000,
  },
})
