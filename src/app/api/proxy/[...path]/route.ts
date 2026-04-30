/**
 * API Proxy Route — Routes requests to the correct backend service.
 * Supports JSON and multipart/form-data requests.
 *
 * To add a module-specific backend (e.g. attendance, salary), define a new
 * BASE_URL constant + isXxxPath() matcher and add a branch to the dispatch
 * chain in proxyRequest().
 */
import { NextRequest, NextResponse } from 'next/server';

const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || 'https://aws01.awfatech.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://devapi02.awfatech.com';
const UTILITIES_BASE_URL = process.env.NEXT_PUBLIC_UTILITIES_API_BASE_URL || API_BASE_URL;

/** Paths that use the auth domain (aws01): appcode, login, logout */
function isAuthPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized.startsWith('api/')) return false;
  const rest = normalized.slice(4);
  if (!rest.startsWith('v2/auth/')) return false;
  const afterAuth = rest.slice(8);
  if (afterAuth === 'appcode') return true;
  if (/^[^/]+\/[^/]+\/login$/.test(afterAuth)) return true;
  if (/^[^/]+\/[^/]+\/logout$/.test(afterAuth)) return true;
  return false;
}

/** Paths that use the utilities service */
function isUtilitiesPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized.startsWith('api/')) return false;
  return normalized.slice(4).startsWith('v2/utilities/');
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
    const baseUrl = isAuthPath(path)
      ? AUTH_BASE_URL
      : isUtilitiesPath(path)
        ? UTILITIES_BASE_URL
        : API_BASE_URL;
    const queryString = request.nextUrl.search;
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

    const label = baseUrl === AUTH_BASE_URL ? 'auth' : baseUrl === UTILITIES_BASE_URL ? 'utilities' : 'api';
    console.log(`[Proxy] ${method} ${url} (${label})`);

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
