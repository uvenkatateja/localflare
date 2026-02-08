// API Client for Cloudflare Analytics Engine
// Calls Cloudflare's API directly from the browser — no proxy worker needed.

import { STORAGE_KEYS, type ApiCredentials } from '@/components/analytics/hooks/use-local-storage';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export interface Dataset {
  id: string;
  name: string;
}

export interface DatasetColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  meta: { name: string; type: string }[];
  rowCount: number;
  totalRows: number;
  error?: string;
  message?: string;
}

// Get credentials from localStorage (non-reactive, for API calls)
function getStoredCredentials(): ApiCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.apiCredentials);
    if (stored) {
      return JSON.parse(stored) as ApiCredentials;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function getCredentialsOrThrow(): ApiCredentials {
  const credentials = getStoredCredentials();
  if (!credentials?.accountId || !credentials?.apiToken) {
    throw new Error('No API credentials found. Please configure your Cloudflare API credentials in Settings.');
  }
  return credentials;
}

// Execute a raw SQL query against the Analytics Engine API
async function executeSql(
  accountId: string,
  apiToken: string,
  sql: string
): Promise<{
  data: Array<Record<string, unknown>>;
  meta: Array<{ name: string; type: string }>;
  rows: number;
  rows_before_limit_at_least: number;
}> {
  const response = await fetch(
    `${CF_API_BASE}/${accountId}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'text/plain',
      },
      body: sql,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Substitute filter parameters into a query string
function substituteParams(
  query: string,
  params?: Record<string, string | number>
): string {
  if (!params) return query;

  let result = query;
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    let escapedValue: string;

    if (typeof value === 'string') {
      // Check if this is an INTERVAL value (e.g., "'15' MINUTE", "'7' DAY")
      const isIntervalValue = /^'\d+'\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)$/i.test(value);

      if (isIntervalValue) {
        escapedValue = value;
      } else {
        escapedValue = `'${value.replace(/'/g, "''")}'`;
      }
    } else {
      escapedValue = String(value);
    }

    result = result.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      escapedValue
    );
  });

  return result;
}

class ApiClient {
  // List all datasets from Analytics Engine
  async getDatasets(): Promise<Dataset[]> {
    const { accountId, apiToken } = getCredentialsOrThrow();

    try {
      const result = await executeSql(accountId, apiToken, 'SHOW TABLES');
      return (result.data || []).map((row) => {
        const name = (row.name || Object.values(row)[0]) as string;
        return { id: name, name };
      });
    } catch (error) {
      console.error('Failed to list datasets:', error);
      return [];
    }
  }

  // Get schema for a specific dataset
  async getDatasetSchema(datasetId: string): Promise<DatasetColumn[]> {
    const { accountId, apiToken } = getCredentialsOrThrow();

    const result = await executeSql(
      accountId,
      apiToken,
      `SELECT * FROM ${datasetId} LIMIT 1`
    );

    return (result.meta || []).map((col) => ({
      name: col.name,
      type: col.type,
    }));
  }

  // Execute a SQL query with optional parameter substitution
  async executeQuery(
    query: string,
    params?: Record<string, string | number>
  ): Promise<QueryResult> {
    const { accountId, apiToken } = getCredentialsOrThrow();

    const finalQuery = substituteParams(query, params);
    const result = await executeSql(accountId, apiToken, finalQuery);

    return {
      data: result.data || [],
      meta: result.meta || [],
      rowCount: result.rows || 0,
      totalRows: result.rows_before_limit_at_least || result.rows || 0,
    };
  }

  // Health check — just verifies credentials are set
  async healthCheck(): Promise<{ status: string }> {
    const credentials = getStoredCredentials();
    return {
      status: credentials?.accountId && credentials?.apiToken ? 'ok' : 'no_credentials',
    };
  }
}

export const apiClient = new ApiClient();
