// Dashboard worker — handles /api/analytics/* proxy routes
// For production (studio.localflare.dev), this proxies analytics requests to Cloudflare's API

const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle /api/analytics/* routes — everything else goes to static assets
    if (!url.pathname.startsWith('/api/analytics')) {
      return env.ASSETS.fetch(request);
    }

    // Get credentials from request headers
    const accountId = request.headers.get('X-CF-Account-ID');
    const apiToken = request.headers.get('X-CF-API-Token');

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-CF-Account-ID, X-CF-API-Token',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const path = url.pathname.replace('/api/analytics', '');

    // Health check
    if (path === '/health') {
      return Response.json(
        {
          status: 'ok',
          hasCredentials: Boolean(accountId && apiToken),
        },
        { headers: corsHeaders }
      );
    }

    if (!accountId || !apiToken) {
      return Response.json(
        { error: 'Missing credentials', message: 'Configure API credentials in Settings.' },
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      // Forward SQL requests to Cloudflare Analytics Engine
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
        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
      }

      const cfResponse = await fetch(
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

      if (!cfResponse.ok) {
        const errorText = await cfResponse.text();
        return Response.json(
          { error: 'Query failed', message: errorText, data: [], meta: null },
          { status: 502, headers: corsHeaders }
        );
      }

      const result = await cfResponse.json() as {
        data: Array<Record<string, unknown>>;
        meta: Array<{ name: string; type: string }>;
        rows: number;
        rows_before_limit_at_least: number;
      };

      // Format response based on endpoint
      if (path === '/datasets') {
        const datasets = (result.data || []).map((row) => {
          const name = (row.name || Object.values(row)[0]) as string;
          return { id: name, name };
        });
        return Response.json({ datasets }, { headers: corsHeaders });
      }

      if (path.match(/^\/datasets\/(.+)\/schema$/)) {
        const datasetId = decodeURIComponent(path.split('/')[2]);
        const columns = (result.meta || []).map((col) => ({ name: col.name, type: col.type }));
        return Response.json({ datasetId, columns }, { headers: corsHeaders });
      }

      // Query response
      return Response.json(
        {
          data: result.data || [],
          meta: result.meta || [],
          rowCount: result.rows || 0,
          totalRows: result.rows_before_limit_at_least || result.rows || 0,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return Response.json(
        { error: 'Request failed', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

function substituteParams(query: string, params?: Record<string, string | number>): string {
  if (!params) return query;
  let result = query;
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    let escapedValue: string;
    if (typeof value === 'string') {
      const isIntervalValue = /^'\d+'\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)$/i.test(value);
      escapedValue = isIntervalValue ? value : `'${value.replace(/'/g, "''")}'`;
    } else {
      escapedValue = String(value);
    }
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escapedValue);
  });
  return result;
}
