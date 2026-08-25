/**
 * THE CLOSING BAND (2026-08-21).
 *
 * Sarah, looking at the bottom of a live demo: "add more contrast and
 * personality to the bottom of the page where booking and footer is, kinda
 * drags. make it way more artistic and beautiful."
 *
 * She is right, and the reason is structural rather than per-site. Every build
 * spends its craft budget on the hero and the middle of the page, then lands the
 * booking section and the footer in the same tone as everything above them. The
 * page never changes temperature, so it does not finish, it just stops. The best
 * hospitality and product sites of the year all do the opposite: the last screen
 * flips to deep ink, the type gets bigger rather than smaller, and one accent
 * gesture carries the eye to the single thing they want you to do.
 *
 * This gives every site that ending at serve time, in its OWN colors, with no
 * rebuild. It reads the palette the build already published in
 * <meta name="mms-palette"> and derives the band from it, so a warm terracotta
 * restaurant and a cold steel fabricator each get an ending that looks like it
 * was designed for them, because it was drawn from their own accent.
 *
 * WHY THIS RUNS IN THE BROWSER AND NOT AS A STRING REWRITE.
 * These are 109 bespoke documents. Blanket-inverting a footer in the HTML is the
 * trap this repo already has a scar for: set a dark background and every child
 * that carried its own dark color becomes invisible ink on ink, which is worse
 * than the flat ending it replaced. A script can MEASURE. It reads each
 * descendant's computed color, works out the contrast against the new
 * background, and only overrides the ones that would actually become unreadable.
 * Everything already legible is left exactly as the build drew it.
 *
 * States it has to survive, all of them real in the table:
 *   - no palette meta (2 of 109): derive from the page's own background instead
 *   - no <footer> (7 of 109): treat the last section as the band
 *   - a band that is ALREADY dark: do not invert it, just add the depth
 *   - reduced motion: every animation here is decoration, so it all stops
 *   - touch and small screens: the bloom scales, the type does not overflow
 */

const MARKER = 'mms-closing-band';

const SCRIPT = `<script data-${MARKER}>
(function(){
  try{
    var MIN_CONTRAST=4.6;

    /* ---------- color helpers, all sRGB, no dependencies ---------- */
    function parse(c){
      if(!c) return null;
      var m=c.match(/rgba?\\(([^)]+)\\)/i);
      if(m){
        var p=m[1].split(',').map(function(s){return parseFloat(s);});
        if(p.length>3&&p[3]===0) return null;
        return {r:p[0],g:p[1],b:p[2]};
      }
      m=c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if(!m) return null;
      var h=m[1];
      if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
    }
    function lum(c){
      function ch(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }
      return 0.2126*ch(c.r)+0.7152*ch(c.g)+0.0722*ch(c.b);
    }
    function contrast(a,b){
      var l1=lum(a), l2=lum(b);
      return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    }
    function rgb(c){ return 'rgb('+Math.round(c.r)+','+Math.round(c.g)+','+Math.round(c.b)+')'; }
    function rgba(c,a){ return 'rgba('+Math.round(c.r)+','+Math.round(c.g)+','+Math.round(c.b)+','+a+')'; }
    function mix(a,b,t){ return {r:a.r+(b.r-a.r)*t, g:a.g+(b.g-a.g)*t, b:a.b+(b.b-a.b)*t}; }

    /* The ink is the accent driven far down toward black but never TO black:
       keeping a trace of their hue is the whole difference between "a dark
       footer" and "their dark footer". */
    /* ---------- NO BROWN, EVER (2026-08-25) ----------
       Sarah: "i hate brown - please take brown off now and never use it anywhere
       again."

       Brown is not a colour anyone here CHOSE. It is what darkening a warm accent
       produces, and inkFrom darkens the accent by 86% to build the closing band.
       An orange accent (#F27C21, the South Florida Roofing site) came out at
       #221105, which is chocolate, and it was painted as a full-width field
       across the bottom of the page. Every demo with a warm accent, and warm is
       most of them, had a brown ending.

       So brown is DEFINED and then removed, rather than blocklisted. It is the
       warm hues (20-50 degrees) that are dark or dull. Deliberately NOT caught:
       terracotta and brick (below 20 degrees), vivid orange and gold (saturation
       above 0.70), and warm greys (saturation under 0.18). Those read as colours;
       brown reads as mud. A colour that fails the test is pulled toward its own
       neutral, which keeps its lightness exactly and drops the hue out of it. */
    function hslOf(c){
      var r=c.r/255,g=c.g/255,b=c.b/255;
      var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
      if(mx===mn) return {h:0,s:0,l:l};
      var d=mx-mn;
      var sat=l>0.5?d/(2-mx-mn):d/(mx+mn);
      var h;
      if(mx===r) h=((g-b)/d+(g<b?6:0)); else if(mx===g) h=((b-r)/d+2); else h=((r-g)/d+4);
      return {h:h*60,s:sat,l:l};
    }
    function isBrown(c){
      var q=hslOf(c);
      if(q.s<0.18) return false;      /* warm grey, taupe, stone */
      if(q.h<20||q.h>50) return false; /* brick and terracotta below, lime above */
      if(q.l<=0.12) return q.s>=0.40;  /* saturated warm near-black reads brown at field size */
      if(q.l<=0.50) return q.s<=0.70;  /* chocolate, umber, coffee; above 0.70 it is rust */
      if(q.l<=0.62) return q.s<=0.60;  /* mid tan; above 0.60 it is orange */
      if(q.l<=0.82) return q.s>=0.30&&q.s<=0.55; /* tan and khaki, but NOT bone or cream */
      return false;
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
    /* A SURFACE is pulled to its own grey. Lightness is preserved exactly, so
       every contrast decision made around it still holds; only the mud comes out.
       Right for a full-width dark field, where a hint of hue is all it ever had. */
    function deBrown(c){
      if(!c||!isBrown(c)) return c;
      var g=c.r*0.2126+c.g*0.7152+c.b*0.0722;
      var out=mix(c,{r:g,g:g,b:g},0.86);
      return isBrown(out)?{r:g,g:g,b:g}:out;
    }
    /* An ACCENT is lifted OUT of brown instead, never greyed. Greying it would
       leave the one mark carrying the brand as a smear of charcoal. Brown is dark
       or dull orange, so brightening and saturating it at the same hue lands it
       back on the vivid amber it was always trying to be: #a85c22 becomes a clean
       orange, not a grey. */
    function unbrownAccent(c){
      if(!c||!isBrown(c)) return c;
      var q=hslOf(c);
      return fromHsl({h:q.h,s:Math.max(q.s,0.80),l:Math.max(q.l,0.56)});
    }
    function inkFrom(accent){
      var deep=mix(accent,{r:0,g:0,b:0},0.86);
      // Guarantee it is genuinely dark even if the accent was near-black already.
      if(lum(deep)>0.08) deep=mix(deep,{r:0,g:0,b:0},0.5);
      return deBrown(deep);
    }

    /* ---------- read what the build published about itself ---------- */
    var accent=null, pageBg=null;
    var meta=document.querySelector('meta[name="mms-palette"]');
    if(meta){
      try{
        var j=JSON.parse(meta.getAttribute('content'));
        accent=parse(j.accent); pageBg=parse(j.bg);
      }catch(e){}
    }
    if(!pageBg) pageBg=parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255};
    if(!accent){
      // No palette meta: borrow the most saturated color the page uses on a link.
      var probe=document.querySelector('a[href]');
      accent=(probe&&parse(getComputedStyle(probe).color))||mix(pageBg,{r:0,g:0,b:0},0.7);
    }

    /* ---------- find the band ---------- */
    var foot=document.querySelector('footer');
    var parts=[];
    if(foot) parts.push(foot);
    // The booking section is almost never the footer's sibling: these builds wrap
    // their content in <main> and hang the footer off <body>, so walking back one
    // element lands on <main> and the CTA is missed entirely (found on Abruzzo).
    // Search the document for CTA-signed sections and take the LAST one, then
    // require that it really is at the end of the page rather than a mid-page
    // contact block.
    var CTA=/(book|reserve|contact|quote|estimate|schedule|appoint|visit|cta|get-?started|enquir|inquir)/i;
    var secs=document.querySelectorAll('section,[class*="sect"]');
    var cand=null;
    for(var s=secs.length-1;s>=0;s--){
      var el=secs[s];
      if(foot&&foot.contains(el)) continue;
      var sig=(el.id||'')+' '+(el.className||'');
      if(!CTA.test(sig)) continue;
      // Only the ending counts: it has to start in the last third of the page.
      if(el.offsetTop < document.body.scrollHeight*0.6) continue;
      cand=el; break;
    }
    if(!cand&&!foot){
      var any=document.querySelectorAll('section');
      cand=any.length?any[any.length-1]:null;
    }
    if(cand&&cand!==foot) parts.unshift(cand);
    if(!parts.length){
      var all=document.querySelectorAll('section');
      if(all.length) parts.push(all[all.length-1]);
    }
    if(!parts.length) return;

    /* ---------- is it already dark? ---------- */
    function bgOf(el){
      var n=el;
      while(n&&n!==document.documentElement){
        var c=parse(getComputedStyle(n).backgroundColor);
        if(c) return c;
        n=n.parentElement;
      }
      return pageBg;
    }
    var wasDark=lum(bgOf(parts[0]))<0.18;
    var ink=inkFrom(accent);
    // CONTINUITY. If the section ABOVE the band is already dark, an accent-derived
    // ink introduces a second dark hue and the ending reads as a color switch
    // rather than a deepening (Sappari: a burgundy strip butted under a dark green
    // section). Carry that color down instead, one shade deeper.
    if(!wasDark){
      try{
        // The DOM sibling is the wrong thing to ask: it is <main>, which paints
        // nothing, so the lookup walks up to <body> and reports the light page
        // color. What matters is the last surface actually PAINTED above the
        // boundary, so find the element whose bottom edge lands on the band's top.
        var top=parts[0].getBoundingClientRect().top+window.scrollY;
        var ab=null, bestGap=64;
        var all=document.body.getElementsByTagName('*');
        for(var z=0;z<all.length;z++){
          var e3=all[z];
          if(e3===parts[0]||parts[0].contains(e3)||e3.contains(parts[0])) continue;
          var own=parse(getComputedStyle(e3).backgroundColor);
          if(!own) continue;
          var rr=e3.getBoundingClientRect();
          if(rr.width<window.innerWidth*0.5) continue;   // must be a full-bleed surface
          var d=Math.abs((rr.bottom+window.scrollY)-top);
          if(d<bestGap){ bestGap=d; ab=own; }
        }
        if(ab&&lum(ab)<0.16) ink=mix(ab,{r:0,g:0,b:0},0.35);
      }catch(e){}
    }
    /* A build that chose its own dark ending is normally left alone. Not when
       what it chose was brown: Moose's Saloon (#170d06) and Agave Cantina
       (#1D120B) both ended on chocolate of their own accord. wasDark spares the
       LAYOUT, not the mud, so the background is repainted in that one case. */
    var rawBandBg=wasDark?bgOf(parts[0]):ink;
    var bandBg=deBrown(rawBandBg);
    var repaintDarkBand=wasDark&&(bandBg.r!==rawBandBg.r||bandBg.g!==rawBandBg.g||bandBg.b!==rawBandBg.b);
    var onBand=mix(bandBg,{r:255,g:255,b:255},0.94);

    /* A grain plate. Flat ink photographs as a dead rectangle; a few percent of
       noise is what makes it read as a printed surface instead of a CSS color. */
    var GRAIN="url(\\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3'/><feColorMatrix type='saturate' values='0'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.42'/></svg>\\")";

    accent=unbrownAccent(accent);
    var glow=deBrown(mix(accent,{r:255,g:255,b:255},0.32));
    var css=document.createElement('style');
    css.setAttribute('data-${MARKER}','');
    css.textContent=
      '[data-mms-band]{position:relative;isolation:isolate;'+((wasDark&&!repaintDarkBand)?'':'background:'+rgb(bandBg)+' !important;')+'}'+
      /* Two blooms, anchored to opposite corners so the field has a direction.
         The first is the light source, the second only keeps the far corner from
         going dead flat. Both are large: a small gradient reads as a smudge. */
      '[data-mms-band]::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;'+
        'background:radial-gradient(140% 120% at 8% 118%, '+rgba(accent,0.42)+' 0%, '+rgba(accent,0.10)+' 34%, transparent 66%),'+
        'radial-gradient(100% 90% at 96% -10%, '+rgba(glow,0.20)+' 0%, transparent 60%);}'+
      '[data-mms-band]::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.055;'+
        'background-image:'+GRAIN+';background-size:140px 140px;mix-blend-mode:overlay;}'+
      '[data-mms-band] > *{position:relative;z-index:1;}'+
      /* THE SEAM. One continuous field, so the CTA and the footer stop reading as
         two stacked boxes with a dead strip between them. */
      '[data-mms-band][data-mms-band-first]{padding-top:clamp(4rem,9vw,7.5rem);padding-bottom:clamp(2rem,4vw,3.5rem);}'+
      '[data-mms-band][data-mms-band-last]{padding-top:clamp(2.5rem,5vw,4rem);}'+
      '[data-mms-band][data-mms-band-joined]{margin-top:0 !important;border-top:0 !important;}'+
      /* THE EDGE. A lit hairline the full width, so the ending announces itself
         instead of arriving. It draws in when the band scrolls into view. */
      '[data-mms-band-rule]{position:absolute;top:0;left:0;right:0;height:1px;z-index:3;pointer-events:none;'+
        'background:linear-gradient(90deg,'+rgba(accent,0)+' 0%,'+rgb(accent)+' 18%,'+rgb(glow)+' 46%,'+rgba(accent,0.35)+' 78%,'+rgba(accent,0)+' 100%);'+
        'box-shadow:0 0 18px 1px '+rgba(accent,0.55)+';'+
        'transform:scaleX(0);transform-origin:left;transition:transform 1200ms cubic-bezier(.16,1,.3,1);}'+
      '[data-mms-band-rule][data-on]{transform:scaleX(1);}'+
      /* THE CRESCENDO. The ending is where the type gets bigger, not smaller. */
      '[data-mms-band] h1,[data-mms-band] h2,[data-mms-band] h3{letter-spacing:-.025em;line-height:1.02;}'+
      '[data-mms-band][data-mms-band-first] h1,[data-mms-band][data-mms-band-first] h2{font-size:clamp(2.5rem,7vw,5rem);}'+
      '[data-mms-band-hero]{font-size:clamp(2.1rem,5.4vw,3.9rem) !important;line-height:1.03 !important;letter-spacing:-.03em !important;}'+
      '[data-mms-band] a[data-mms-band-link]{position:relative;text-decoration:none;}'+
      '[data-mms-band] a[data-mms-band-link]::after{content:"";position:absolute;left:0;right:0;bottom:-.2em;height:1px;'+
        'background:'+rgb(glow)+';transform:scaleX(0);transform-origin:left;'+
        'transition:transform 420ms cubic-bezier(.16,1,.3,1);}'+
      '[data-mms-band] a[data-mms-band-link]:hover{color:'+rgb(glow)+' !important;}'+
      '[data-mms-band] a[data-mms-band-link]:hover::after{transform:scaleX(1);}'+
      '@media (prefers-reduced-motion: reduce){[data-mms-band-rule]{transition:none;transform:scaleX(1);}'+
        '[data-mms-band] a[data-mms-band-link]::after{transition:none;}}';
    document.head.appendChild(css);

    parts.forEach(function(el,i){
      el.setAttribute('data-mms-band','');
      if(i===0) el.setAttribute('data-mms-band-first','');
      if(i===parts.length-1&&parts.length>1) el.setAttribute('data-mms-band-last','');
    });

    /* THE DEAD GAP. Abruzzo left roughly 120px of nothing between the booking
       card and the footer, which is most of what "drags" actually looked like.
       If the two halves of the band are the same field, close the seam: trim any
       slack the CTA section was carrying and drop the footer's own top border. */
    if(parts.length>1){
      try{
        var a=parts[0], b=parts[parts.length-1];
        var gap=b.getBoundingClientRect().top-a.getBoundingClientRect().bottom;
        if(gap>8&&gap<400) b.setAttribute('data-mms-band-joined','');
        var pb=parseFloat(getComputedStyle(a).paddingBottom||'0');
        if(pb>72) a.style.setProperty('padding-bottom','clamp(2rem,4vw,3.5rem)','important');
      }catch(e){}
    }

    /* the lit edge, drawn in when the ending scrolls into view */
    var rule=document.createElement('span');
    rule.setAttribute('data-mms-band-rule','');
    parts[0].appendChild(rule);
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ rule.setAttribute('data-on',''); } });
      },{threshold:0.15}).observe(parts[0]);
    } else { rule.setAttribute('data-on',''); }

    /* ---------- the hierarchy pass, both cases ----------
       The complaint is not only "too dim", it is "everything is one value".
       Abruzzo's footer is already dark and already legible, and it still reads
       as a dead slab because the name, the address, the hours and the nav all
       sit at the same tone with no accent anywhere. So: lift the heading toward
       white, and give the small uppercase labels the accent they were missing.
       Both are skipped when the build already made that distinction itself. */
    var white={r:255,g:255,b:255};
    /* Is this element standing on a surface the band did not paint? A pale card
       or a pale button inside a dark band keeps its own light background, so
       everything inside it must keep the ink the build chose. */
    function onOwnSurface(el){
      try{ return contrast(bgOf(el),bandBg)>1.35; }catch(e){ return false; }
    }

    /* ---------- CARDS KEEP THE INK THE BUILD GAVE THEM ----------
       Sparing a card from the repaint is only half of it, because color is
       INHERITED and the card's own wrapper is not.
       On South Florida Roofing the booking form is a pale panel inside the
       band. Its wrapper, .book__grid, is transparent and genuinely sits on the
       dark ink, so the pass correctly painted it near-white. The pale form
       inside it sets a background but no color, so it inherited that white, and
       so did every element in it that relies on inheritance. "You are on the
       calendar", the line someone sees the moment they book, computed to 1.07:1
       against its own panel.
       So each card's pre-existing color is captured BEFORE anything is painted
       and pinned back on afterwards. The value is the one the build already
       computed, so the card looks identical; it just stops the band's white from
       cascading through a surface the band never touched. */
    var cards=[];
    if(!wasDark){
      parts.forEach(function(band){
        var els=band.getElementsByTagName('*');
        for(var i=0;i<els.length;i++){
          try{
            var el=els[i], cs0=getComputedStyle(el);
            var own=parse(cs0.backgroundColor);
            if(!own) continue;
            if(contrast(own,bandBg)<=1.35) continue;
            cards.push({el:el,color:cs0.color});
          }catch(e){}
        }
      });
    }

    parts.forEach(function(band,bi){
      var heads=band.querySelectorAll('h1,h2,h3,h4');
      // The note the page should end on is the business name, and it gets the
      // display size the build never gave it. It is NOT reliably a heading: on
      // Abruzzo it is <p class="foot-mark"> at 24.8px with no h-tag in the footer
      // at all. So find the largest piece of text in the band and use that.
      if(bi===parts.length-1){
        try{
          var leaves=band.querySelectorAll('h1,h2,h3,h4,p,span,div,a,strong');
          var best=null, bestFs=0;
          for(var q=0;q<leaves.length;q++){
            var lf=leaves[q];
            if(lf.children.length) continue;
            var txt=(lf.textContent||'').trim();
            if(txt.length<2||txt.length>60) continue;
            var fs=parseFloat(getComputedStyle(lf).fontSize||'0');
            if(fs>bestFs){ bestFs=fs; best=lf; }
          }
          if(best&&bestFs>=17) best.setAttribute('data-mms-band-hero','');
        }catch(e){}
      }
      for(var i=0;i<heads.length;i++){
        try{
          var h=heads[i], hc=parse(getComputedStyle(h).color);
          if(!hc) continue;
          if(onOwnSurface(h)) continue;                  // sits on its own card, not on the band
          if(contrast(hc,bandBg)>=9) continue;           // already the bright thing
          if(contrast(hc,accent)<2) continue;            // deliberately accent-colored
          h.style.setProperty('color',rgb(mix(hc,white,0.72)),'important');
        }catch(e){}
      }
      var small=band.querySelectorAll('span,p,div,li,strong,em,small,dt');
      var lift=mix(accent,white,0.28);
      if(contrast(lift,bandBg)<3.2) lift=mix(accent,white,0.55);
      for(var j=0;j<small.length;j++){
        try{
          var e2=small[j];
          if(e2.children.length) continue;
          var t=(e2.textContent||'').trim();
          if(!t||t.length>44) continue;
          if(onOwnSurface(e2)) continue;               // a label inside a light card is not on the band
          var c2=getComputedStyle(e2);
          var isLabel=(c2.textTransform==='uppercase')&&parseFloat(c2.letterSpacing||'0')>0.4;
          if(!isLabel) continue;
          var cur=parse(c2.color);
          if(cur&&contrast(cur,accent)<2.4) continue;    // already accented
          e2.style.setProperty('color',rgb(lift),'important');
        }catch(e){}
      }
      // The growing underline belongs on every band, not only inverted ones: a
      // flat row of identical nav links is exactly the thing that reads as dead.
      var as=band.querySelectorAll('a[href]');
      var bw=band.getBoundingClientRect().width||1;
      for(var k=0;k<as.length;k++){
        try{
          var a2=as[k], ac2=getComputedStyle(a2);
          if(parse(ac2.backgroundColor)) continue;          // a button is its own surface
          if(!(a2.textContent||'').trim()) continue;
          // Display is the wrong test: Abruzzo's whole footer nav is display:block
          // and skipping it left the six links that most needed lifting untouched.
          // Width is the right one, because what must be spared is the full-bleed
          // card link, not the narrow nav item that happens to be a block.
          if(a2.getBoundingClientRect().width>bw*0.45) continue;
          a2.setAttribute('data-mms-band-link','');
        }catch(e){}
      }
    });

    /* ---------- the contrast pass ----------
       Only touch what the new background actually broke. Anything that still
       reads at 4.6:1 keeps exactly the color the build chose for it. */
    if(!wasDark){
      parts.forEach(function(band){
        var els=band.getElementsByTagName('*');
        for(var i=0;i<els.length;i++){
          var el=els[i];
          if(el.hasAttribute('data-mms-band-rule')) continue;
          try{
            var cs=getComputedStyle(el);
            // THE SURFACE IS INHERITED, AND CHECKING ONLY THIS ELEMENT'S OWN
            // BACKGROUND IS THE BUG THAT SHIPPED (2026-08-25, South Florida
            // Roofing: "the text is white and buttons are white so you cant see
            // what the time windows are").
            //
            // The old test skipped an element that painted its own opaque
            // background, and stopped there. But a continue skips one ELEMENT,
            // not its subtree. The booking form is a pale card and each time
            // window is a pale button; both were correctly spared. Their
            // children are transparent, so the very next iteration measured a
            // <b> reading "Early" against the BAND's dark ink, decided it was
            // unreadable, and painted it near-white, on a near-white chip.
            //
            // A transparent element sits on whatever is painted behind it, so
            // that is what its text has to read against. bgOf() already walks to
            // the nearest painted ancestor; the pass simply never used it.
            var surface=bgOf(el);
            if(contrast(surface,bandBg)>1.35) continue;   // its own card; the band never reached it
            var col=parse(cs.color);
            if(!col) continue;
            if(contrast(col,surface)>=MIN_CONTRAST) continue;
            // Keep accent-ish text accented, just lifted enough to read.
            var toAccent=contrast(col,accent);
            var repl=(toAccent<2.2)?mix(accent,{r:255,g:255,b:255},0.55):onBand;
            if(contrast(repl,surface)<MIN_CONTRAST) repl=onBand;
            el.style.setProperty('color',rgb(repl),'important');
            if(cs.borderTopColor&&parse(cs.borderTopColor)&&contrast(parse(cs.borderTopColor),bandBg)<1.6){
              el.style.setProperty('border-color',rgba(onBand,0.18),'important');
            }
          }catch(e){}
        }
      });
      /* Pin every card back to its own ink, so nothing inside a pale panel
         inherits the band's near-white. Last, so it wins over the passes. */
      for(var ci=0;ci<cards.length;ci++){
        try{ cards[ci].el.style.setProperty('color',cards[ci].color,'important'); }catch(e){}
      }
    }
  }catch(e){}
})();
</script>`;

/**
 * Append the closing-band treatment to a built document. Safe to call twice:
 * the marker attribute makes a second pass a no-op.
 */
export function dressClosingBand(html: string): string {
  if (!html || html.indexOf(`data-${MARKER}`) !== -1) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${SCRIPT}\n</body>`);
  return html + SCRIPT;
}
