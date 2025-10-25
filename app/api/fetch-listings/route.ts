import { NextRequest, NextResponse } from 'next/server';
import { fetchSpareRoomAds } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
    const { spareroomUrl } = await req.json();

    if (!spareroomUrl || !spareroomUrl.startsWith('https://www.spareroom.co.uk/flatshare/')) {
      return NextResponse.json(
        { error: 'Valid Spareroom URL is required' },
        { status: 400 }
      );
    }

    // Use the scraper to fetch listings
    const listings = await fetchSpareRoomAds(spareroomUrl);

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
