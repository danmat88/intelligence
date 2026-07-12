import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'
import { ensureMathAssets, mathAssetsBase } from './mathAssets'

/**
 * Live typeset preview of what the student is typing: they write
 * `(x+1)/(2x-3)` and see a real stacked fraction, before sending. Purely a
 * display surface — FIXED height, no interaction, no keyboard, no height
 * round-trips (the bug class that plagued the solution cards cannot exist
 * here). The LaTeX is injected into a page that is built once.
 */
export default function MathPreview({ latex, label }: { latex: string; label: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  const [assetBase, setAssetBase] = useState<string | null | undefined>(mathAssetsBase ?? undefined)
  useEffect(() => {
    if (assetBase !== undefined) return
    let alive = true
    ensureMathAssets().then((d) => {
      if (alive) setAssetBase(d)
    })
    return () => {
      alive = false
    }
  }, [assetBase])

  const html = useMemo(() => {
    const css = assetBase ? 'katex.css' : 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
    const js = assetBase ? 'katex.js' : 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js'
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${css}">
<style>
html,body{margin:0;padding:0;background:transparent;height:100%;overflow:hidden}
body{display:flex;align-items:center;justify-content:flex-start;padding:0 2px}
#m{font-size:18px;color:${c.text};white-space:nowrap;overflow-x:auto;overflow-y:hidden;width:100%}
#m::-webkit-scrollbar{display:none}
.katex{font-size:1em}
</style></head><body><div id="m"></div>
<script src="${js}"></script>
<script>
window.setLatex=function(v){
  var el=document.getElementById('m');
  try{ el.innerHTML=katex.renderToString(String(v||''),{throwOnError:false,displayMode:false}); }
  catch(e){ el.textContent=String(v||''); }
  el.scrollLeft=el.scrollWidth; // follow the caret end of long expressions
};
</script></body></html>`
  }, [assetBase, c.text])

  const webRef = useRef<WebView>(null)
  const loadedRef = useRef(false)
  const latexRef = useRef(latex)
  latexRef.current = latex
  const push = () => {
    if (!loadedRef.current) return
    webRef.current?.injectJavaScript(`window.setLatex(${JSON.stringify(latexRef.current)}); true;`)
  }
  useEffect(push, [latex])

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.accent }]}>
      <Txt size={8.5} color={c.accent} style={[styles.label, { fontFamily: theme.font.mono }]}>
        {label}
      </Txt>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: assetBase ?? undefined }}
        style={styles.web}
        scrollEnabled={false}
        overScrollMode="never"
        allowFileAccess
        allowFileAccessFromFileURLs
        allowingReadAccessToURL={assetBase ?? undefined}
        javaScriptEnabled
        onLoadEnd={() => {
          loadedRef.current = true
          push()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // FIXED height on purpose: the preview can never shift the layout.
  wrap: {
    height: 54,
    marginHorizontal: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 5,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  label: { letterSpacing: 1.4 },
  web: { flex: 1, backgroundColor: 'transparent' },
})
