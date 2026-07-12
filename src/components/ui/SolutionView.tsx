import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WebView } from 'react-native-webview'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/tokens'
import { ensureMathAssets, mathAssetsBase } from './mathAssets'

/**
 * Renders a solution the way the mockup does: numbered step cards, a checked
 * green answer box, typeset math (KaTeX), and — for quadratics — the actual
 * plotted parabola meeting the x-axis at the answers. Driven by the structured
 * JSON the solver returns; if the text isn't that JSON (a conversational
 * follow-up), it falls back to Markdown + KaTeX. Renders transparent inside the
 * assistant card that hosts it. KaTeX/marked load from jsDelivr (needs network).
 */
export type SolutionLabels = {
  solution: string
  answer: string
  graph: string
  similar: string
  mistake: string
  verifying: string
  reverifying: string
  verified: string
  unverified: string
  unverifiedPill: string
}

/** Verification stage shown on the answer box (the badge's future home). */
export type VerifyStage = 'check' | 'recheck' | false

function buildHtml(content: string, c: Theme['colors'], labels: SolutionLabels, verifying: VerifyStage, local: boolean) {
  const sans = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
  const mono = "ui-monospace,'SF Mono','Cascadia Code',Menlo,monospace"
  const payload = JSON.stringify(content)
  const L = JSON.stringify(labels)
  // Bundled-on-disk KaTeX/marked (relative to the WebView's file:// baseUrl);
  // CDN only as the safety net if the local copy failed.
  const src = local
    ? { css: 'katex.css', katex: 'katex.js', autoRender: 'auto-render.js', marked: 'marked.js' }
    : {
        css: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
        katex: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js',
        autoRender: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js',
        marked: 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
      }
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${src.css}">
<style>
  html,body{margin:0;padding:0;background:transparent;overflow-x:hidden;max-width:100%}
  body{font-family:${sans};color:${c.text};font-size:15px;line-height:1.5;-webkit-text-size-adjust:100%;padding:1px;word-break:break-word}
  .lbl{font-family:${mono};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${c.textFaint};margin-bottom:12px}
  .step{display:grid;grid-template-columns:26px 1fr;gap:12px;padding:11px 8px;margin:0 -8px;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:14px}
  .step+.step{border-top:1px solid rgba(26,22,38,.06)}
  .step:active{background:${c.accentSoft}}
  .step .no{width:26px;height:26px;border-radius:9px;background:${c.accentSoft};color:${c.accent};font-family:${mono};font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;margin-top:1px;transition:background .25s,color .25s}
  /* Steps you already asked about wear a filled tile — instant feedback on
     tap, and orientation later ("which ones did I struggle with?"). */
  .step.asked .no{background:${c.accent};color:#fff}
  .step .math{font-size:16px;color:${c.text};overflow-x:auto;overflow-y:hidden;padding-top:3px}
  .step .why{font-size:12.5px;color:${c.textMuted};margin-top:5px;line-height:1.45}
  .answer{display:flex;align-items:center;gap:12px;margin:12px 0 0;padding:14px 16px;border-radius:18px;background:${c.successSoft};border:1px solid rgba(14,159,110,.22);position:relative;overflow:hidden}
  .answer .tick{width:26px;height:26px;border-radius:50%;background:${c.success};display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 2px 8px rgba(14,159,110,.35)}
  .answer .tick svg{width:14px;height:14px;stroke:#fff;stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .answer .ak{display:block;font-family:${mono};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${c.success};font-weight:700;margin-bottom:3px}
  .answer .math{font-size:17.5px;color:${c.text};overflow-x:auto;overflow-y:hidden}
  /* The verification STORY lives on its own FIXED-HEIGHT line under the
     answer box: pill while checking, badge on success, amber on doubt —
     every state occupies the same space, so the card NEVER shifts. */
  .vline{height:26px;display:flex;align-items:center;justify-content:flex-end;margin:8px 2px 14px}
  .vstat{display:inline-flex;align-items:center;gap:6px;font-family:${mono};font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:${c.textFaint};background:#fff;border:1px solid ${c.border};border-radius:999px;padding:5px 10px}
  .vstat .dot{width:6px;height:6px;border-radius:50%;background:${c.accent};animation:vpulse 1.1s ease-in-out infinite}
  @keyframes vpulse{0%,100%{opacity:.25}50%{opacity:1}}
  .vbadge{display:inline-flex;align-items:center;gap:5px;font-family:${mono};font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#fff;background:${c.success};border-radius:999px;padding:5px 10px;box-shadow:0 2px 8px rgba(14,159,110,.3);cursor:pointer;-webkit-tap-highlight-color:transparent}
  .vwarnpill{display:inline-flex;align-items:center;gap:5px;font-family:${mono};font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#9a6700;background:#fff8e6;border:1px solid #f0d789;border-radius:999px;padding:5px 10px;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .vwarn{font-size:12.5px;color:#9a6700;background:#fff8e6;border:1px solid #f0d789;border-radius:14px;padding:10px 13px;margin:-5px 0 13px}
  @media (prefers-reduced-motion:no-preference){
    .vbadge .chk{display:inline-block;transform-origin:center;animation:chkpop .45s cubic-bezier(.22,1,.36,1)}
    @keyframes chkpop{from{transform:scale(.3)}to{transform:scale(1)}}
    /* One dignified light sweep across the answer box when verification
       lands LIVE (never replayed on reopening history). */
    .answer.celebrate::after{content:'';position:absolute;top:0;bottom:0;width:70px;left:-90px;transform:skewX(-12deg);background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.6),rgba(255,255,255,0));animation:sweep .7s ease-out 1}
    @keyframes sweep{to{left:120%}}
  }
  .graph{border:1px solid ${c.border};border-radius:18px;background:${c.bg};padding:12px 14px 8px;margin:0 0 14px}
  .graph .glabel{font-family:${mono};font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:${c.textFaint};margin-bottom:6px}
  .graph svg{width:100%;height:auto;display:block;overflow:visible}
  .axis{stroke:${c.border};stroke-width:1.3}
  .parabola{stroke:${c.accent};stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .root{fill:${c.success}}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px}
  .fu{font-family:${sans};font-size:12.5px;color:${c.accent};border:none;background:${c.accentSoft};border-radius:999px;padding:10px 16px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .12s,color .12s}
  .fu:active{background:${c.accent};color:#fff}
  .errnote{color:${c.danger};font-size:14px}
  .katex{font-size:1.02em}
  .katex-display{margin:.3em 0;overflow-x:auto;overflow-y:hidden}
  p{margin:.5em 0}
  strong{font-weight:700}
  /* NOTE: no entrance animations in here at all — the native card's animated
     height growth IS the reveal (content is clipped and uncovered as it grows).
     Design rule: content never fades or scales; only movement. Also no
     stroke-dash "draw" animation on the curve — it proved unreliable on
     Android WebView (curve stayed invisible when the animation stalled). */
</style></head><body>
<div id="c"></div>
<script src="${src.marked}"></script>
<script src="${src.katex}"></script>
<script src="${src.autoRender}"></script>
<script>
  var RAW = ${payload};
  var L = ${L};
  var VERIFYING = ${JSON.stringify(verifying || '')};
  // Celebration fires only on a LIVE transition to verified — never when a
  // stored solution re-renders already carrying its badge.
  var wasRendered = false, wasVerified = false;
  // Which steps were asked about — survives re-renders (badge updates etc.).
  var ASKED = {};
  function post(m){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(m); }catch(e){} }
  // Measure the CONTENT div, never body.scrollHeight: the body is floored at
  // the viewport height, so on a growing container it reports the viewport
  // back — which, with grow-only ratcheting on the native side, becomes a
  // runaway feedback loop (the "card gets huge" bug).
  function h(){
    var el=document.getElementById('c');
    var m=el?Math.ceil(el.getBoundingClientRect().height)+2:document.body.scrollHeight;
    post('H:'+m);
  }
  function chip(v){ post('C:'+v); }
  function vtap(v){ post('V:'+v); }
  function stepTap(el,n){ ASKED[n]=1; el.classList.add('asked'); chip('step:'+n); }
  function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
  // Prose fields must be plain text, but models occasionally leak TeX commands
  // into them — map the common ones to readable symbols, drop stray backslashes.
  function deTeX(s){
    return String(s==null?'':s)
      .replace(/\\\\int/g,'∫').replace(/\\\\cdot/g,'·').replace(/\\\\times/g,'×')
      .replace(/\\\\sqrt/g,'√').replace(/\\\\pi/g,'π').replace(/\\\\theta/g,'θ')
      .replace(/\\\\leq?/g,'≤').replace(/\\\\geq?/g,'≥').replace(/\\\\neq?/g,'≠')
      .replace(/\\\\pm/g,'±').replace(/\\\\infty/g,'∞')
      .replace(/\\\\(?:Rightarrow|implies)/g,'⇒').replace(/\\\\(?:to|rightarrow)/g,'→')
      .replace(/\\\\([a-zA-Z]+)/g,'$1').replace(/[{}]/g,'');
  }
  function tex(t){
    // models sometimes wrap the math field in $/$$ despite instructions — strip
    var s=String(t==null?'':t).trim().replace(/^\\$+/,'').replace(/\\$+$/,'').trim();
    try{ return katex.renderToString(s,{throwOnError:false,displayMode:false}); }catch(e){ return esc(s); }
  }

  function parse(raw){
    var s=raw.indexOf('{'), e=raw.lastIndexOf('}');
    if(s>=0 && e>s){ try{ return JSON.parse(raw.slice(s,e+1)); }catch(_){} }
    return null;
  }

  function plot(a,b,c){
    if(!a) return '';
    try{
      var disc=b*b-4*a*c, vx=-b/(2*a);
      var reach = disc>=0 ? Math.sqrt(disc)/Math.abs(a) : 2;
      var span = Math.max(2.2, reach + 2);
      var xmin=vx-span, xmax=vx+span;
      function y(x){return a*x*x+b*x+c;}
      var W=272,H=116,pad=14,N=44;
      var ys=[]; for(var i=0;i<=N;i++){ ys.push(y(xmin+(xmax-xmin)*i/N)); }
      var ymin=Math.min.apply(null,ys), ymax=Math.max.apply(null,ys);
      if(ymin===ymax){ymax=ymin+1;}
      function px(x){return pad+(x-xmin)/(xmax-xmin)*(W-2*pad);}
      function py(v){return 8+(ymax-v)/(ymax-ymin)*(H-22);}
      var ay=Math.max(8,Math.min(H-8,py(0)));
      var x0=px(0);
      var d=''; for(var j=0;j<=N;j++){ var xx=xmin+(xmax-xmin)*j/N; d+=(j?'L':'M')+px(xx).toFixed(1)+' '+py(y(xx)).toFixed(1)+' '; }
      var roots='';
      if(disc>=0){
        var r1=(-b-Math.sqrt(disc))/(2*a), r2=(-b+Math.sqrt(disc))/(2*a);
        [r1,r2].forEach(function(r){ roots+='<circle class="root" cx="'+px(r).toFixed(1)+'" cy="'+ay.toFixed(1)+'" r="4"/>'; });
      }
      var yaxis = (x0>=pad&&x0<=W-pad) ? '<line class="axis" x1="'+x0.toFixed(1)+'" y1="6" x2="'+x0.toFixed(1)+'" y2="'+(H-6)+'" opacity="0.4"/>' : '';
      return '<div class="graph"><div class="glabel">'+esc(L.graph)+'</div>'+
        '<svg viewBox="0 0 '+W+' '+H+'">'+yaxis+
        '<line class="axis" x1="8" y1="'+ay.toFixed(1)+'" x2="'+(W-8)+'" y2="'+ay.toFixed(1)+'"/>'+
        '<path class="parabola" d="'+d+'"/>'+roots+'</svg></div>';
    }catch(e){ return ''; }
  }

  function render(){
    var el=document.getElementById('c');
    try{
      var data=parse(RAW);
      if(data && data.error){ el.innerHTML='<div class="errnote">'+esc(data.error)+'</div>'; h(); return; }
      if(data && (data.steps || data.answer)){
        var out='<div class="lbl">'+esc(L.solution)+'</div>';
        (data.steps||[]).forEach(function(st,i){
          var n=String(i+1);
          out+='<div class="step'+(ASKED[n]?' asked':'')+'" onclick="stepTap(this,'+(i+1)+')"><div class="no">'+n+'</div><div><div class="math">'+tex(st.math)+'</div>'+
               (st.why?'<div class="why">'+esc(deTeX(st.why))+'</div>':'')+'</div></div>';
        });
        if(data.answer){
          // One slot on the answer box tells the whole verification story:
          // pulsing "checking" pill -> (maybe "re-solving") -> green badge
          // or amber pill. Space is reserved from the start, nothing jumps.
          var nowVerified = data._verified===true;
          var celebrate = wasRendered && !wasVerified && nowVerified;
          var vslot='';
          if(VERIFYING==='check'||VERIFYING==='recheck'){
            vslot='<span class="vstat"><span class="dot"></span>'+esc(VERIFYING==='recheck'?L.reverifying:L.verifying)+'</span>';
          } else if(nowVerified){
            vslot='<span class="vbadge" onclick="vtap(\\'verified\\')"><span class="chk">✓</span>'+esc(L.verified)+'</span>';
          } else if(data._verified===false){
            vslot='<span class="vwarnpill" onclick="vtap(\\'unverified\\')">!&nbsp;'+esc(L.unverifiedPill)+'</span>';
          }
          out+='<div class="answer'+(celebrate?' celebrate':'')+'"><div class="tick"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>'+
               '<div><span class="ak">'+esc(L.answer)+'</span><span class="math">'+tex(data.answer)+'</span></div></div>'+
               '<div class="vline">'+vslot+'</div>';
          if(data._verified===false){ out+='<div class="vwarn">'+esc(L.unverified)+'</div>'; }
          wasVerified = nowVerified;
        }
        wasRendered = true;
        if(data.quadratic && data.quadratic.length===3){ out+=plot(+data.quadratic[0],+data.quadratic[1],+data.quadratic[2]); }
        out+='<div class="chips"><button class="fu" onclick="chip(\\'similar\\')">'+esc(L.similar)+'</button>'+
             '<button class="fu" onclick="chip(\\'mistake\\')">'+esc(L.mistake)+'</button></div>';
        el.innerHTML=out;
      } else {
        // Markdown + math conflict: underscores INSIDE $...$/$$...$$ read as
        // markdown emphasis and split the math into <em> fragments, so KaTeX
        // never sees a whole block. Standard fix: pull math out, run markdown,
        // put math back, THEN typeset.
        var MATHS=[];
        function stash(m){ MATHS.push(m); return '§§'+(MATHS.length-1)+'§§'; }
        var prot=String(RAW)
          .replace(/\\$\\$[\\s\\S]+?\\$\\$/g,stash)
          .replace(/\\\\\\[[\\s\\S]+?\\\\\\]/g,stash)
          .replace(/\\\\\\([\\s\\S]+?\\\\\\)/g,stash)
          .replace(/\\$(?!\\s)[^$\\n]+?(?<!\\s)\\$/g,stash); // no space at edges → "5$ și 10$" prose stays prose
        var html=window.marked ? marked.parse(prot) : esc(prot);
        html=html.replace(/§§(\\d+)§§/g,function(_,i){ return esc(MATHS[+i]); });
        el.innerHTML=html;
        if(window.renderMathInElement) renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\\\[',right:'\\\\]',display:true},{left:'\\\\(',right:'\\\\)',display:false}],throwOnError:false});
      }
    }catch(e){ el.innerHTML=esc(RAW); }
    h();
  }
  // Live update channel: the native side NEVER rebuilds this page — new
  // content / verify states are injected here and re-rendered in place
  // (KaTeX is already warm, so there is no reload, no flash, no refetch).
  window.update = function(raw, verifying){ RAW = String(raw); VERIFYING = verifying ? String(verifying) : ''; render(); };
  window.addEventListener('load',render);
  // Event-driven height reporting: observe the CONTENT box itself and the
  // font pipeline — every real layout change reports, transient or final;
  // the native side applies only the value that survives the quiet window.
  try{ if(window.ResizeObserver){ new ResizeObserver(h).observe(document.getElementById('c')); } }catch(e){}
  try{ if(document.fonts && document.fonts.ready){ document.fonts.ready.then(h); } }catch(e){}
  setTimeout(h,400); setTimeout(h,1200);
</script></body></html>`
}

/**
 * Once a card is measured, remember it FOREVER (persisted): any solution ever
 * opened renders at its exact height instantly — no settle, no shift, across
 * app restarts. Keyed by a hash of the content, capped, saved debounced.
 */
const heightCache = new Map<string, number>()
// v2: v1 entries were poisoned by the body.scrollHeight runaway — abandon them.
const CACHE_KEY = '@rezolvo.solHeights.v2'
const CACHE_CAP = 300
let saveTimer: ReturnType<typeof setTimeout> | null = null

function contentKey(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${h}:${s.length}`
}

// Hydrate at module load — long before any history sheet can be opened.
AsyncStorage.getItem(CACHE_KEY)
  .then((v) => {
    if (!v) return
    const o = JSON.parse(v) as Record<string, number>
    for (const k of Object.keys(o)) if (!heightCache.has(k)) heightCache.set(k, o[k])
  })
  .catch(() => {})

function rememberHeight(key: string, h: number) {
  heightCache.set(key, h)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const entries = [...heightCache.entries()].slice(-CACHE_CAP)
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries))).catch(() => {})
  }, 1200)
}

/** Close first-render guess for unmeasured structured solutions. It must
 *  UNDERSHOOT on purpose: growing later (below the anchor) is invisible,
 *  while a too-tall box that shrinks under the reader is ugly. */
function estimateHeight(content: string): number {
  try {
    const s = content.indexOf('{')
    const e = content.lastIndexOf('}')
    if (s >= 0 && e > s) {
      const j = JSON.parse(content.slice(s, e + 1)) as {
        error?: string
        steps?: { why?: string }[]
        answer?: string
        quadratic?: unknown[]
      }
      if (j.error) return 56
      if (j.steps || j.answer) {
        const steps = Array.isArray(j.steps) ? j.steps.length : 0
        const whys = Array.isArray(j.steps) ? j.steps.filter((st) => st && st.why).length : 0
        let h = 34 + steps * 44 + whys * 18 + (j.answer ? 114 : 0) + 40
        if (Array.isArray(j.quadratic) && j.quadratic.length === 3) h += 150
        return Math.min(600, Math.max(72, h))
      }
    }
  } catch {
    // not structured JSON — a markdown follow-up
  }
  return 96
}

export default function SolutionView({
  content,
  onChip,
  onVerifyTap,
  labels,
  reveal = true,
  mountDelay = 0,
  verifying = false,
}: {
  content: string
  onChip?: (id: string) => void
  /** Tap on the ✓/! badge — opens the trust explainer on the native side. */
  onVerifyTap?: (state: 'verified' | 'unverified') => void
  labels: SolutionLabels
  /**
   * true (live answer): the card GROWS to its content — the growth IS the
   * reveal, and the WebView mounts immediately. false (history load): the
   * card is INERT — a fixed box at its remembered exact height (or a close
   * estimate); nothing inside a loaded conversation ever resizes or rides
   * an animation.
   */
  reveal?: boolean
  /**
   * How long to hold the WebView back (ms). Non-zero ONLY when a screen
   * transition needs covering (hero→thread push); switching between loaded
   * problems has no transition to protect, so the WebView mounts instantly.
   */
  mountDelay?: number
  verifying?: VerifyStage
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const key = useMemo(() => contentKey(content), [content])
  // Live answers start at the pending block's size (no downward dip when the
  // spinner card becomes the solution card), then grow ONCE toward the
  // estimate; the real measurement lands as a small ratcheted adjustment.
  const LIVE_START = 118
  const height = useRef(
    new Animated.Value(reveal ? LIVE_START : (heightCache.get(key) ?? estimateHeight(content))),
  ).current
  const measuredRef = useRef(false)
  const appliedRef = useRef(0) // last height actually applied
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTargetRef = useRef(0)
  const contentDirtyRef = useRef(false)
  const [painted, setPainted] = useState(false)
  const paintedRef = useRef(false)

  useEffect(() => {
    if (!reveal) return
    const target = heightCache.get(key) ?? estimateHeight(content)
    appliedRef.current = target
    Animated.timing(height, {
      toValue: target,
      duration: 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Hold the heavy WebView back only while a covering transition runs —
  // the box (already final-size) carries the layout meanwhile.
  const [webAlive, setWebAlive] = useState(reveal || mountDelay <= 0)
  useEffect(() => {
    if (webAlive) return
    const id = setTimeout(() => setWebAlive(true), mountDelay)
    return () => clearTimeout(id)
  }, [webAlive, mountDelay])

  // Where KaTeX/marked come from: a string = the on-disk bundle (file://),
  // null = CDN fallback, undefined = still preparing (ghost box meanwhile —
  // in practice it resolves at app boot, long before any card mounts).
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

  // The page is built ONCE per card. Every later change (verify badge, deep
  // re-solve swapping the text) is INJECTED into the live page — a WebView
  // reload would flash an empty card at a stale height (the "tall empty
  // card" bug) and refetch KaTeX for nothing.
  const webRef = useRef<WebView>(null)
  const initial = useRef({ content, verifying })
  const html = useMemo(
    () => buildHtml(initial.current.content, theme.colors, labels, initial.current.verifying, !!assetBase),
    // labels/colors are stable in practice; content updates flow via update()
    [theme.colors, JSON.stringify(labels), assetBase],
  )
  const propsRef = useRef({ content, verifying })
  propsRef.current = { content, verifying }
  const shownRef = useRef({ ...initial.current })
  const loadedRef = useRef(false)
  const sync = () => {
    if (!loadedRef.current) return
    const want = propsRef.current
    if (shownRef.current.content === want.content && shownRef.current.verifying === want.verifying) return
    // A real content swap (deep re-solve) may legitimately resize either way;
    // everything else is height-ratcheted so late reports can't jiggle.
    if (shownRef.current.content !== want.content) contentDirtyRef.current = true
    shownRef.current = { ...want }
    webRef.current?.injectJavaScript(
      `window.update && window.update(${JSON.stringify(want.content)}, ${JSON.stringify(want.verifying || '')}); true;`,
    )
  }
  useEffect(sync, [content, verifying])

  // The ghost bars carry the box until the page actually PAINTS (not merely
  // mounts) — a card is never visibly empty, and it never dips or double-jumps.
  const webReady = webAlive && assetBase !== undefined

  return (
    <Animated.View style={{ height, overflow: 'hidden' }}>
      {!painted && (
        <View style={styles.ghostFill} pointerEvents="none">
          <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: '38%' }]} />
          <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: '86%' }]} />
          <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: '72%' }]} />
          <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: '64%' }]} />
        </View>
      )}
      {webReady && (
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
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        onLoadEnd={() => {
          loadedRef.current = true
          sync() // flush anything that changed while the page was loading
        }}
        onMessage={(e) => {
          const d = e.nativeEvent.data
          if (d.startsWith('H:')) {
            const n = Number(d.slice(2))
            if (n > 0) {
              // STABILITY-BASED sizing — the lesson of every height bug so
              // far: the page reports several TRANSIENT layouts (fallback
              // fonts before KaTeX fonts load, mid-typeset states) before the
              // real one. Never apply a transient: each report arms a short
              // timer; a newer report replaces it; only the value that
              // survives 160ms of quiet is applied — in EITHER direction,
              // with a single calm animation. No ratchets, no feedback loops.
              const target = Math.ceil(n) + 6
              if (__DEV__) console.log(`[card ${key}] report ${target} (applied ${appliedRef.current})`)
              pendingTargetRef.current = target
              if (settleRef.current) clearTimeout(settleRef.current)
              settleRef.current = setTimeout(() => {
                const stable = pendingTargetRef.current
                const dirty = contentDirtyRef.current
                contentDirtyRef.current = false
                if (Math.abs(stable - appliedRef.current) <= 2 && measuredRef.current) return
                if (__DEV__) console.log(`[card ${key}] apply ${stable}${dirty ? ' (content swap)' : ''}`)
                appliedRef.current = stable
                rememberHeight(key, stable)
                if (!reveal && !measuredRef.current) {
                  height.setValue(stable) // history cards land silently
                } else {
                  Animated.timing(height, {
                    toValue: stable,
                    duration: 400,
                    easing: Easing.bezier(0.22, 1, 0.36, 1),
                    useNativeDriver: false, // height is a layout prop
                  }).start()
                }
                measuredRef.current = true
              }, 160)
              if (!paintedRef.current) {
                paintedRef.current = true
                setPainted(true) // first paint — the ghost bars hand over
              }
            }
          } else if (d.startsWith('C:')) {
            onChip?.(d.slice(2))
          } else if (d.startsWith('V:')) {
            const v = d.slice(2)
            if (v === 'verified' || v === 'unverified') onVerifyTap?.(v)
          }
        }}
      />
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
  ghostFill: { ...StyleSheet.absoluteFillObject, paddingTop: 2 },
  ghostBar: { height: 13, borderRadius: 7, marginBottom: 12 },
})
