import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('.output/chrome-mv3/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const commands = Object.entries(manifest.commands ?? {});

if (commands.length === 0) {
  throw new Error('The generated manifest does not declare any commands.');
}

let suggestedShortcutCount = 0;

for (const [commandName, command] of commands) {
  const suggested = command.suggested_key;
  if (suggested == null) continue;
  suggestedShortcutCount += 1;

  const platformShortcuts = typeof suggested === 'string' ? { default: suggested } : suggested;
  for (const [platform, shortcut] of Object.entries(platformShortcuts)) {
    validateShortcut(commandName, platform, shortcut);
  }
}

if (suggestedShortcutCount > 4) {
  throw new Error('Chrome permits at most four suggested extension shortcuts.');
}

console.log(`Validated ${suggestedShortcutCount} Chrome command shortcuts in ${manifestPath}`);

function validateShortcut(commandName, platform, shortcut) {
  const keys = shortcut.split('+');
  const hasControl = keys.some((key) => ['Ctrl', 'MacCtrl', 'Command'].includes(key));
  const hasAlt = keys.some((key) => ['Alt', 'Option'].includes(key));
  if (hasControl && hasAlt) {
    throw new Error(
      `${commandName}.${platform} uses forbidden Ctrl+Alt shortcut ${shortcut}. ` +
        'Chrome reserves this combination to avoid AltGr conflicts.',
    );
  }

  const macOnlyModifiers = ['MacCtrl', 'Option', 'Command'];
  if (platform !== 'mac' && keys.some((key) => macOnlyModifiers.includes(key))) {
    throw new Error(`${commandName}.${platform} uses a macOS-only modifier: ${shortcut}`);
  }

  if (!hasControl && !hasAlt) {
    throw new Error(`${commandName}.${platform} must include a Ctrl or Alt modifier: ${shortcut}`);
  }
}
