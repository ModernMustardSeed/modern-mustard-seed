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
 *
 * THE BARE DOT IS NOW REMOVED, NOT SETTLED (2026-08-21).
 *
 * The paragraph above tolerates "on the plainer builds just a dot", because when
 * this was written a dot was legal. It is not any more. Sarah, on a live demo:
 * "get rid of the small circle that stays in the same place as you scroll." A
 * settled dot still parks itself over the hero the instant the pointer moves and
 * then holds that spot while the page scrolls under it, which is exactly the
 * complaint. lib/site-directive.mjs banned the glyph the same day, but a law only
 * governs the NEXT build: it cannot reach the sites already in the table, and it
 * does not always land on the one-shot API path either (Underscore Art, forged by
 * the failsafe at 19:32 that evening, came out with a dot two hours after the ban).
 *
 * So the removal lives here instead, where every surface already passes through
 * and no re-forge is needed. Two guards keep it from eating anything real:
 *   - a page carrying data-mms-tool-cursor is left entirely alone, because it was
 *     built under the law and its glyph is a drawn tool with traces that belong
 *   - an element is only ever judged AFTER it has been watched riding the pointer,
 *     and only removed when it has no path, no image, no mask, and is a small
 *     round blank blob. Anything that looks like artwork is settled, not deleted.
 */

const MARKER = 'mms-companion-settle';

const SCRIPT = `<script data-${MARKER}>
(function(){
  try{
    var IDLE=1400, MAX=220, FADE=340, DOT_MAX=64;
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

    // Pages built under the tool-cursor law mark their glyph. Those are correct
    // by construction, so nothing below ever touches them.
    var LAW_OK = !!document.querySelector('[data-mms-tool-cursor]');

    // A BARE DOT, which is the thing the law bans. Deliberately narrow: it only
    // says yes when there is no artwork of any kind, because settling a real
    // tool is harmless and deleting one is not.
    function isBareDot(el){
      try{
        if(el.closest && el.closest('[data-mms-tool-cursor]')) return false;
        // Any drawn shape means someone tried to render a tool. A circle or an
        // ellipse is not a tool, so an svg holding only those still counts bare.
        if(el.querySelector && el.querySelector('path,polygon,polyline,line,text,image,use')) return false;
        var cs=getComputedStyle(el);
        if(cs.backgroundImage && cs.backgroundImage!=='none') return false;
        if(cs.maskImage && cs.maskImage!=='none') return false;
        var r=el.getBoundingClientRect();
        var min=Math.min(r.width,r.height);
        if(min>DOT_MAX) return false;
        // Round enough to read as a dot: a percentage radius at or past 40, or a
        // pixel radius that reaches the element's own halfway mark.
        var br=(cs.borderRadius||'').split(' ')[0].split('/')[0].trim();
        if(!br) return false;
        var round=false;
        if(br.indexOf('%')>0) round=parseFloat(br)>=40;
        else if(br.indexOf('px')>0) round=parseFloat(br)>=(min/2)-1;
        return round;
      }catch(e){ return false; }
    }

    // Permanent, not a fade. The site's own script may keep writing transforms
    // to it; on a display:none element that costs nothing and breaks nothing.
    function kill(el){
      try{
        el.setAttribute('data-mms-dot-removed','');
        el.style.setProperty('display','none','important');
      }catch(e){}
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
          if(was!==undefined && was!==now && followers.indexOf(el)<0){
            // Proven to ride the pointer. That is the only moment we are sure
            // enough to delete one, so the bare-dot check happens here and
            // nowhere else: a fixed decoration that never moved is never judged.
            if(!LAW_OK && isBareDot(el)) kill(el);
            else followers.push(el);
          }
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
