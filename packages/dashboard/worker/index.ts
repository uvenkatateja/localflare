// Dashboard worker — handles /api/analytics/* proxy routes
// For production (studio.localflare.dev), this proxies analytics requests to Cloudflare's API
// All other requests are served by the static assets (SPA)

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-CF-Account-ID, X-CF-API-Token',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle /api/analytics/* routes — everything else goes to static assets
    if (!url.pathname.startsWith('/api/analytics')) {
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        // If ASSETS binding fails, return a basic fallback
        return new Response('Not Found', { status: 404 });
      }
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-CF-Account-ID, X-CF-API-Token',
        },
      });
    }

    const accountId = request.headers.get('X-CF-Account-ID');
    const apiToken = request.headers.get('X-CF-API-Token');
    const path = url.pathname.replace('/api/analytics', '');

    // Health check
    if (path === '/health') {
      return jsonResponse({ status: 'ok', hasCredentials: Boolean(accountId && apiToken) });
    }

    if (!accountId || !apiToken) {
      return jsonResponse({ error: 'Missing credentials', message: 'Configure API credentials in Settings.' }, 400);
    }

    try {
      let sql = '';

      if (path === '/datasets') {
        sql = 'SHOW TABLES';
      } else if (path.match(/^\/datasets\/(.+)\/schema$/)) {
        const datasetId = decodeURIComponent(path.split('/')[2]);
        sql = `SELECT * FROM ${datasetId} LIMIT 1`;
      } else if (path === '/query' && request.method === 'POST') {
        const body = await request.json() as { query: string; params?: Record<string, string | number> };
        sql = substituteParams(body.query, body.params);
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }

      const cfResponse = await fetch(`${CF_API_BASE}/${accountId}/analytics_engine/sql`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'text/plain' },
        body: sql,
      });

      if (!cfResponse.ok) {
        const errorText = await cfResponse.text();
        return jsonResponse({ error: 'Query failed', message: errorText, data: [], meta: null }, 502);
      }

      const result = await cfResponse.json() as {
        data: Array<Record<string, unknown>>;
        meta: Array<{ name: string; type: string }>;
        rows: number;
        rows_before_limit_at_least: number;
      };

      if (path === '/datasets') {
        const datasets = (result.data || []).map((row) => {
          const name = (row.name || Object.values(row)[0]) as string;
          return { id: name, name };
        });
        return jsonResponse({ datasets });
      }

      if (path.match(/^\/datasets\/(.+)\/schema$/)) {
        const datasetId = decodeURIComponent(path.split('/')[2]);
        const columns = (result.meta || []).map((col) => ({ name: col.name, type: col.type }));
        return jsonResponse({ datasetId, columns });
      }

      return jsonResponse({
        data: result.data || [],
        meta: result.meta || [],
        rowCount: result.rows || 0,
        totalRows: result.rows_before_limit_at_least || result.rows || 0,
      });
    } catch (error) {
      return jsonResponse({ error: 'Request failed', message: error instanceof Error ? error.message : String(error) }, 500);
    }
  },
};

function substituteParams(query: string, params?: Record<string, string | number>): string {
  if (!params) return query;
  let result = query;
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    const re = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (typeof value === 'string') {
      const isInterval = /^'\d+'\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)$/i.test(value);
      result = result.replace(re, isInterval ? value : `'${value.replace(/'/g, "''")}'`);
    } else {
      result = result.replace(re, String(value));
    }
  }
  return result;
}
