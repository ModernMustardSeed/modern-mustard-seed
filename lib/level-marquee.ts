/**
 * THE STRIPE RUNS LEVEL (2026-08-24).
 *
 * Sarah, on the forged sites: "the stripe block that has words auto scrolling,
 * its not straight horizontal, its at a diagonal and gets squeezed between the
 * other 2 blocks and text becomes illegible."
 *
 * She is describing one construction the fleet reaches for over and over, in
 * two different disguises, and both of them cut the words:
 *
 *   Wild Horse   .marquee{transform:rotate(-1.1deg);margin:-26px 0;padding:17px 0}
 *   Kyler's      .marq{clip-path:polygon(0 15px,100% 0,100% calc(100% - 15px),0 100%);margin:-15px 0}
 *
 * The tilt is the same idea each time: lean the band a degree or two, then pull
 * it under its neighbours with negative margins so the seam looks deliberate.
 * The neighbours win. A 17px band with -26px of margin on both edges is a band
 * with 26px of somebody else's section lying across it, top and bottom, and the
 * rotation means the buried amount changes across the width, so the words go
 * under at one end and come out at the other. It reads as broken, because it is.
 *
 * WHY THIS RUNS IN THE BROWSER RATHER THAN AS A STRING REWRITE.
 * Same reason as lib/closing-band.ts: these are bespoke single-file documents
 * with no shared class names, and the tilt lives on a different element in
 * nearly every one (the band, a wrapper around it, sometimes the track itself).
 * A script can MEASURE. It finds the element that is actually moving, walks to
 * the stripe that contains it, and only touches a value that is genuinely
 * wrong: a rotation or skew, a wedge clip, a negative vertical margin on the
 * band or on the section pressed against it. A band that was already level is
 * left exactly as the build drew it.
 *
 * Applied at every surface forged html reaches a human: the demo routes (which
 * fixes every site already in the table without a re-forge) and the publish
 * path (which fixes the ones people paid for). New builds are born level via
 * the third clause of LEGIBILITY_LAW in lib/site-directive.mjs, and this shim
 * is idempotent, so carrying both costs nothing.
 */

const MARKER = 'mms-level-marquee';

const SCRIPT = `<script data-${MARKER}>
(function(){
  try{
    /* A stripe needs real air or the words touch the sections above and below. */
    var MIN_PAD = 22;
    /* Taller than this is a section, not a stripe, and is none of our business. */
    var MAX_BAND = 420;
    var HINT = /marq|ticker|ticktape|scroller|scrolling|conveyor|crawl|beltline|runner/i;

    function css(el){ return el ? window.getComputedStyle(el) : null; }
    function num(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; }

    /* Does this transform carry a rotation or a skew? A pure translate or scale
       is somebody's layout and is left alone; only the tilt is the defect. */
    function tilted(cs){
      if(!cs) return false;
      if(cs.rotate && cs.rotate !== 'none' && num(cs.rotate) !== 0) return true;
      var t = cs.transform;
      if(!t || t === 'none' || t.indexOf('(') === -1) return false;
      var n = t.slice(t.indexOf('(') + 1, t.lastIndexOf(')')).split(',').map(function(s){ return parseFloat(s); });
      if(n.length === 6) return Math.abs(n[1]) > 0.0005 || Math.abs(n[2]) > 0.0005;
      if(n.length === 16) return Math.abs(n[1]) > 0.0005 || Math.abs(n[4]) > 0.0005;
      return false;
    }

    /* The other half of the fleet fakes the same tilt with a wedge clip. Any
       polygon on a stripe is that wedge: a rectangular clip would only be doing
       the job overflow:hidden already does, so nothing here is worth keeping. */
    function wedged(cs){
      var c = cs.clipPath || cs.webkitClipPath || 'none';
      return !!c && c !== 'none' && c.indexOf('polygon') !== -1;
    }

    function level(el){
      if(!el || el === document.body || el === document.documentElement) return false;
      var cs = css(el), changed = false;
      if(tilted(cs)){ el.style.transform = 'none'; el.style.rotate = '0deg'; changed = true; }
      if(wedged(cs)){ el.style.clipPath = 'none'; el.style.webkitClipPath = 'none'; changed = true; }
      if(num(cs.marginTop) < 0){ el.style.marginTop = '0px'; changed = true; }
      if(num(cs.marginBottom) < 0){ el.style.marginBottom = '0px'; changed = true; }
      return changed;
    }

    /* The moving row: a run of words that TRAVELS, forever.
       The gates are each a false positive this had on the fixture:
       - it must carry real words, which drops drifting particles and dust;
       - the animation must translate, which drops the spinning seal (rotate)
         and the breathing CTA (scale) without knowing their class names;
       - it must repeat forever, which drops every reveal-on-scroll entrance.
       Width is NOT a gate. The first cut used one, and a two-span track that
       happened to be narrower than a 1358px window failed it, so the whole
       shim silently did nothing on the very page built to prove it. */
    function isTrack(el){
      var cs = css(el);
      if(!cs || cs.display === 'none') return false;
      if((el.textContent || '').trim().length < 12) return false;
      var named = cs.animationName && cs.animationName !== 'none';
      var forever = (cs.animationIterationCount || '').indexOf('infinite') !== -1;
      if(named && forever){
        var kf = keyframesFor(cs.animationName.split(',')[0].trim());
        if(kf && kf.indexOf('translate') !== -1) return true;
      }
      if(!HINT.test(el.getAttribute('class') || '')) return false;
      return el.scrollWidth > el.clientWidth + 24 || cs.whiteSpace === 'nowrap' || cs.width === 'max-content';
    }

    /* The stripe is the clipping ancestor the track runs inside. */
    function bandOf(track){
      var el = track, depth = 0;
      while(el.parentElement && depth < 4){
        var p = el.parentElement;
        if(p === document.body || p === document.documentElement) break;
        var c = css(p);
        if(c.overflowX === 'hidden' || c.overflowX === 'clip' || c.overflow === 'hidden' || c.overflow === 'clip') return p;
        el = p; depth++;
      }
      var par = track.parentElement;
      return (par && par !== document.body && par !== document.documentElement) ? par : track;
    }

    /* A track that scrolls its words UP instead of ACROSS gets turned back onto
       its side: these are horizontal letterforms, and a column of them crawling
       past is the same illegibility from the other direction. Only a track whose
       keyframes move on Y and nowhere on X qualifies, so a genuine vertical
       rotator is never touched. */
    var levelKeys = null;
    function keyframesFor(name){
      for(var s = 0; s < document.styleSheets.length; s++){
        var rules;
        try{ rules = document.styleSheets[s].cssRules; }catch(e){ continue; }
        if(!rules) continue;
        for(var r = 0; r < rules.length; r++){
          var rule = rules[r];
          if(rule.type === 7 && rule.name === name) return rule.cssText;
        }
      }
      return '';
    }
    function acrossNotUp(track){
      var cs = css(track);
      if(!cs.animationName || cs.animationName === 'none') return false;
      /* Named like a stripe, or left alone. A column of testimonials that
         scrolls upward is a different component and turning it on its side
         would be the bug, not the fix. */
      if(!HINT.test(track.getAttribute('class') || '') && !HINT.test((track.parentElement && track.parentElement.getAttribute('class')) || '')) return false;
      var text = keyframesFor(cs.animationName.split(',')[0].trim());
      if(!text) return false;
      if(text.indexOf('translateX') !== -1 || text.indexOf('translate(') !== -1) return false;
      if(text.indexOf('translateY') === -1 && text.indexOf('translate3d') === -1) return false;
      if(!levelKeys){
        levelKeys = document.createElement('style');
        levelKeys.setAttribute('data-mms-level-keys','');
        levelKeys.textContent = '@keyframes mms-marq-level{from{transform:translateX(0)}to{transform:translateX(-50%)}}';
        document.head.appendChild(levelKeys);
      }
      track.style.animationName = 'mms-marq-level';
      track.style.display = 'flex';
      track.style.flexDirection = 'row';
      track.style.flexWrap = 'nowrap';
      track.style.width = 'max-content';
      track.style.whiteSpace = 'nowrap';
      return true;
    }

    /* Type set on its side is the same complaint with a different cause. */
    function upright(el){
      var changed = false;
      var nodes = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
      for(var i = 0; i < nodes.length && i < 200; i++){
        var c = css(nodes[i]);
        if(c && c.writingMode && c.writingMode !== 'horizontal-tb'){
          nodes[i].style.writingMode = 'horizontal-tb';
          changed = true;
        }
      }
      return changed;
    }

    /* Under prefers-reduced-motion a good build stops the track dead
       (.marq-track{animation:none}), and then nothing on the page is moving to
       find. The band is still tilted and still buried, and the reader who asked
       for less motion is exactly the reader least able to fight for the words.
       So a short, clipping element NAMED like a stripe is levelled on its own. */
    function isStripe(el){
      if(!HINT.test(el.getAttribute('class') || '')) return false;
      if((el.textContent || '').trim().length < 12) return false;
      var h = el.offsetHeight;
      if(h <= 0 || h > MAX_BAND) return false;
      /* The band clips its track. Without this gate the track itself matches
         (its class carries the same word) and the padding lands on the wrong
         element, inside the very box it was meant to open up. */
      var c = css(el);
      return c.overflowX === 'hidden' || c.overflowX === 'clip' || c.overflow === 'hidden' || c.overflow === 'clip';
    }

    function fixTrack(track){
      var band = bandOf(track);
      /* A whole section that happens to contain a marquee is not the stripe. */
      if(band !== track && band.offsetHeight > MAX_BAND) band = track;

      var changed = level(band);
      if(level(track)) changed = true;
      if(acrossNotUp(track)) changed = true;
      if(upright(track)) changed = true;
      fixBand(band, changed);
    }

    function fixBand(band, changed){
      if(level(band)) changed = true;

      /* The tilt is often on a wrapper whose only job is to hold the stripe. */
      var up = band.parentElement, hops = 0;
      while(up && up !== document.body && up !== document.documentElement && up.children.length === 1 && hops < 2){
        if(level(up)) changed = true;
        up = up.parentElement; hops++;
      }

      /* And the neighbours are just as often pulled onto the stripe from their
         own side, which is the "squeezed between the other 2 blocks" half. */
      var before = band.previousElementSibling, after = band.nextElementSibling;
      if(before && num(css(before).marginBottom) < 0){ before.style.marginBottom = '0px'; changed = true; }
      if(after && num(css(after).marginTop) < 0){ after.style.marginTop = '0px'; changed = true; }

      if(!changed) return;

      var bc = css(band);
      if(num(bc.paddingTop) < MIN_PAD) band.style.paddingTop = MIN_PAD + 'px';
      if(num(bc.paddingBottom) < MIN_PAD) band.style.paddingBottom = MIN_PAD + 'px';
      if(bc.overflowX !== 'hidden' && bc.overflowX !== 'clip') band.style.overflow = 'hidden';
      band.setAttribute('data-mms-levelled','');
    }

    function run(){
      var all = document.body ? document.body.querySelectorAll('*') : [];
      for(var i = 0; i < all.length; i++){
        var el = all[i];
        try{
          if(isTrack(el)) fixTrack(el);
          else if(isStripe(el)) fixBand(el, false);
        }catch(e){}
      }
      document.documentElement.setAttribute('data-mms-level-marquee','');
    }

    function boot(){ try{ run(); }catch(e){} }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    /* Again once the webfonts have landed, because a stripe that fit before the
       display face loaded can be squeezed by the one that replaces it. */
    window.addEventListener('load', function(){ setTimeout(boot, 80); });
  }catch(e){}
})();
</script>`;

/**
 * Append the leveller to a forged document. Safe to call twice: the marker
 * attribute makes a second pass a no-op.
 */
export function levelMarquees(html: string): string {
  if (!html || html.indexOf(`data-${MARKER}`) !== -1) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${SCRIPT}\n</body>`);
  return html + SCRIPT;
}
