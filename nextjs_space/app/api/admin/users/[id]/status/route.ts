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
        { error: 'Nur Administratoren können Benutzer deaktivieren' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Ungültiger Status' },
        { status: 400 }
      );
    }

    // Prevent admin from deactivating themselves
    if (id === currentUserId && !isActive) {
      return NextResponse.json(
        { error: 'Sie können sich nicht selbst deaktivieren' },
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
      data: { 
        isActive,
        deactivatedAt: isActive ? null : new Date(),
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        isActive: true,
        deactivatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Admin status change error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Ändern des Status' },
      { status: 500 }
    );
  }
}
