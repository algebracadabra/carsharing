import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import type { SessionUser } from '@/lib/types';

// ============================================
// Response Helpers
// ============================================

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorizedResponse(message = 'Nicht autorisiert') {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = 'Keine Berechtigung') {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = 'Nicht gefunden') {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = 'Interner Serverfehler') {
  return errorResponse(message, 500);
}

// ============================================
// Session Helpers
// ============================================

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  
  const user = session.user as any;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: unauthorizedResponse() };
  }
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };
  
  if (user!.role !== 'ADMIN') {
    return { user: null, error: forbiddenResponse('Nur Administratoren haben Zugriff') };
  }
  return { user, error: null };
}

// ============================================
// Validation Helpers
// ============================================

export function validateRequired(
  fields: Record<string, unknown>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (fields[field] === undefined || fields[field] === null || fields[field] === '') {
      return `${field} ist erforderlich`;
    }
  }
  return null;
}

export function parseIntSafe(value: unknown): number | null {
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function parseFloatSafe(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
