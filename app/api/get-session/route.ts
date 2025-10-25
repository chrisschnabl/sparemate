import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserByStripeCustomerId } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    console.log('[get-session] Received session_id:', sessionId);

    if (!sessionId) {
      console.error('[get-session] No session ID provided');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    console.log('[get-session] Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('[get-session] Session retrieved:', {
      id: session.id,
      customer: session.customer,
      status: session.payment_status
    });

    const customerId = session.customer as string;

    if (!customerId) {
      console.error('[get-session] No customer ID in session');
      return NextResponse.json(
        { error: 'No customer ID in session' },
        { status: 400 }
      );
    }

    // Get the user from database
    console.log('[get-session] Looking up user by customer ID:', customerId);
    const user = await getUserByStripeCustomerId(customerId);

    if (!user) {
      console.log('[get-session] User not found in database, checking pending_urls...');
      // User might not be created by webhook yet, check pending_urls as fallback
      const { query } = await import('@/lib/db');
      try {
        const pendingResult = await query(`
          SELECT spareroom_url FROM pending_urls
          ORDER BY created_at DESC
          LIMIT 1
        `);

        console.log('[get-session] Pending URLs found:', pendingResult.rows.length);

        if (pendingResult.rows.length > 0) {
          console.log('[get-session] Returning spareroom_url from pending_urls');
          return NextResponse.json({
            spareroomUrl: pendingResult.rows[0].spareroom_url,
            email: session.customer_email || session.customer_details?.email || 'unknown'
          });
        }
      } catch (err) {
        console.error('[get-session] Error checking pending_urls:', err);
      }

      console.error('[get-session] No user or pending URL found');
      return NextResponse.json(
        { error: 'User not found. Please wait a moment and refresh the page.' },
        { status: 404 }
      );
    }

    console.log('[get-session] User found, returning data');
    return NextResponse.json({
      spareroomUrl: user.spareroom_url,
      email: user.email
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
