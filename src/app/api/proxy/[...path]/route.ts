/**
 * API Proxy Route — Routes requests to the correct backend service.
 * Supports JSON and multipart/form-data requests.
 *
 * To add a module-specific backend (e.g. attendance, salary), add a key
 * to `ServiceName`, wire its base URL in `SERVICE_BASE_URL`, and add a
 * branch in `classifyPath()`.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  API_BASE_URL,
  AUTH_BASE_URL,
  UTILITIES_BASE_URL,
} from '@/config/api';

type ServiceName = 'auth' | 'utilities' | 'api';

const SERVICE_BASE_URL: Record<ServiceName, string> = {
  auth: AUTH_BASE_URL,
  utilities: UTILITIES_BASE_URL,
  api: API_BASE_URL,
};

/** Classifies a path to the backend service that owns it. */
function classifyPath(path: string): ServiceName {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized.startsWith('api/')) return 'api';
  const rest = normalized.slice(4); // after 'api/'

  if (rest.startsWith('v2/auth/')) {
    const afterAuth = rest.slice(8); // after 'v2/auth/'
    // api/v2/auth/appcode, api/v2/auth/sso/{verify,generate},
    // api/v2/auth/:app/:user/{login,logout}
    if (afterAuth === 'appcode') return 'auth';
    if (afterAuth === 'sso/verify' || afterAuth === 'sso/generate') return 'auth';
    if (/^[^/]+\/[^/]+\/login$/.test(afterAuth)) return 'auth';
    if (/^[^/]+\/[^/]+\/logout$/.test(afterAuth)) return 'auth';
  }
  if (rest.startsWith('v2/utilities/')) return 'utilities';
  return 'api';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const service = classifyPath(path);
    const baseUrl = SERVICE_BASE_URL[service];
    const queryString = request.nextUrl.search; // includes leading '?' if present
    const url = `${baseUrl}/${path}${queryString}`;

    // Handle body — supports both JSON and multipart/form-data
    let body: BodyInit | null = null;
    const incomingContentType = request.headers.get('content-type') || '';
    const isFormData = incomingContentType.includes('multipart/form-data');

    if (method !== 'GET' && method !== 'HEAD') {
      try {
        if (isFormData) {
          const incoming = await request.formData();
          const outgoing = new FormData();
          for (const [key, value] of incoming.entries()) {
            outgoing.append(key, value);
          }
          body = outgoing;
        } else {
          body = await request.text();
        }
      } catch {
        // No body
      }
    }

    // Forward relevant headers — skip Content-Type for FormData (browser sets boundary)
    const headers: HeadersInit = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const authHeader = request.headers.get('Authorization');
    const encryptedKey = request.headers.get('x-encrypted-key');
    const encryptedUser = request.headers.get('x-encrypted-user');

    if (authHeader) headers['Authorization'] = authHeader;
    if (encryptedKey) headers['x-encrypted-key'] = encryptedKey;
    if (encryptedUser) headers['x-encrypted-user'] = encryptedUser;

    console.log(`[Proxy] ${method} ${url} (${service})`);

    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    });

    const data = await response.text();

    if (!response.ok) {
      console.error(`[Proxy] ${method} ${url} → ${response.status}`, data.substring(0, 500));
    }

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Proxy request failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
