/* Assembles the MMS client-experience video from the raw recording.
   Reads recordings/raw.webm + milestones.json, retimes chapters (1x on the
   tools and portal, timelapse through engine waits), overlays the pop-art
   lower-thirds, books with intro/hook/outro cards, and writes:
     recordings/mms-client-experience.mp4 (1920x1080, 30fps, silent AAC — Sarah adds music)

   Usage: node scripts/launch-video/build.mjs
*/
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REC = join(HERE, "recordings");
const CARDS = join(REC, "cards");
const TMP = join(REC, "segments");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const RAW = join(REC, "raw.webm");
const milestones = JSON.parse(readFileSync(join(REC, "milestones.json"), "utf8"));
const has = (label) => milestones.some((x) => x.label === label);
const m = (label) => {
  const hit = milestones.find((x) => x.label === label);
  if (!hit) throw new Error(`milestone ${label} missing`);
  return hit.t / 1000;
};

const ff = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const V = "-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30".split(" ");

const SEGS = [
  { name: "hero",       from: 0.8,                         to: m("hero-scroll") + 2.0,       speed: 1, lt: "lt-home" },
  { name: "audit-form", from: m("audit"),                  to: m("audit-run") + 0.4,         speed: 1, lt: "lt-audit" },
  { name: "audit-wait", from: m("audit-run") + 0.4,        to: m("audit-result") - 0.3,      speed: 5, lt: "lt-audit" },
  { name: "audit-out",  from: m("audit-result") - 0.3,     to: m("audit-scrolled") + 0.6,    speed: 1, lt: "lt-audit-result" },
  { name: "checklist",  from: m("checklist"),              to: m("checklist-scrolled") + 0.8,speed: 1, lt: "lt-checklist" },
  { name: "portal",     from: m("portal") - 0.3,           to: m("portal-billing") + 2.0,    speed: 1, lt: "lt-portal" },
  { name: "portal-deep",from: m("portal-billing") + 2.0,   to: m("portal-files") + 2.2,      speed: 1, lt: "lt-portal-detail" },
];
if (has("assistant-reply")) {
  SEGS.push(
    { name: "assistant",  from: m("portal-files") + 2.2,    to: m("assistant-typed") + 1.0, speed: 1,   lt: "lt-assistant" },
    { name: "asst-reply", from: m("assistant-typed") + 1.0, to: m("assistant-reply") + 1.6, speed: 2.5, lt: "lt-assistant" },
  );
}
SEGS.push({ name: "finale", from: m("end") - 2.2, to: m("end") - 0.1, speed: 1, lt: null });

console.log("1/3 Cutting chapters…");
const parts = [];

const card = (png, dur, { fadeIn = 0.5, fadeOut = 0.5 } = {}) => {
  const out = join(TMP, png.replace(".png", ".mp4"));
  ff([
    "-loop", "1", "-t", String(dur), "-i", join(CARDS, png),
    "-vf", `scale=1920:1080,fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${dur - fadeOut}:d=${fadeOut},format=yuv420p`,
    ...V, out,
  ]);
  parts.push(out);
  console.log(`  ✓ card ${png} (${dur}s)`);
};

card("intro.png", 2.8);
card("hook.png", 3.0);

for (const s of SEGS) {
  const out = join(TMP, `${s.name}.mp4`);
  const dur = (s.to - s.from) / s.speed;
  if (dur <= 0.2) { console.log(`  - skip ${s.name} (too short)`); continue; }
  const filters = [`setpts=PTS/${s.speed}`, "fps=30", "scale=1920:1080"];
  const args = ["-ss", s.from.toFixed(2), "-to", s.to.toFixed(2), "-i", RAW];
  if (s.lt) {
    args.push("-loop", "1", "-i", join(CARDS, `${s.lt}.png`));
    const ltOut = Math.max(0.01, dur - 1.0);
    args.push(
      "-filter_complex",
      `[0:v]${filters.join(",")}[v];` +
      `[1:v]format=rgba,fade=t=in:st=0.35:d=0.45:alpha=1,fade=t=out:st=${ltOut.toFixed(2)}:d=0.6:alpha=1[lt];` +
      `[v][lt]overlay=0:0:shortest=1[out]`,
      "-map", "[out]",
    );
  } else {
    args.push("-vf", filters.join(","));
  }
  ff([...args, ...V, out]);
  parts.push(out);
  console.log(`  ✓ ${s.name}  ${s.from.toFixed(1)}→${s.to.toFixed(1)}s @${s.speed}x → ${dur.toFixed(1)}s`);
}

card("outro.png", 4.5, { fadeIn: 0.5, fadeOut: 0.9 });

console.log("\n2/3 Concatenating…");
const list = join(TMP, "list.txt");
writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
const joined = join(TMP, "joined.mp4");
ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);

console.log("3/3 Final encode (silent AAC + faststart)…");
const FINAL = join(REC, "mms-client-experience.mp4");
ff([
  "-i", joined,
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
  "-movflags", "+faststart", FINAL,
]);

console.log(`\n✓ ${FINAL}`);
