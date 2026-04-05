import { homedir } from 'os';
import { resolve } from 'path';

export function getAppHomeDir(): string {
  return process.env.ANTIGRAVITY_HOME
    ? resolve(process.env.ANTIGRAVITY_HOME)
    : homedir();
}
