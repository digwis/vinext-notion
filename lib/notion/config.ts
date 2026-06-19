type NotionEnv = {
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
  NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID?: string;
  NOTION_API_BASE_URL?: string;
  NOTION_EDIT_BASE_URL?: string;
};

export type NotionClientConfig = {
  token: string;
  apiBaseUrl?: string;
};

export type NotionConfig = {
  token: string;
  dataSourceId: string;
  apiBaseUrl?: string;
  editBaseUrl?: string;
};

function readProcessEnv(): NotionEnv {
  return {
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_DATA_SOURCE_ID: process.env.NOTION_DATA_SOURCE_ID,
    NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID:
      process.env.NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID,
    NOTION_API_BASE_URL: process.env.NOTION_API_BASE_URL,
    NOTION_EDIT_BASE_URL: process.env.NOTION_EDIT_BASE_URL,
  };
}

async function readWorkerEnv(): Promise<NotionEnv> {
  try {
    const mod = (await import(
      /* webpackIgnore: true */ "cloudflare:workers"
    )) as { env?: NotionEnv };
    return mod.env ?? {};
  } catch {
    return {};
  }
}

function readString(source: NotionEnv, name: keyof NotionEnv): string | undefined {
  const value = String(source[name] ?? "").trim();
  return value || undefined;
}

function mergeEnv(...sources: NotionEnv[]): NotionEnv {
  const merged: NotionEnv = {};
  const names: (keyof NotionEnv)[] = [
    "NOTION_TOKEN",
    "NOTION_DATA_SOURCE_ID",
    "NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID",
    "NOTION_API_BASE_URL",
    "NOTION_EDIT_BASE_URL",
  ];

  for (const source of sources) {
    for (const name of names) {
      const value = readString(source, name);
      if (value) merged[name] = value;
    }
  }

  return merged;
}

async function readEnv(): Promise<NotionEnv> {
  const processEnv = readProcessEnv();
  return mergeEnv(await readWorkerEnv(), processEnv);
}

function readRequired(
  source: NotionEnv,
  name: "NOTION_TOKEN" | "NOTION_DATA_SOURCE_ID"
): string {
  const value = readString(source, name);
  if (!value) {
    throw new Error(`Missing required Notion env: ${name}`);
  }
  return value;
}

export function getNotionEditBaseUrl(): string {
  return readString(readProcessEnv(), "NOTION_EDIT_BASE_URL") ?? "https://www.notion.so";
}

export async function hasNotionConfig(): Promise<boolean> {
  const env = await readEnv();
  return Boolean(
    readString(env, "NOTION_TOKEN") && readString(env, "NOTION_DATA_SOURCE_ID")
  );
}

export async function getNotionClientConfig(): Promise<NotionClientConfig> {
  const env = await readEnv();
  return {
    token: readRequired(env, "NOTION_TOKEN"),
    apiBaseUrl: readString(env, "NOTION_API_BASE_URL"),
  };
}

export async function getNotionConfig(): Promise<NotionConfig> {
  const env = await readEnv();
  return {
    token: readRequired(env, "NOTION_TOKEN"),
    dataSourceId: readRequired(env, "NOTION_DATA_SOURCE_ID"),
    apiBaseUrl: readString(env, "NOTION_API_BASE_URL"),
    editBaseUrl: readString(env, "NOTION_EDIT_BASE_URL"),
  };
}

export async function getNotionPostTranslationConfig(): Promise<NotionConfig | null> {
  const env = await readEnv();
  const dataSourceId = readString(
    env,
    "NOTION_POSTS_TRANSLATIONS_DATA_SOURCE_ID"
  );
  if (!dataSourceId) return null;
  return {
    token: readRequired(env, "NOTION_TOKEN"),
    dataSourceId,
    apiBaseUrl: readString(env, "NOTION_API_BASE_URL"),
    editBaseUrl: readString(env, "NOTION_EDIT_BASE_URL"),
  };
}
