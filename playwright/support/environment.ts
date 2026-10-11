import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export type LocalEnvironment = {
  name: string;
  baseURL: string;
  production: boolean;
  loginRequired: boolean;
  headless?: boolean;
};

export function getEnvironment(projectRoot: string, name?: string): LocalEnvironment {
  const defaults: LocalEnvironment = JSON.parse(
    readFileSync(resolve(projectRoot, 'playwright/support/default-environment.json'), 'utf8'),
  );
  const selected = (name ?? process.env.TESTVIBE_ENVIRONMENT ?? defaults.name).trim();
  const directory = resolve(projectRoot, 'config/environments');
  const file = existsSync(directory)
    ? readdirSync(directory).find(
        (fileName) => fileName.replace(/\.json$/, '').toLowerCase() === selected.toLowerCase(),
      )
    : undefined;
  if (!file && selected.toLowerCase() !== defaults.name.toLowerCase())
    throw new Error('The selected local environment is not configured.');
  const environment: LocalEnvironment = file
    ? JSON.parse(readFileSync(resolve(directory, file), 'utf8'))
    : defaults;
  const url = new URL(environment.baseURL);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('The environment URL is invalid.');
  return environment;
}
