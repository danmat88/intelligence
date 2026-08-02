import { useEffect, useMemo, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '../../theme/ThemeProvider'
import { ensureMathAssets, mathAssetsBase } from './mathAssets'

type Props = {
  text: string
  size?: number
  color?: string
  weight?: 400 | 500 | 600 | 700
}

/** Offline Markdown + KaTeX for reviewed native educational content. */
export default function MathRichText({ text, size = 15, color, weight = 400 }: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  const [height, setHeight] = useState(Math.max(28, Math.ceil(size * 1.7)))
  const [assetBase, setAssetBase] = useState<string | null | undefined>(mathAssetsBase ?? undefined)

  useEffect(() => {
    if (assetBase !== undefined) return
    let alive = true
    ensureMathAssets().then((directory) => {
      if (alive) setAssetBase(directory)
    })
    return () => { alive = false }
  }, [assetBase])

  const html = useMemo(() => {
    const local = !!assetBase
    const css = local ? 'katex.css' : 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
    const katex = local ? 'katex.js' : 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js'
    const autoRender = local ? 'auto-render.js' : 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js'
    const marked = local ? 'marked.js' : 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js'
    const fonts = local
      ? `@font-face{font-family:'IN';font-weight:400;src:url('fonts/Inter-Regular.ttf')}
@font-face{font-family:'IN';font-weight:500;src:url('fonts/Inter-Medium.ttf')}
@font-face{font-family:'IN';font-weight:600;src:url('fonts/Inter-SemiBold.ttf')}`
      : ''
    const csp = "default-src 'self' 'unsafe-inline' file: data: https://cdn.jsdelivr.net; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
    return `<!doctype html><html><head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${css}">
<style>
${fonts}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
body{font-family:'IN',system-ui,sans-serif;color:${color ?? c.text};font-size:${size}px;font-weight:${weight};line-height:1.52;word-break:break-word;-webkit-text-size-adjust:100%}
#m>*:first-child{margin-top:0}#m>*:last-child{margin-bottom:0}
p{margin:0 0 8px}strong{font-weight:700}.katex{font-size:1.04em}.katex-display{overflow-x:auto;overflow-y:hidden;margin:9px 0;text-align:left}
table{border-collapse:collapse;width:100%;margin:9px 0;font-size:.9em}th,td{border:1px solid ${c.border};padding:6px 7px;text-align:center}th{background:${c.surfaceAlt}}
</style></head><body><div id="m"></div>
<script src="${marked}"></script><script src="${katex}"></script><script src="${autoRender}"></script>
<script>
const source=${JSON.stringify(text)};
const root=document.getElementById('m');
root.innerHTML=marked.parse(source,{breaks:true,gfm:true});
renderMathInElement(root,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\\\[',right:'\\\\]',display:true},{left:'\\\\(',right:'\\\\)',display:false}],throwOnError:false});
function report(){window.ReactNativeWebView.postMessage('H:'+Math.ceil(document.documentElement.scrollHeight));}
requestAnimationFrame(report);setTimeout(report,80);if(document.fonts?.ready)document.fonts.ready.then(report);
</script></body></html>`
  }, [assetBase, c.border, c.surfaceAlt, c.text, color, size, text, weight])

  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: assetBase ?? undefined }}
        style={styles.web}
        scrollEnabled={false}
        overScrollMode="never"
        allowFileAccess
        allowFileAccessFromFileURLs
        allowingReadAccessToURL={assetBase ?? undefined}
        javaScriptEnabled
        onMessage={(event) => {
          const match = /^H:(\d+)$/.exec(event.nativeEvent.data)
          if (match) setHeight(Math.max(24, Math.min(1200, Number(match[1]) + 1)))
        }}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url
          if (url.startsWith('file://') || url.startsWith('about:') || url.startsWith('data:')) return true
          if (/^https?:/i.test(url)) void Linking.openURL(url).catch(() => {})
          return false
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', width: '100%' },
  web: { backgroundColor: 'transparent' },
})
