/**
 * THE PARKED COMPANION FIX (2026-07-23).
 *
 * Every forged site ships the cursor companion the directive asks for: a small
 * themed glyph (a paw, an anchor, a spray gun, or on the plainer builds just a
 * dot) that rides the pointer, position:fixed, pointer-events:none.
 *
 * The directive never said what that glyph should do when the pointer STOPS, so
 * the builds each guessed, and a lot of them guessed wrong. Observed across the
 * twelve most recent forges:
 *   - three park the glyph ON SCREEN before the visitor has moved the mouse at
 *     all (millender and sons sat one dead centre of the hero photograph at
 *     0.92 opacity; Finer Floors sat one in the hero's top-left corner)
 *   - eleven of twelve freeze the glyph wherever the pointer last stopped, so it
 *     stays stuck on the hero the moment you take your hand off the mouse or
 *     tab away
 * Either way the owner opens their demo and finds a small mark sitting on their
 * hero photograph, which is the first thing they judge the whole build on.
 *
 * This settles them: hidden until the visitor actually moves a fine pointer,
 * faded out when they stop, leave the window, or switch tabs, and never shown
 * on touch. It only ever manages an element it has WATCHED follow the pointer,
 * so a legitimate fixed decoration is left alone.
 *
 * Applied at every surface the forged html reaches a human: the demo route
 * (fixes every site already in the table without a re-forge) and the client
 * publish path (fixes the ones people paid for). New builds are born correct via
 * the companion rules in lib/site-directive.mjs, and the shim is idempotent, so
 * carrying both costs nothing.
 */

const MARKER = 'mms-companion-settle';

const SCRIPT = `<script data-${MARKER}>
(function(){
  try{
    var IDLE=1400, MAX=220, FADE=340;
    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    var candidates=[], followers=[], rects=new WeakMap();
    var woke=false, timer=0, settled=false;

    function isCandidate(el){
      var cs=getComputedStyle(el);
      if(cs.position!=='fixed') return false;
      if(cs.pointerEvents!=='none') return false;
      if((el.textContent||'').trim()!=='') return false;
      var r=el.getBoundingClientRect();
      if(r.width<3||r.height<3||r.width>MAX||r.height>MAX) return false;
      return true;
    }
    function rescan(){
      candidates=[];
      var all=document.body?document.body.getElementsByTagName('*'):[];
      for(var i=0;i<all.length;i++){ try{ if(isCandidate(all[i])) candidates.push(all[i]); }catch(e){} }
      if(!woke) hide(candidates);
    }
    function hide(list){
      for(var i=0;i<list.length;i++){
        var el=list[i];
        el.style.setProperty('transition','opacity '+FADE+'ms ease','important');
        el.style.setProperty('opacity','0','important');
      }
      settled=true;
      setTimeout(function(){
        if(!settled) return;
        for(var i=0;i<list.length;i++) list[i].style.setProperty('visibility','hidden','important');
      },FADE);
    }
    function show(list){
      settled=false;
      for(var i=0;i<list.length;i++){
        var el=list[i];
        el.style.removeProperty('visibility');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transition');
      }
    }
    function snapshot(){
      for(var i=0;i<candidates.length;i++){
        try{ var r=candidates[i].getBoundingClientRect(); rects.set(candidates[i],r.left+','+r.top); }catch(e){}
      }
    }
    function learn(){
      for(var i=0;i<candidates.length;i++){
        var el=candidates[i], was=rects.get(el);
        try{
          var r=el.getBoundingClientRect(), now=r.left+','+r.top;
          if(was!==undefined && was!==now && followers.indexOf(el)<0) followers.push(el);
          rects.set(el,now);
        }catch(e){}
      }
    }
    function rest(){ if(followers.length) hide(followers); }
    function wake(){
      woke=true;
      show(candidates);
      learn();
      clearTimeout(timer);
      timer=setTimeout(rest,IDLE);
    }

    // A rescan walks every element and asks for its computed style, so it is a
    // forced style recalc: run it a bounded handful of times while the page
    // finishes waking up, NEVER on a standing interval. The companions lazy-init
    // after first paint, so one pass at load would miss most of them.
    var PASSES=[400,1200,2500,5000];

    // Touch and coarse pointers never get a cursor companion at all: a glyph
    // that cannot follow anything is just a smudge on the photograph.
    if(!fine){
      rescan(); hide(candidates);
      PASSES.forEach(function(t){ setTimeout(function(){ rescan(); hide(candidates); },t); });
      return;
    }

    rescan();
    snapshot();
    PASSES.forEach(function(t){ setTimeout(function(){ var w=woke; rescan(); if(!w) snapshot(); },t); });

    window.addEventListener('pointermove',wake,{passive:true});
    window.addEventListener('mousemove',wake,{passive:true});
    document.addEventListener('mouseleave',function(){ clearTimeout(timer); rest(); });
    window.addEventListener('blur',function(){ clearTimeout(timer); rest(); });
    document.addEventListener('visibilitychange',function(){ if(document.hidden){ clearTimeout(timer); rest(); } });
  }catch(e){}
})();
</script>`;

/**
 * Append the settle shim to a forged document. Safe to call twice: the marker
 * attribute makes a second pass a no-op.
 */
export function settleCursorCompanions(html: string): string {
  if (!html || html.indexOf(`data-${MARKER}`) !== -1) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${SCRIPT}\n</body>`);
  return html + SCRIPT;
}
