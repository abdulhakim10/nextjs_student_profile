import { NextRequest, NextResponse } from 'next/server';

const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || 'https://aws01.awfatech.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://devapi02.awfatech.com';
const ATTENDANCE_BASE_URL = process.env.NEXT_PUBLIC_ATTENDANCE_API_BASE_URL || 'http://localhost:20019';
const UTILITIES_BASE_URL = process.env.NEXT_PUBLIC_UTILITIES_API_BASE_URL || API_BASE_URL;
const NOTIFICATION_BASE_URL = process.env.NEXT_PUBLIC_NOTIFICATION_API_BASE_URL || 'https://devapi01.awfatech.com';

/** Paths that use the auth domain (aws01): appcode, login, logout */
function isAuthPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  // api/v2/auth/appcode, api/v2/auth/:app/:user/login, api/v2/auth/:app/:user/logout
  if (!normalized.startsWith('api/')) return false;
  const rest = normalized.slice(4); // after 'api/'
  if (!rest.startsWith('v2/auth/')) return false;
  const afterAuth = rest.slice(8); // after 'v2/auth/'
  if (afterAuth === 'appcode') return true;
  if (/^[^/]+\/[^/]+\/login$/.test(afterAuth)) return true; // eboss/staff/login
  if (/^[^/]+\/[^/]+\/logout$/.test(afterAuth)) return true; // eboss/staff/logout
  return false;
}

/** Paths that use the attendance service (localhost:20019) */
function isAttendancePath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  // api/v2/attendance/...
  if (!normalized.startsWith('api/')) return false;
  const rest = normalized.slice(4); // after 'api/'
  return rest.startsWith('v2/attendance/');
}

/** Paths that use the utilities service */
function isUtilitiesPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized.startsWith('api/')) return false;
  return normalized.slice(4).startsWith('v2/utilities/');
}

/** Paths that use the notification service (devapi01) */
function isNotificationPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  if (!normalized.startsWith('api/')) return false;
  return normalized.slice(4).startsWith('v2/notification/');
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
    const baseUrl = isAuthPath(path) ? AUTH_BASE_URL : isAttendancePath(path) ? ATTENDANCE_BASE_URL : isUtilitiesPath(path) ? UTILITIES_BASE_URL : isNotificationPath(path) ? NOTIFICATION_BASE_URL : API_BASE_URL;
    const queryString = request.nextUrl.search; // includes leading '?' if present
    const url = `${baseUrl}/${path}${queryString}`;
    
    // Get request body if present
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.text();
      } catch (e) {
        // No body
      }
    }

    // Forward relevant headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward auth headers if present
    const authHeader = request.headers.get('Authorization');
    const encryptedKey = request.headers.get('x-encrypted-key');
    const encryptedUser = request.headers.get('x-encrypted-user');

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (encryptedKey) {
      headers['x-encrypted-key'] = encryptedKey;
    }
    if (encryptedUser) {
      headers['x-encrypted-user'] = encryptedUser;
    }

    const label = baseUrl === AUTH_BASE_URL ? 'auth' : baseUrl === ATTENDANCE_BASE_URL ? 'attendance' : baseUrl === UTILITIES_BASE_URL ? 'utilities' : baseUrl === NOTIFICATION_BASE_URL ? 'notification' : 'api';
    console.log(`[Proxy] ${method} ${url} (${label})`);
    console.log(`[Proxy] Auth header present: ${!!authHeader}, Token prefix: ${authHeader?.substring(0, 15) || 'NONE'}`);

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
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Proxy request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
