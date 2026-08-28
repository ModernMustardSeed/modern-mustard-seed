#!/usr/bin/env node
/**
 * A RETIRED TEMPLATE STAYS RETIRED (2026-08-26).
 *
 * Sarah, on the Whitefish Massage Therapy build: "whitefish massage website is
 * terrible, what style is that and can we get rid of whatever it is, so that we
 * dont make that again, i hate all of it." The second half of that sentence is
 * the part a deletion alone does not deliver, so it gets a gate, the same way
 * brown did.
 *
 * A rejected style comes back three ways, and all three are checked:
 *
 *   1. THE KEY IS BACK IN THE REGISTRY. Somebody restores the object, or a
 *      merge resurrects it out of another lane. SITE_TEMPLATES must not contain
 *      a retired key.
 *   2. THE LOOK IS BACK UNDER A NEW NAME. The palette and the type pairing are
 *      what Sarah actually rejected, not the string "wild-reverent". A live
 *      template carrying a retired one's ground AND its display face is the
 *      same style wearing a different label.
 *   3. THE LAW STILL NAMES IT. The directive the builder receives, and the
 *      roster it reads when nothing chose, must not mention a retired key or
 *      name. A builder told to rotate through a list that still has it will
 *      build it.
 *
 * Run:  node scripts/check-retired-templates.mjs
 */
import { SITE_TEMPLATES, RETIRED_TEMPLATES, siteTemplate, isTemplateKey, pickSiteTemplate, templateRosterLaw, siteTemplateDirective } from '../lib/site-templates.mjs';

const problems = [];

if (!Array.isArray(RETIRED_TEMPLATES)) {
  console.error('\nRETIRED_TEMPLATES is missing from lib/site-templates.mjs. The list of styles');
  console.error('Sarah has rejected is not optional, and neither is this gate.\n');
  process.exit(1);
}

const roster = templateRosterLaw();

for (const dead of RETIRED_TEMPLATES) {
  // 1. the key itself
  if (SITE_TEMPLATES.some((t) => t.key === dead.key)) {
    problems.push(`${dead.key} is back in SITE_TEMPLATES. It was retired ${dead.retired}: ${dead.why}`);
  }
  if (siteTemplate(dead.key) || isTemplateKey(dead.key)) {
    problems.push(`siteTemplate("${dead.key}") resolves, so a picker can still choose it`);
  }
  if (siteTemplateDirective(dead.key)) {
    problems.push(`siteTemplateDirective("${dead.key}") returns build law, so a stale row would rebuild it`);
  }

  // 2. the look under another name
  if (dead.palette?.ground && dead.type?.display) {
    for (const t of SITE_TEMPLATES) {
      const sameGround = t.palette.ground.toLowerCase() === dead.palette.ground.toLowerCase();
      const sameDisplay = t.type.display.toLowerCase() === dead.type.display.toLowerCase();
      if (sameGround && sameDisplay) {
        problems.push(
          `${t.key} is ${dead.name} with a new name: same ground ${t.palette.ground} and same display face ${t.type.display}`,
        );
      }
    }
  }

  // 3. the law the builder reads
  for (const [what, text] of [['the rotation roster', roster]]) {
    if (text.includes(dead.key) || text.includes(dead.name)) {
      problems.push(`${what} still names ${dead.name} (${dead.key}), so a builder can pick it`);
    }
  }
}

// Random must never land on one, over enough draws to catch a weighting bug.
const dead = new Set(RETIRED_TEMPLATES.map((t) => t.key));
if (dead.size) {
  let i = 0;
  const rand = () => ((i = (i * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let n = 0; n < 2000; n++) {
    const k = pickSiteTemplate({ trade: null, exclude: [], rand });
    if (dead.has(k)) { problems.push(`Random returned the retired key ${k}`); break; }
  }
}

if (problems.length) {
  console.error('\nA RETIRED TEMPLATE IS BACK:\n');
  for (const p of problems) console.error('  x ' + p);
  console.error('\nRetiring a style means it cannot be built again, not that it was deleted once.');
  console.error('Take it out of SITE_TEMPLATES, leave it in RETIRED_TEMPLATES, and do not rebuild');
  console.error('its palette and type pairing under a different key.\n');
  process.exit(1);
}

console.log(
  `retired templates: ${RETIRED_TEMPLATES.length} held out (${RETIRED_TEMPLATES.map((t) => t.key).join(', ') || 'none'}), ` +
    `${SITE_TEMPLATES.length} live`,
);
