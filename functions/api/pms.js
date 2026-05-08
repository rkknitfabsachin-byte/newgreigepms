const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function onRequestGet() {
  return json({
    ok: true,
    message: 'PMS Cloudflare API proxy is running.',
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.APPS_SCRIPT_URL || !env.PMS_API_TOKEN) {
    return json({
      ok: false,
      error: 'Cloudflare environment variables APPS_SCRIPT_URL and PMS_API_TOKEN are required.',
    }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({
      ok: false,
      error: 'Request body must be JSON.',
    }, 400);
  }

  if (!body.action) {
    return json({
      ok: false,
      error: 'Missing PMS action.',
    }, 400);
  }

  const upstreamResponse = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: JSON.stringify({
      token: env.PMS_API_TOKEN,
      action: body.action,
      payload: body.payload || {},
    }),
  });

  const upstreamText = await upstreamResponse.text();
  let payload;

  try {
    payload = JSON.parse(upstreamText);
  } catch (error) {
    return json({
      ok: false,
      error: 'Apps Script did not return JSON. Check the web app deployment and access setting.',
      status: upstreamResponse.status,
    }, 502);
  }

  return json(payload, upstreamResponse.ok ? 200 : 502);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
