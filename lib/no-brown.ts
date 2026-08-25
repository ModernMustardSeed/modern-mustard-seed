/**
 * NO BROWN, ANYWHERE (2026-08-25).
 *
 * Sarah, looking at a live demo: "i hate brown - please take brown off now and
 * never use it anywhere again."
 *
 * WHY THIS IS A SHIM AND NOT A PROMPT LINE. The design law now forbids choosing
 * brown, which fixes every site built from today. It does nothing for the 143
 * already built and sitting in the cockpit, and rebuilding them would throw away
 * work that is otherwise good over one colour. So brown comes off at serve time,
 * on the way out, the same way the closing band goes on.
 *
 * WHAT BROWN IS, defined so it can be enforced rather than argued about.
 * Brown is not its own wavelength: it is orange/yellow that has been darkened or
 * dulled. That is exactly why a blocklist of hexes could never work, and why the
 * colour kept reappearing without anyone choosing it. The test is hue, lightness
 * and saturation together, and it was calibrated by rendering the real colours
 * out of this repo and the live demos and looking at them:
 *
 *   CAUGHT     #221105 the generated closing band, #8B5A2B saddle, #6F4E37
 *              coffee, #D2B48C tan, #a85c22, #835618, #C8964E brass, #b58a2a
 *   SPARED     #F5B700 mustard, #F27C21 orange, #C2571E and #B4491F terracotta,
 *              #c1290f brick, #221C10 the MMS warm ink, #D6D0C4 bone,
 *              #E4DCC8 cream, #5c554a warm grey
 *
 * Terracotta, brick and rust are deliberately NOT brown. They read as colours a
 * designer picked. Brown reads as mud.
 *
 * WHAT IT NEVER TOUCHES: photographs. This reads computed COLOUR properties
 * only, so the terracotta tiles on a roofing demo and the timber on a builder's
 * site are exactly as generated. Taking brown out of a photograph of a roof
 * would be a defect, not a fix.
 *
 * TWO REPAIRS, because a surface and an accent want opposite things.
 *   A SURFACE is pulled to its own grey: lightness is preserved exactly, so every
 *   contrast relationship on the page still holds and only the mud comes out.
 *   An ACCENT is lifted OUT of brown instead, brightened and saturated at the same
 *   hue, because grey is not an accent. #a85c22 becomes the clean orange it was
 *   always trying to be, and the site keeps its character.
 */

const MARKER = 'mms-no-brown';

const SCRIPT = `<script data-${MARKER}>
(function(){
  try{
    function parse(c){
      if(!c) return null;
      var m=c.match(/rgba?\\(([^)]+)\\)/i);
      if(!m) return null;
      var p=m[1].split(',').map(function(s){return parseFloat(s);});
      if(p.length>3&&p[3]===0) return null;
      return {r:p[0],g:p[1],b:p[2]};
    }
    function rgb(c){ return 'rgb('+Math.round(c.r)+','+Math.round(c.g)+','+Math.round(c.b)+')'; }
    function mix(a,b,t){ return {r:a.r+(b.r-a.r)*t, g:a.g+(b.g-a.g)*t, b:a.b+(b.b-a.b)*t}; }
    function hslOf(c){
      var r=c.r/255,g=c.g/255,b=c.b/255;
      var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
      if(mx===mn) return {h:0,s:0,l:l};
      var d=mx-mn;
      var s=l>0.5?d/(2-mx-mn):d/(mx+mn);
      var h;
      if(mx===r) h=((g-b)/d+(g<b?6:0)); else if(mx===g) h=((b-r)/d+2); else h=((r-g)/d+4);
      return {h:h*60,s:s,l:l};
    }
    function hue2rgb(p,q,t){
      if(t<0)t+=1; if(t>1)t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    }
    function fromHsl(q){
      var h=q.h/360,s=q.s,l=q.l;
      if(s===0) return {r:l*255,g:l*255,b:l*255};
      var v2=l<0.5?l*(1+s):l+s-l*s, v1=2*l-v2;
      return {r:hue2rgb(v1,v2,h+1/3)*255,g:hue2rgb(v1,v2,h)*255,b:hue2rgb(v1,v2,h-1/3)*255};
    }
    function isBrown(c){
      var q=hslOf(c);
      if(q.s<0.18) return false;
      if(q.h<20||q.h>50) return false;
      if(q.l<=0.12) return q.s>=0.40;
      if(q.l<=0.50) return q.s<=0.70;
      if(q.l<=0.62) return q.s<=0.60;
      if(q.l<=0.82) return q.s>=0.30&&q.s<=0.55;
      return false;
    }
    function deBrown(c){
      var g=c.r*0.2126+c.g*0.7152+c.b*0.0722;
      var out=mix(c,{r:g,g:g,b:g},0.86);
      return isBrown(out)?{r:g,g:g,b:g}:out;
    }
    function lift(c){
      var q=hslOf(c);
      var out=fromHsl({h:q.h,s:Math.max(q.s,0.80),l:Math.max(q.l,0.56)});
      return isBrown(out)?deBrown(c):out;
    }

    var SIDES=[['borderTopColor','border-top-color'],['borderRightColor','border-right-color'],
               ['borderBottomColor','border-bottom-color'],['borderLeftColor','border-left-color']];

    function hex(c){
      if(!c) return null;
      var m=c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if(!m) return parse(c);
      var h=m[1];
      if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
    }

    /* Repair choice, and getting it wrong breaks the page.
       #1A1005 is the ink on a filled orange button. It is saturated warm, so a
       naive "saturated means accent" test lifts it to a pale orange and the
       button's own label disappears into the button. A near-black is INK, whatever
       its saturation, and ink gets neutralised. Only a mid-to-light warm is an
       accent doing a job, and only that gets lifted. */
    function repair(c){
      var q=hslOf(c);
      return (q.l>=0.30&&q.s>=0.50) ? lift(c) : deBrown(c);
    }

    /* ---------- THE PALETTE FIRST, THE ELEMENTS SECOND ----------
       These sites drive their whole colour scheme from a dozen custom properties
       on :root, so the honest place to take brown off is the variable. Rewriting
       --btn-ink once fixes every button that reads it, with no specificity fight
       and no inline styles sprayed across the document.
       This matters beyond tidiness: a per-element override of the color property loses to an
       in-flight CSS transition (these buttons transition colour), so the element
       sweep alone could set the right value and still render the old one. A
       variable has no such problem, because everything downstream simply
       recomputes. */
    function rewriteVars(){
      var out=[], seen={};
      for(var s=0;s<document.styleSheets.length;s++){
        var rules; try{ rules=document.styleSheets[s].cssRules; }catch(e){ continue; }
        for(var r=0;r<rules.length;r++){
          var rule=rules[r];
          if(!rule.style||!rule.selectorText) continue;
          if(!/^(:root|html|body)\\b/.test(rule.selectorText)) continue;
          for(var i=0;i<rule.style.length;i++){
            var name=rule.style[i];
            if(name.slice(0,2)!=='--'||seen[name]) continue;
            var c=hex(rule.style.getPropertyValue(name).trim());
            if(!c||!isBrown(c)) continue;
            seen[name]=1;
            out.push(name+':'+rgb(repair(c))+' !important');
          }
        }
      }
      if(!out.length) return 0;
      var st=document.createElement('style');
      st.setAttribute('data-mms-no-brown','');
      st.textContent=':root{'+out.join(';')+'}';
      document.head.appendChild(st);
      return out.length;
    }

    function sweep(){
      var els=document.getElementsByTagName('*');
      var n=0;
      for(var i=0;i<els.length;i++){
        var el=els[i];
        var cs;
        try{ cs=getComputedStyle(el); }catch(e){ continue; }

        var bg=parse(cs.backgroundColor);
        if(bg&&isBrown(bg)){ el.style.setProperty('background-color',rgb(deBrown(bg)),'important'); n++; }

        var col=parse(cs.color);
        if(col&&isBrown(col)){ el.style.setProperty('color',rgb(repair(col)),'important'); n++; }

        for(var k=0;k<SIDES.length;k++){
          var bc=parse(cs[SIDES[k][0]]);
          if(bc&&isBrown(bc)){ el.style.setProperty(SIDES[k][1],rgb(deBrown(bc)),'important'); n++; }
        }
      }
      return n;
    }

    /* TRANSITIONS HAVE TO BE OFF WHILE THIS RUNS, and finding that out cost an
       hour. These buttons carry transition:all, so changing their colour starts a
       transition, and a transitioned value outranks everything in the cascade,
       inline !important included. The repair was correct and simply did not take:
       a FRESH .btn--fill element computed the new neutral ink while the three
       already on the page stayed chocolate, with the right value sitting unused in
       both the variable and the inline style.
       So: kill transitions, repair, then hand them back two frames later. The
       colours land instantly and every hover and focus animation still works. */
    function run(){
      var kill=document.createElement('style');
      kill.setAttribute('data-mms-no-brown','');
      kill.textContent='*,*::before,*::after{transition:none !important;animation-duration:0s !important;}';
      document.head.appendChild(kill);
      rewriteVars();
      sweep();
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ kill.remove(); }); });
    }
    run();
    if(document.readyState!=='complete') window.addEventListener('load',run,{once:true});
    setTimeout(run,600);
  }catch(e){}
})();
</script>`;

/**
 * Take brown off a built document on the way out. Safe to call twice: the
 * marker makes a second pass a no-op.
 */
export function takeBrownOff(html: string): string {
  if (!html || html.indexOf(`data-${MARKER}`) !== -1) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${SCRIPT}\n</body>`);
  return html + SCRIPT;
}
