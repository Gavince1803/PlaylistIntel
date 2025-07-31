import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json(); // 'like' or 'unlike'
    const { id: playlistId } = await params;

    const method = action === 'like' ? 'PUT' : 'DELETE';
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
      method,
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Spotify API error:', errorData);
      return NextResponse.json(
        { error: `Failed to ${action} playlist` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error processing playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playlistId } = await params;

    // Check if the current user follows this playlist
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers/contains?ids=${session.user?.id}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Spotify API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to check playlist like status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const isLiked = data[0] || false;

    return NextResponse.json({ isLiked });
  } catch (error) {
    console.error('Error checking playlist like status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 