/**
 * Configuration types for the Instagram MCP server
 */

export interface IServerConfig {
  name: string;
  version: string;
  chromeUserDataDir: string;
  instagram: IInstagramConfig;
  browser: IBrowserConfig;
}

export interface IInstagramConfig {
  defaultSaveDir: string;
  postsLogFile: string;
  defaultDelay: number;
  maxPostsPerBatch: number;
  batchBreakDelay: number;
  minDelay: number;
}

export interface IBrowserConfig {
  headless: boolean;
  windowWidth: number;
  windowHeight: number;
  defaultTimeout: number;
  navigationTimeout: number;
}

export interface IEnvironmentVariables {
  CHROME_USER_DATA_DIR: string;
  [key: string]: string | undefined;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
