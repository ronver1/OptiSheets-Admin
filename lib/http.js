// lib/http.js

export function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}