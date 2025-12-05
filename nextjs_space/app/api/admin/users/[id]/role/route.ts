import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const currentUserId = (session.user as any)?.id;

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nur Administratoren können Rollen ändern' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { role } = body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Ungültige Rolle' },
        { status: 400 }
      );
    }

    // Prevent admin from removing their own admin role
    if (id === currentUserId && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sie können Ihre eigene Admin-Rolle nicht entfernen' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Admin role change error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Ändern der Rolle' },
      { status: 500 }
    );
  }
}
