# Installing the Studio Kit

About twenty minutes for the install, and an afternoon to fill in the rules
file properly. Works on Windows 10 and 11 and on macOS 13 or newer.

## What you need first

1. **Claude Code**, signed in. Check by opening a terminal and typing
   `claude --version`. If that fails, install it from
   https://docs.claude.com/en/docs/claude-code and sign in once.
2. **Node.js 20 or newer.** Check with `node --version`. If that fails or shows
   a number below 20, install the LTS version from https://nodejs.org. The
   hooks are small Node scripts, which is what lets one kit run on both
   Windows and macOS.

## Install

### Windows

1. Unzip `studio-kit.zip`. Right-click it, choose Extract All, and note the
   folder.
2. Open PowerShell (Start menu, type PowerShell, press Enter).
3. Go to the folder. If you extracted to Downloads:

   ```powershell
   cd "$env:USERPROFILE\Downloads\studio-kit"
   ```

4. Preview what will change, then install:

   ```powershell
   node install.mjs --dry-run
   node install.mjs
   ```

### macOS

1. Double-click `studio-kit.zip` to unzip it.
2. Open Terminal (Spotlight, type Terminal, press Return).
3. Go to the folder:

   ```bash
   cd ~/Downloads/studio-kit
   ```

4. Preview, then install:

   ```bash
   node install.mjs --dry-run
   node install.mjs
   ```

The installer ends by running the test suite. You should see 47 PASS lines and
`47 of 47 passed.` If any line says FAIL, the reason is printed beside it.

## What it changed

| Where | What |
| --- | --- |
| `~/.claude/studio-kit/` | The ten hooks, your config `studio-kit.json`, and `test.mjs` |
| `~/.claude/settings.json` | The ten hooks registered. A backup sits beside it as `settings.json.bak-<number>` |
| `~/.claude/skills/` | Twelve skills. Any skill you already had by the same name was left alone |
| `~/.claude/CLAUDE.md` | The rules file template, if you had none. If you had one, it is beside yours as `CLAUDE.studio-kit.md` |

On Windows `~` means `C:\Users\<you>`. On macOS it means `/Users/<you>`.

## The first afternoon

1. **Start a new Claude Code session** so it loads the hooks. Type `/hooks` and
   confirm all ten are listed.
2. **Fill in the rules file.** Open `~/.claude/CLAUDE.md`. Replace every
   FILL IN. Read the twenty laws and keep, edit or delete each one.
3. **Set your banned phrases.** Open `~/.claude/studio-kit/studio-kit.json`.
   The defaults suit a business that sells set packages. Change
   `bannedPhrases` to match what your rules file says you never write.
4. **Fill in the brand-voice skill.** Open
   `~/.claude/skills/brand-voice/SKILL.md` and complete its three FILL IN
   blocks.
5. **Run the tests again:** `node ~/.claude/studio-kit/test.mjs`. If you
   changed `bannedPhrases`, the two words-guard cases that test the defaults
   may now fail; that is expected, and means your own list is in charge.
6. **Ask Claude to run the workspace doctor:** type "run the workspace
   doctor". It checks everything above and reports.

## Settings you may want

All in `studio-kit.json`:

- `protectedBranches`: branches nobody force-pushes or deletes.
- `workspaceRoots`: folders where recursive deletes are allowed. Empty means
  the folder Claude was started in.
- `sendCommands`: your own scripts that send email or texts, as patterns, so
  the send guard asks before they run.
- `deployRule`: the sentence Claude is shown when it tries to deploy.

A project can override any of these with its own `.claude/studio-kit.json`.

## Updating

Unzip the new version over the old folder and run `node install.mjs` again.
Your `studio-kit.json`, your rules file and your edited skills are kept. Use
`--force` only if you want the kit's versions of the skills back.

## Removing

```
node install.mjs --uninstall
```

Takes the ten hooks out of `settings.json` and keeps a backup. Your rules
file, skills and audit trail stay where they are.

## When something is blocked

That is the kit working. Claude reads the reason and changes its approach. If
you are certain the action is right, do it yourself in your own terminal, or
adjust the rule in `studio-kit.json`. Never delete a hook to get past it once;
a guard switched off on a busy day is a guard that is off for good.

## Help

Questions during the run go in your bootcamp room. After it, write
sarah@modernmustardseed.com with "Studio Kit" in the subject.
