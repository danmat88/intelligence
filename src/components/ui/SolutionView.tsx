import { useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/tokens'

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
  verified: string
  unverified: string
}

function buildHtml(content: string, c: Theme['colors'], labels: SolutionLabels, verifying: boolean) {
  const sans = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
  const mono = "ui-monospace,'SF Mono','Cascadia Code',Menlo,monospace"
  const payload = JSON.stringify(content)
  const L = JSON.stringify(labels)
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>
  html,body{margin:0;padding:0;background:transparent}
  body{font-family:${sans};color:${c.text};font-size:15px;line-height:1.5;-webkit-text-size-adjust:100%;padding:1px}
  .lbl{font-family:${mono};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${c.textFaint};margin-bottom:14px}
  .step{display:grid;grid-template-columns:24px 1fr;gap:11px;padding:7px 8px 13px;margin:0 -8px;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:12px}
  .step:active{background:${c.accentSoft}}
  .step .no{font-family:${mono};font-size:12px;color:${c.accent};font-weight:600;padding-top:3px}
  .step .math{font-size:16px;color:${c.text};overflow-x:auto;overflow-y:hidden}
  .step .why{font-size:12.5px;color:${c.textMuted};margin-top:5px;line-height:1.45}
  .answer{display:flex;align-items:center;gap:10px;margin:2px 0 14px;padding:13px 15px;border-radius:16px;background:${c.successSoft};border:1px solid rgba(14,159,110,.30)}
  .answer .tick{width:22px;height:22px;border-radius:50%;background:${c.success};display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .answer .tick svg{width:13px;height:13px;stroke:#fff;stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .answer .ak{display:block;font-family:${mono};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${c.success};font-weight:700;margin-bottom:2px}
  .answer .math{font-size:17px;color:${c.text}}
  .vbadge{margin-left:auto;align-self:center;flex:0 0 auto;font-family:${mono};font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:${c.success};border:1px solid rgba(14,159,110,.45);border-radius:999px;padding:4px 9px;background:#fff}
  .vrf{display:inline-flex;align-items:center;gap:6px;font-family:${mono};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${c.textFaint};margin-bottom:13px}
  .vrf .dot{width:6px;height:6px;border-radius:50%;background:${c.accent};animation:vpulse 1.1s ease-in-out infinite}
  @keyframes vpulse{0%,100%{opacity:.25}50%{opacity:1}}
  .vwarn{font-size:12.5px;color:#9a6700;background:#fff8e6;border:1px solid #f0d789;border-radius:12px;padding:9px 12px;margin:-5px 0 13px}
  .graph{border:1px solid ${c.border};border-radius:16px;background:${c.bg};padding:10px 12px 6px;margin:0 0 14px}
  .graph .glabel{font-family:${mono};font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:${c.textFaint};margin-bottom:5px}
  .graph svg{width:100%;height:auto;display:block;overflow:visible}
  .axis{stroke:${c.border};stroke-width:1.3}
  .parabola{stroke:#0c98a6;stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .root{fill:${c.accent}}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .fu{font-family:${sans};font-size:12px;color:${c.accent};border:1px solid rgba(43,80,224,.35);background:${c.accentSoft};border-radius:999px;padding:9px 14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .12s,color .12s}
  .fu:active{background:${c.accent};color:#fff}
  .errnote{color:${c.danger};font-size:14px}
  .katex{font-size:1.02em}
  .katex-display{margin:.3em 0;overflow-x:auto;overflow-y:hidden}
  p{margin:.5em 0}
  strong{font-weight:700}
  @media (prefers-reduced-motion:no-preference){
    #c{animation:fadeup .45s ease both}
    @keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    /* NOTE: no stroke-dash "draw" animation on the curve — it proved unreliable
       on Android WebView (curve stayed invisible when the animation stalled).
       The graph must always be visible; the card fade is animation enough. */
    .answer{animation:pop .5s cubic-bezier(.2,.8,.3,1) .15s both}
    @keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
  }
</style></head><body>
<div id="c"></div>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<script>
  var RAW = ${payload};
  var L = ${L};
  var VERIFYING = ${verifying ? 'true' : 'false'};
  function post(m){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(m); }catch(e){} }
  function h(){ post('H:'+document.body.scrollHeight); }
  function chip(v){ post('C:'+v); }
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
        if(VERIFYING){ out+='<div class="vrf"><span class="dot"></span>'+esc(L.verifying)+'</div>'; }
        (data.steps||[]).forEach(function(st,i){
          var n=(i+1<10?'0':'')+(i+1);
          out+='<div class="step" onclick="chip(\\'step:'+(i+1)+'\\')"><div class="no">'+n+'</div><div><div class="math">'+tex(st.math)+'</div>'+
               (st.why?'<div class="why">'+esc(deTeX(st.why))+'</div>':'')+'</div></div>';
        });
        if(data.answer){
          out+='<div class="answer"><div class="tick"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>'+
               '<div><span class="ak">'+esc(L.answer)+'</span><span class="math">'+tex(data.answer)+'</span></div>'+
               (data._verified===true?'<span class="vbadge">✓ '+esc(L.verified)+'</span>':'')+'</div>';
          if(data._verified===false){ out+='<div class="vwarn">'+esc(L.unverified)+'</div>'; }
        }
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
  window.addEventListener('load',render);
  setTimeout(h,300); setTimeout(h,900); setTimeout(h,1600);
</script></body></html>`
}

export default function SolutionView({
  content,
  onChip,
  labels,
  verifying = false,
}: {
  content: string
  onChip?: (id: string) => void
  labels: SolutionLabels
  verifying?: boolean
}) {
  const { theme } = useTheme()
  // The card GROWS to its content instead of snapping — every height report
  // from the WebView (first paint, badge arriving, step re-layout) animates.
  const height = useRef(new Animated.Value(72)).current
  const html = useMemo(
    () => buildHtml(content, theme.colors, labels, verifying),
    // labels change only with the app language — stringify keeps the dep stable
    [content, theme.colors, JSON.stringify(labels), verifying],
  )

  return (
    <Animated.View style={{ height }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        onMessage={(e) => {
          const d = e.nativeEvent.data
          if (d.startsWith('H:')) {
            const n = Number(d.slice(2))
            if (n > 0) {
              Animated.timing(height, {
                toValue: Math.ceil(n) + 6,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false, // height is a layout prop
              }).start()
            }
          } else if (d.startsWith('C:')) {
            onChip?.(d.slice(2))
          }
        }}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
})
