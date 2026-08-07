import { describe, expect, it } from 'vitest';
import type { UserManifest } from 'wxt';
import config from '../wxt.config';

describe('Chrome command shortcuts', () => {
  it('uses Chrome-valid defaults on every platform', () => {
    const manifest = config.manifest as UserManifest;

    const commands = manifest?.commands;
    const model = commands?.['cycle-model']?.suggested_key;
    const reasoning = commands?.['cycle-reasoning']?.suggested_key;

    expect(model).toEqual({ default: 'Ctrl+Shift+M', mac: 'MacCtrl+Shift+M' });
    expect(reasoning).toEqual({ default: 'Ctrl+Shift+H', mac: 'MacCtrl+Shift+H' });
  });
});
