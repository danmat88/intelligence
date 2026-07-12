import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/tokens'
import { ensureMathAssets, mathAssetsBase } from './mathAssets'
import type { VerifyStage } from './SolutionView'

/**
 * The conversation as ONE living document — not chat bubbles. The problem is
 * the page's title, the solution is the body, the user's follow-ups are
 * annotations (post-its). Everything renders inside a single WebView, so
 * layout belongs entirely to the browser: no height round-trips, no card
 * resize choreography — that whole class of bugs cannot exist here.
 *
 * Native → page: window.setThread(payload) with the full turn list; the page
 * reconciles by turn id (append with reveal, patch in place, remove stale).
 * Page → native: C:chip · V:verify-tap · R:retry · A:action:turnId · X:cancel.
 */

export type DocTurn = {
  id: string
  role: 'user' | 'assistant'
  text: string
  imageUri?: string
  imageW?: number
  imageH?: number
  pending?: boolean
  error?: boolean
}

export type DocLabels = {
  problem: string
  photoProblem: string
  readAs: string
  fix: string
  copy: string
  share: string
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
  retry: string
  cancel: string
  you: string
  pending: [string, string, string, string]
}

function buildDocHtml(c: Theme['colors'], labels: DocLabels, local: boolean) {
  const L = JSON.stringify(labels)
  const src = local
    ? { css: 'katex.css', katex: 'katex.js', autoRender: 'auto-render.js', marked: 'marked.js' }
    : {
        css: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
        katex: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js',
        autoRender: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js',
        marked: 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
      }
  const fonts = local
    ? `@font-face{font-family:'SG';font-weight:700;src:url('fonts/SpaceGrotesk-Bold.ttf')}
@font-face{font-family:'IN';font-weight:400;src:url('fonts/Inter-Regular.ttf')}
@font-face{font-family:'IN';font-weight:500;src:url('fonts/Inter-Medium.ttf')}
@font-face{font-family:'IN';font-weight:600;src:url('fonts/Inter-SemiBold.ttf')}
@font-face{font-family:'JB';font-weight:600;src:url('fonts/JetBrainsMono-SemiBold.ttf')}`
    : ''
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${src.css}">
<style>
${fonts}
:root{color-scheme:light}
html,body{margin:0;padding:0;background:transparent;overflow-x:hidden;max-width:100%}
body{font-family:'IN',system-ui,sans-serif;font-weight:400;color:${c.text};font-size:15px;line-height:1.5;-webkit-text-size-adjust:100%;padding:6px 16px 24px;word-break:break-word;-webkit-tap-highlight-color:transparent}
.lbl{font-family:'JB',monospace;font-weight:600;font-size:9.5px;letter-spacing:.15em;text-transform:uppercase}

/* — problem header: the page's title, underlined like a notebook — */
.prob{border-bottom:2px solid ${c.text};padding:6px 2px 12px;margin-bottom:4px}
.prob .lbl{color:${c.accent};display:flex;align-items:center;gap:8px}
.prob .src{margin-left:auto;color:${c.textFaint};letter-spacing:.08em}
.prob .ptx{font-size:19px;margin-top:8px;overflow-x:auto;overflow-y:hidden}
/* The photo box is reserved at its EXACT aspect ratio before the image
   loads — the layout is final from the first pixel, the photo materialises
   into it (no push-down, no jump). */
.imgbox{position:relative;border-radius:12px;overflow:hidden;margin-top:10px;background:${c.surfaceAlt}}
.imgbox img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .18s ease}
.imgbox img.ld{opacity:1}
/* the confirm-what-I-read loop: the problem as the AI understood it, typeset */
.pread{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:11px}
.pread .rl{font-family:'JB',monospace;font-weight:600;font-size:8.5px;letter-spacing:.13em;text-transform:uppercase;color:${c.textFaint};flex:0 0 auto}
.pread .rm{font-size:17px;overflow-x:auto;overflow-y:hidden;flex:1;min-width:60%}
.pread .pfix{font-family:'IN';font-weight:600;font-size:11px;color:${c.accent};background:${c.accentSoft};border-radius:999px;padding:5px 11px;cursor:pointer;flex:0 0 auto}

/* — solution: borderless panels breathing on the paper — */
.sec{margin-top:16px}
.sec>.lbl{color:${c.textFaint};display:block;margin-bottom:7px;padding-left:2px}
.panel{background:#fff;border-radius:18px;padding:2px 16px;box-shadow:0 2px 6px rgba(26,22,38,.04),0 10px 24px rgba(26,22,38,.06)}
.step{display:grid;grid-template-columns:26px 1fr;gap:12px;padding:13px 0;cursor:pointer}
.step+.step{border-top:1px solid rgba(26,22,38,.05)}
.step .no{width:24px;height:24px;border-radius:8px;background:${c.accentSoft};color:${c.accent};font-family:'JB',monospace;font-weight:600;font-size:11.5px;display:flex;align-items:center;justify-content:center;margin-top:2px;transition:background .25s,color .25s}
.step.asked .no{background:${c.accent};color:#fff}
.step .math{font-size:16.5px;overflow-x:auto;overflow-y:hidden;padding-top:2px}
.step .why{font-size:12px;color:${c.textMuted};margin-top:5px;line-height:1.5}
.ans{display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#0E9F6E,#0B8259);border-radius:18px;padding:15px 16px;margin-top:10px;box-shadow:0 10px 26px rgba(14,159,110,.28);position:relative;overflow:hidden}
.ans .tick{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.ans .tick svg{width:14px;height:14px;stroke:#fff;stroke-width:2.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
.ans .ak{display:block;color:rgba(255,255,255,.75)}
.ans .math{color:#fff;font-size:18px;margin-top:2px;overflow-x:auto;overflow-y:hidden}
.ans .katex{color:#fff}
.vline{height:26px;display:flex;align-items:center;justify-content:flex-end;margin:9px 2px 0}
.vstat{display:inline-flex;align-items:center;gap:6px;font-family:'JB',monospace;font-weight:600;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:${c.textFaint};background:#fff;border:1px solid rgba(26,22,38,.1);border-radius:999px;padding:5px 10px}
.vstat .dot{width:6px;height:6px;border-radius:50%;background:${c.accent};animation:vpulse 1.1s ease-in-out infinite}
@keyframes vpulse{0%,100%{opacity:.25}50%{opacity:1}}
.vbadge{display:inline-flex;align-items:center;gap:5px;font-family:'JB',monospace;font-weight:600;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#0E9F6E;background:#fff;border-radius:999px;padding:5px 11px;box-shadow:0 2px 10px rgba(14,159,110,.3);cursor:pointer}
.vwarnpill{display:inline-flex;align-items:center;gap:5px;font-family:'JB',monospace;font-weight:600;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#9a6700;background:#fff8e6;border:1px solid #f0d789;border-radius:999px;padding:5px 10px;cursor:pointer}
.vwarn{font-size:12.5px;color:#9a6700;background:#fff8e6;border:1px solid #f0d789;border-radius:14px;padding:10px 13px;margin-top:8px}
.graph{border:1px solid rgba(26,22,38,.09);border-radius:16px;background:#fff;padding:12px 14px 8px;margin-top:12px}
.graph .glabel{font-family:'JB',monospace;font-weight:600;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:${c.textFaint};margin-bottom:6px}
.graph svg{width:100%;height:auto;display:block;overflow:visible}
.axis{stroke:rgba(26,22,38,.18);stroke-width:1.3}
.parabola{stroke:${c.accent};stroke-width:2.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
.root{fill:#0E9F6E}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
.fu{font-family:'IN';font-weight:600;font-size:12.5px;color:${c.accent};border:none;background:${c.accentSoft};border-radius:12px;padding:10px 15px;cursor:pointer}
.fu.alt{color:${c.textMuted};background:${c.surfaceAlt}}
.acts{display:flex;gap:8px;margin-top:10px}
.act{display:inline-flex;align-items:center;gap:6px;font-family:'IN';font-weight:600;font-size:11.5px;color:${c.textMuted};background:#fff;border:1px solid rgba(26,22,38,.1);border-radius:12px;padding:7px 12px;cursor:pointer}
.act svg{width:12px;height:12px;stroke:currentColor;stroke-width:2.1;fill:none;stroke-linecap:round;stroke-linejoin:round}

/* — annotations: the user's questions as post-its — */
.qa{margin-top:18px;background:#FFF9E8;border-left:3px solid #E8B93B;border-radius:4px 14px 14px 4px;padding:12px 14px}
.qa .q{font-family:'IN';font-weight:600;font-size:12.5px;color:#8A6A0E}
.qa .a{font-size:13.5px;line-height:1.6;margin-top:6px}
.qa .a p{margin:.4em 0}
.qa .a strong{font-weight:600}

/* — pending: the tutor is working — */
.pend{display:flex;flex-direction:column;gap:12px;padding:14px 2px 6px}
.pend .row{display:flex;align-items:center;gap:10px}
.pend .spin{width:16px;height:16px;border:2.2px solid ${c.accentSoft};border-top-color:${c.accent};border-radius:50%;animation:spin .9s linear infinite;flex:0 0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.pend .ptext{font-size:13px;color:${c.textMuted};flex:1}
.pend .pcancel{font-family:'IN';font-weight:600;font-size:12px;color:${c.textFaint};cursor:pointer}
.skel{display:flex;flex-direction:column;gap:9px}
.skel i{display:block;height:12px;border-radius:6px;background:${c.surfaceAlt};animation:pulse 1.3s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}

/* — error — */
.errb{background:#fff;border:1px solid ${c.danger};border-radius:16px;padding:13px 15px;margin-top:14px}
.errb .et{color:${c.danger};font-size:13.5px}
.errb .retry{display:inline-flex;align-items:center;gap:6px;font-family:'IN';font-weight:600;font-size:12px;color:${c.accent};background:${c.accentSoft};border-radius:999px;padding:8px 14px;margin-top:10px;cursor:pointer}

/* — meta pill — */
.meta{text-align:center;margin:2px 0 10px}
.meta span{font-family:'JB',monospace;font-weight:600;font-size:9px;letter-spacing:.12em;color:${c.textFaint};background:#fff;border:1px solid rgba(26,22,38,.09);border-radius:999px;padding:5px 12px;text-transform:uppercase}

/* — jump to latest — */
#jump{position:fixed;right:14px;bottom:16px;width:40px;height:40px;border-radius:20px;background:#fff;border:1px solid rgba(26,22,38,.12);box-shadow:0 5px 14px rgba(26,22,38,.14);display:none;align-items:center;justify-content:center;cursor:pointer}
#jump svg{stroke:${c.accent};stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round;width:20px;height:20px}

/* — reveal motion (house style: clipped rise, no fades on content) — */
@media (prefers-reduced-motion:no-preference){
  .rise{animation:rise .5s cubic-bezier(.22,1,.36,1) both}
  @keyframes rise{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}
  .ans.celebrate::after{content:'';position:absolute;top:0;bottom:0;width:70px;left:-90px;transform:skewX(-12deg);background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.5),rgba(255,255,255,0));animation:sweep .7s ease-out 1}
  @keyframes sweep{to{left:120%}}
  .vbadge .chk{display:inline-block;transform-origin:center;animation:chkpop .45s cubic-bezier(.22,1,.36,1)}
  @keyframes chkpop{from{transform:scale(.3)}to{transform:scale(1)}}
}
.katex{font-size:1.02em}
.katex-display{margin:.3em 0;overflow-x:auto;overflow-y:hidden}
</style></head><body>
<div id="doc"></div>
<div id="jump" onclick="jumpDown()"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></div>
<script src="${src.marked}"></script>
<script src="${src.katex}"></script>
<script src="${src.autoRender}"></script>
<script>
var L=${L};
var STATE={turns:[],verifying:{},cold:true,meta:null};
var KNOWN={};        // block key -> signature already rendered
var PHASE={};        // block key -> 'P' pending | 'E' error | 'C' content
var ASKED={};        // step numbers asked about
var wasVerified=false, everRendered=false;
function post(m){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(m); }catch(e){} }
function chip(v){ post('C:'+v); }
function vtap(v){ post('V:'+v); }
function act(k,id){ post('A:'+k+':'+id); }
function retry(){ post('R:'); }
function pcancel(){ post('X:'); }
function stepTap(el,n){ ASKED[n]=1; el.classList.add('asked'); chip('step:'+n); }
var PREAD='';
function pfix(){ if(PREAD) post('P:'+PREAD); }
function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
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
  var s=String(t==null?'':t).trim().replace(/^\\$+/,'').replace(/\\$+$/,'').trim();
  try{ return katex.renderToString(s,{throwOnError:false,displayMode:false}); }catch(e){ return esc(s); }
}
function md(raw){
  var MATHS=[];
  function stash(m){ MATHS.push(m); return '§§'+(MATHS.length-1)+'§§'; }
  var prot=String(raw)
    .replace(/\\$\\$[\\s\\S]+?\\$\\$/g,stash)
    .replace(/\\\\\\[[\\s\\S]+?\\\\\\]/g,stash)
    .replace(/\\\\\\([\\s\\S]+?\\\\\\)/g,stash)
    .replace(/\\$(?!\\s)[^$\\n]+?(?<!\\s)\\$/g,stash);
  var html=window.marked?marked.parse(prot):esc(prot);
  return html.replace(/§§(\\d+)§§/g,function(_,i){ return esc(MATHS[+i]); });
}
function typeset(el){
  if(window.renderMathInElement) renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\\\[',right:'\\\\]',display:true},{left:'\\\\(',right:'\\\\)',display:false}],throwOnError:false});
}
function parse(raw){
  var s=raw.indexOf('{'), e=raw.lastIndexOf('}');
  if(s>=0&&e>s){ try{ return JSON.parse(raw.slice(s,e+1)); }catch(_){} }
  return null;
}
function plot(a,b,c){
  if(!a) return '';
  try{
    var disc=b*b-4*a*c, vx=-b/(2*a);
    var reach=disc>=0?Math.sqrt(disc)/Math.abs(a):2;
    var span=Math.max(2.2,reach+2), xmin=vx-span, xmax=vx+span;
    function y(x){return a*x*x+b*x+c;}
    var W=272,H=116,pad=14,N=44,ys=[];
    for(var i=0;i<=N;i++){ ys.push(y(xmin+(xmax-xmin)*i/N)); }
    var ymin=Math.min.apply(null,ys), ymax=Math.max.apply(null,ys);
    if(ymin===ymax){ymax=ymin+1;}
    function px(x){return pad+(x-xmin)/(xmax-xmin)*(W-2*pad);}
    function py(v){return 8+(ymax-v)/(ymax-ymin)*(H-22);}
    var ay=Math.max(8,Math.min(H-8,py(0))), x0=px(0), d='';
    for(var j=0;j<=N;j++){ var xx=xmin+(xmax-xmin)*j/N; d+=(j?'L':'M')+px(xx).toFixed(1)+' '+py(y(xx)).toFixed(1)+' '; }
    var roots='';
    if(disc>=0){
      var r1=(-b-Math.sqrt(disc))/(2*a), r2=(-b+Math.sqrt(disc))/(2*a);
      [r1,r2].forEach(function(r){ roots+='<circle class="root" cx="'+px(r).toFixed(1)+'" cy="'+ay.toFixed(1)+'" r="4"/>'; });
    }
    var yaxis=(x0>=pad&&x0<=W-pad)?'<line class="axis" x1="'+x0.toFixed(1)+'" y1="6" x2="'+x0.toFixed(1)+'" y2="'+(H-6)+'" opacity="0.4"/>':'';
    return '<div class="graph"><div class="glabel">'+esc(L.graph)+'</div><svg viewBox="0 0 '+W+' '+H+'">'+yaxis+
      '<line class="axis" x1="8" y1="'+ay.toFixed(1)+'" x2="'+(W-8)+'" y2="'+ay.toFixed(1)+'"/>'+
      '<path class="parabola" d="'+d+'"/>'+roots+'</svg></div>';
  }catch(e){ return ''; }
}
var icons={
  copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>'
};

/* pending label stages */
var pendTimer=null, pendStart=0;
function pendTick(){
  var el=document.getElementById('ptext'); if(!el) return;
  var t=Date.now()-pendStart;
  el.textContent = t<4000?L.pending[0] : t<10000?L.pending[1] : t<22000?L.pending[2] : L.pending[3];
  var cx=document.getElementById('pcancel');
  if(cx) cx.style.display = t>=5000?'inline':'none';
}
function pendHtml(){
  pendStart=Date.now();
  if(pendTimer) clearInterval(pendTimer);
  pendTimer=setInterval(pendTick,1000);
  return '<div class="pend"><div class="row"><span class="spin"></span><span class="ptext" id="ptext">'+esc(L.pending[0])+'</span>'+
    '<span class="pcancel" id="pcancel" style="display:none" onclick="pcancel()">'+esc(L.cancel)+'</span></div>'+
    '<div class="skel"><i style="width:86%"></i><i style="width:70%"></i><i style="width:55%"></i></div></div>';
}

function solutionHtml(turn, verifying, reveal){
  var data=parse(turn.text);
  if(data && data.error){ return '<div class="errb"><div class="et">'+esc(data.error)+'</div></div>'; }
  if(!(data && (data.steps||data.answer))){
    return '<div class="panel" style="padding:13px 16px"><div class="a">'+md(turn.text)+'</div></div>';
  }
  var nowVerified=data._verified===true;
  var celebrate=everRendered && !wasVerified && nowVerified;
  var out='<div class="panel">';
  (data.steps||[]).forEach(function(st,i){
    var n=String(i+1);
    var dl=reveal?' style="animation-delay:'+(i*0.18)+'s"':'';
    out+='<div class="step'+(ASKED[n]?' asked':'')+(reveal?' rise':'')+'"'+dl+' onclick="stepTap(this,'+(i+1)+')"><div class="no">'+n+'</div><div><div class="math">'+tex(st.math)+'</div>'+
      (st.why?'<div class="why">'+esc(deTeX(st.why))+'</div>':'')+'</div></div>';
  });
  out+='</div>';
  var nsteps=(data.steps||[]).length;
  if(data.answer){
    var vslot='';
    if(verifying==='check'||verifying==='recheck'){
      vslot='<span class="vstat"><span class="dot"></span>'+esc(verifying==='recheck'?L.reverifying:L.verifying)+'</span>';
    } else if(nowVerified){
      vslot='<span class="vbadge" onclick="vtap(\\'verified\\')"><span class="chk">✓</span>'+esc(L.verified)+'</span>';
    } else if(data._verified===false){
      vslot='<span class="vwarnpill" onclick="vtap(\\'unverified\\')">!&nbsp;'+esc(L.unverifiedPill)+'</span>';
    }
    var adl=reveal?' style="animation-delay:'+(nsteps*0.18+0.15)+'s"':'';
    out+='<div class="ans'+(celebrate?' celebrate':'')+(reveal?' rise':'')+'"'+adl+'><span class="tick"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>'+
      '<div><span class="ak lbl">'+esc(L.answer)+'</span><span class="math">'+tex(data.answer)+'</span></div></div>'+
      '<div class="vline">'+vslot+'</div>';
    if(data._verified===false){ out+='<div class="vwarn">'+esc(L.unverified)+'</div>'; }
  }
  if(data.quadratic && data.quadratic.length===3){ out+=plot(+data.quadratic[0],+data.quadratic[1],+data.quadratic[2]); }
  out+='<div class="chips"><button class="fu" onclick="chip(\\'similar\\')">'+esc(L.similar)+'</button>'+
       '<button class="fu alt" onclick="chip(\\'mistake\\')">'+esc(L.mistake)+'</button></div>';
  out+='<div class="acts"><span class="act" onclick="act(\\'copy\\',\\''+turn.id+'\\')">'+icons.copy+esc(L.copy)+'</span>'+
       '<span class="act" onclick="act(\\'share\\',\\''+turn.id+'\\')">'+icons.share+esc(L.share)+'</span></div>';
  wasVerified=nowVerified;
  return out;
}

/* Build the ordered block list from turns. */
function blocks(){
  var t=STATE.turns, out=[], i;
  if(STATE.meta){ out.push({key:'meta', sig:JSON.stringify(STATE.meta), html:function(){ return '<div class="meta"><span>'+esc(STATE.meta)+'</span></div>'; }}); }
  if(!t.length) return out;
  var first=t[0];
  // first assistant turn = the solution section
  var si=-1;
  for(i=1;i<t.length;i++){ if(t[i].role==='assistant'){ si=i; break; } }
  // The AI's restatement of the problem, typeset — the confirm-read loop.
  var sdata=(si>=0 && !t[si].pending && !t[si].error)?parse(t[si].text):null;
  var readProblem=(sdata && typeof sdata.problem==='string' && sdata.problem.trim())?sdata.problem.trim():null;
  PREAD=readProblem||'';
  out.push({key:'prob:'+first.id, sig:first.text+'|'+(first.imageUri||'')+'|'+(readProblem||''), html:function(){
    var ar=(first.imageW&&first.imageH)?(first.imageW+'/'+first.imageH):'4/3';
    var body=first.imageUri
      ?'<div class="imgbox" style="aspect-ratio:'+ar+'"><img src="'+esc(first.imageUri)+'" onload="this.classList.add(\\'ld\\')"></div>'
      :'<div class="ptx">'+esc(first.text||L.photoProblem)+'</div>';
    var read=readProblem?('<div class="pread"><span class="rl">'+esc(L.readAs)+'</span><span class="rm">'+tex(readProblem)+'</span><span class="pfix" onclick="pfix()">'+esc(L.fix)+'</span></div>'):'';
    return '<div class="prob"><span class="lbl">'+esc(L.problem)+'<span class="src">'+esc(first.imageUri?'FOTO':'SCRIS')+'</span></span>'+body+read+'</div>';
  }});
  if(si>=0){
    var st=t[si];
    var v=STATE.verifying[st.id]||'';
    out.push({key:'sol:'+st.id, sig:(st.pending?'P':st.error?'E':st.text)+'|'+v, phase:st.pending?'P':(st.error?'E':'C'), turn:st, html:function(){
      if(st.pending) return '<div class="sec"><span class="lbl">'+esc(L.solution)+'</span>'+pendHtml()+'</div>';
      if(st.error) return '<div class="sec"><span class="lbl">'+esc(L.solution)+'</span><div class="errb"><div class="et">'+esc(st.text)+'</div><span class="retry" onclick="retry()">↻ '+esc(L.retry)+'</span></div></div>';
      return '<div class="sec"><span class="lbl">'+esc(L.solution)+'</span>'+solutionHtml(st, v, !STATE.cold && !KNOWN['sol:'+st.id])+'</div>';
    }});
  }
  // remaining turns pair into annotations: user question + assistant reply
  for(i=(si>=0?si+1:1); i<t.length; i++){
    var u=t[i];
    if(u.role!=='user') continue;
    var a=(i+1<t.length && t[i+1].role==='assistant')?t[i+1]:null;
    var sig=u.text+'|'+(a?(a.pending?'P':a.error?'E':a.text):'-');
    var phase=a?(a.pending?'P':(a.error?'E':'C')):'Q';
    (function(u,a,phase){
      out.push({key:'qa:'+u.id, sig:sig, phase:phase, html:function(){
        var inner='<div class="q">'+esc(L.you)+': '+esc(u.text)+'</div>';
        if(a){
          if(a.pending) inner+='<div class="a">'+pendHtml()+'</div>';
          else if(a.error) inner+='<div class="a"><div class="et" style="color:${c.danger}">'+esc(a.text)+'</div><span class="retry" onclick="retry()">↻ '+esc(L.retry)+'</span></div>';
          else inner+='<div class="a">'+md(a.text)+'</div>';
        }
        return '<div class="qa">'+inner+'</div>';
      }});
    })(u,a,phase);
    if(a) i++;
  }
  return out;
}

function render(){
  var doc=document.getElementById('doc');
  var list=blocks();
  var keys={};
  list.forEach(function(b){ keys[b.key]=true; });
  // remove stale nodes
  Array.prototype.slice.call(doc.children).forEach(function(node){
    if(!keys[node.getAttribute('data-key')]) doc.removeChild(node);
  });
  // reconcile in order
  var cursor=0;
  list.forEach(function(b){
    var node=doc.querySelector('[data-key="'+b.key+'"]');
    var fresh=!node;
    if(!node){
      node=document.createElement('div');
      node.setAttribute('data-key',b.key);
      node.innerHTML=b.html();
      typeset(node);
      if(!STATE.cold) node.className='rise';
      doc.insertBefore(node, doc.children[cursor]||null);
      if(!STATE.cold){
        KNOWN[b.key]=b.sig;
        requestAnimationFrame(function(){ node.scrollIntoView({behavior:'smooth',block:b.key.indexOf('qa:')===0?'end':'start'}); });
      }
    } else if(KNOWN[b.key]!==b.sig){
      node.innerHTML=b.html();
      typeset(node);
      // The ANSWER arriving (pending -> content/error) must bring itself into
      // view — the reader asked for it. Minor patches (verify badge) don't move you.
      if(PHASE[b.key]==='P' && b.phase && b.phase!=='P'){
        requestAnimationFrame(function(){ node.scrollIntoView({behavior:'smooth',block:'start'}); });
      }
    }
    KNOWN[b.key]=b.sig;
    if(b.phase) PHASE[b.key]=b.phase;
    cursor=Array.prototype.indexOf.call(doc.children,node)+1;
  });
  everRendered=true;
}

window.setThread=function(json){
  try{ STATE=JSON.parse(json); }catch(e){ return; }
  render();
  if(STATE.cold){ window.scrollTo(0,0); }
};

/* jump-to-latest */
function jumpDown(){ window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}); }
window.addEventListener('scroll',function(){
  var fromBottom=document.body.scrollHeight-window.scrollY-window.innerHeight;
  document.getElementById('jump').style.display = fromBottom>500?'flex':'none';
},{passive:true});
</script></body></html>`
}

export default function ThreadDocument({
  turns,
  verifying,
  cold,
  meta,
  labels,
  onChip,
  onVerifyTap,
  onRetry,
  onCancel,
  onAction,
  onFixProblem,
}: {
  turns: DocTurn[]
  verifying: Record<string, VerifyStage | 'check' | 'recheck'>
  /** true when this document shows a loaded (history) conversation. */
  cold: boolean
  meta: string | null
  labels: DocLabels
  onChip?: (id: string) => void
  onVerifyTap?: (v: 'verified' | 'unverified') => void
  onRetry?: () => void
  onCancel?: () => void
  onAction?: (kind: 'copy' | 'share', turnId: string) => void
  /** "Fix it" on the read-back problem: restart with the corrected text. */
  onFixProblem?: (problemLatex: string) => void
}) {
  const { theme } = useTheme()
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

  const html = useMemo(
    () => buildDocHtml(theme.colors, labels, !!assetBase),
    // labels are language-stable; the doc shell never rebuilds mid-conversation
    [theme.colors, JSON.stringify(labels), assetBase],
  )

  const webRef = useRef<WebView>(null)
  const loadedRef = useRef(false)
  const stateRef = useRef({ turns, verifying, cold, meta })
  stateRef.current = { turns, verifying, cold, meta }
  const shownRef = useRef('')
  const sync = () => {
    if (!loadedRef.current) return
    const s = stateRef.current
    const payload = JSON.stringify({
      turns: s.turns.map((t) => ({
        id: t.id,
        role: t.role,
        text: t.text,
        imageUri: t.imageUri,
        imageW: t.imageW,
        imageH: t.imageH,
        pending: !!t.pending,
        error: !!t.error,
      })),
      verifying: s.verifying,
      cold: s.cold,
      meta: s.meta,
    })
    if (payload === shownRef.current) return
    shownRef.current = payload
    webRef.current?.injectJavaScript(`window.setThread(${JSON.stringify(payload)}); true;`)
  }
  useEffect(sync, [turns, verifying, cold, meta])

  if (assetBase === undefined) return null // resolves at boot, before any thread exists

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html, baseUrl: assetBase ?? undefined }}
      style={styles.web}
      overScrollMode="never"
      allowFileAccess
      allowFileAccessFromFileURLs
      allowingReadAccessToURL={assetBase ?? undefined}
      showsVerticalScrollIndicator={false}
      javaScriptEnabled
      onLoadEnd={() => {
        loadedRef.current = true
        sync()
      }}
      onMessage={(e) => {
        const d = e.nativeEvent.data
        if (d.startsWith('C:')) onChip?.(d.slice(2))
        else if (d.startsWith('V:')) {
          const v = d.slice(2)
          if (v === 'verified' || v === 'unverified') onVerifyTap?.(v)
        } else if (d.startsWith('R:')) onRetry?.()
        else if (d.startsWith('X:')) onCancel?.()
        else if (d.startsWith('P:')) onFixProblem?.(d.slice(2))
        else if (d.startsWith('A:')) {
          const rest = d.slice(2)
          const sep = rest.indexOf(':')
          const kind = rest.slice(0, sep)
          if (kind === 'copy' || kind === 'share') onAction?.(kind, rest.slice(sep + 1))
        }
      }}
    />
  )
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
})
