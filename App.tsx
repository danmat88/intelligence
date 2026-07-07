import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { ai, AI_CONFIGURED, AI_MODEL } from './src/ai'

/**
 * Foundation demo: prove the Gemini wiring end-to-end. Type a prompt, get a
 * real answer with real latency. This screen is throwaway — it exists to
 * confirm the plumbing before we build the actual app on top of it.
 */
export default function App() {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')
  const [ms, setMs] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ask = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    setAnswer('')
    setMs(null)
    try {
      const r = await ai.generate(prompt.trim(), { maxTokens: 800 })
      setAnswer(r.text)
      setMs(r.ms)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const busy = loading || !prompt.trim()

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>intelligence</Text>
          <Text style={styles.sub}>{AI_MODEL} · ask it anything</Text>

          {!AI_CONFIGURED && (
            <View style={styles.warn}>
              <Text style={styles.warnText}>
                No API key yet. Paste your Gemini key into .env as{' '}
                EXPO_PUBLIC_GEMINI_API_KEY, then restart with{'  '}npm start -c
              </Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Ask Gemini something…"
            placeholderTextColor="#5b6472"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.btn, busy && styles.btnOff]}
            onPress={ask}
            disabled={busy}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#04121a" />
            ) : (
              <Text style={styles.btnText}>Ask Gemini</Text>
            )}
          </TouchableOpacity>

          {ms !== null && <Text style={styles.meta}>answered in {ms} ms</Text>}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {!!answer && (
            <View style={styles.card}>
              <Text style={styles.answer}>{answer}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080b12' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 72, gap: 14 },
  brand: { color: '#eaf2ff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: '#7f8ba0', fontSize: 14, marginBottom: 10 },
  warn: { backgroundColor: '#2a1e08', borderColor: '#a9791f', borderWidth: 1, borderRadius: 12, padding: 12 },
  warnText: { color: '#f0c866', fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: '#0f1420',
    borderColor: '#212a3d',
    borderWidth: 1,
    borderRadius: 14,
    color: '#eaf2ff',
    fontSize: 16,
    padding: 16,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  btn: {
    backgroundColor: '#49e0a6',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnOff: { opacity: 0.4 },
  btnText: { color: '#04121a', fontSize: 16, fontWeight: '700' },
  meta: { color: '#5b6472', fontSize: 12 },
  errorBox: { backgroundColor: '#2a1114', borderColor: '#a2343f', borderWidth: 1, borderRadius: 12, padding: 14 },
  errorText: { color: '#ff98a3', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: '#0f1420', borderColor: '#212a3d', borderWidth: 1, borderRadius: 14, padding: 18 },
  answer: { color: '#dbe6f5', fontSize: 16, lineHeight: 24 },
})
