import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { spareroomUrl } = await req.json();

    if (!spareroomUrl || !spareroomUrl.startsWith('https://www.spareroom.co.uk/flatshare/')) {
      return NextResponse.json(
        { error: 'Valid Spareroom URL is required' },
        { status: 400 }
      );
    }

    // Create a custom ID from the URL (hash it for uniqueness)
    const urlId = createHash('sha256')
      .update(spareroomUrl + Date.now())
      .digest('hex')
      .substring(0, 16);

    // Store in a temporary table (we'll create this)
    await query(`
      CREATE TABLE IF NOT EXISTS pending_urls (
        url_id VARCHAR(255) PRIMARY KEY,
        spareroom_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert or update the URL
    await query(
      `INSERT INTO pending_urls (url_id, spareroom_url)
       VALUES ($1, $2)
       ON CONFLICT (url_id) DO UPDATE
       SET spareroom_url = $2`,
      [urlId, spareroomUrl]
    );

    return NextResponse.json({ urlId, success: true });
  } catch (error) {
    console.error('Error storing URL:', error);
    return NextResponse.json(
      { error: 'Failed to store URL' },
      { status: 500 }
    );
  }
}
