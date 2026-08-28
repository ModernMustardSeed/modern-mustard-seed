#!/usr/bin/env bash
# Writes the voice standard to every live assistant on the Vapi org.
#
# Sarah runs this herself because the permission classifier will not let an
# agent patch production voice agents unattended, which is the correct default:
# these are live phone lines for paying clients.
#
#   bash scripts/apply-voice-standard.sh          every agent
#   bash scripts/apply-voice-standard.sh "Mr. Mustard"   just one
#
# Safe to re-run. It replaces a marked block at the end of each prompt and
# leaves everything a human wrote above it untouched. Audit first with:
#   node scripts/voice-standard.mjs
set -euo pipefail
cd "$(dirname "$0")/.."
if [ $# -gt 0 ]; then
  node scripts/voice-standard.mjs --apply --only "$1"
else
  node scripts/voice-standard.mjs --apply
fi
echo
echo "Re-auditing:"
node scripts/voice-standard.mjs
