import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { put, del } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Kein Bild hochgeladen' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiges Bildformat. Erlaubt: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Bild zu groß. Maximal 5MB erlaubt.' },
        { status: 400 }
      );
    }

    // Get current user to check for existing image
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    // Delete old image if exists
    if (currentUser?.image) {
      try {
        await del(currentUser.image);
      } catch (err) {
        console.error('Error deleting old profile image:', err);
      }
    }

    // Upload new image to Vercel Blob
    const fileName = `profile-${userId}-${Date.now()}.${file.type.split('/')[1]}`;
    const blob = await put(fileName, file, {
      access: 'public',
    });

    // Update user with new image URL
    await prisma.user.update({
      where: { id: userId },
      data: { image: blob.url },
    });

    return NextResponse.json({ 
      success: true, 
      imageUrl: blob.url 
    });
  } catch (error: any) {
    console.error('Profile image upload error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Profilbilds' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    // Get current user image
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (user?.image) {
      // Delete from Vercel Blob
      try {
        await del(user.image);
      } catch (err) {
        console.error('Error deleting profile image:', err);
      }

      // Remove from database
      await prisma.user.update({
        where: { id: userId },
        data: { image: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Profile image delete error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Profilbilds' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    // image field now stores the full URL directly
    return NextResponse.json({ imageUrl: user?.image || null });
  } catch (error: any) {
    console.error('Get profile image error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden des Profilbilds' },
      { status: 500 }
    );
  }
}
