import { NextRequest, NextResponse } from 'next/server';
import { toggleEmailNotifications, getUserByStripeCustomerId } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(req: NextRequest) {
  try {
    const { sessionId, enabled } = await req.json();

    if (!sessionId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Session ID and enabled status are required' },
        { status: 400 }
      );
    }

    // Get the Stripe customer ID from the session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerId = session.customer as string;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer ID found' },
        { status: 400 }
      );
    }

    // Toggle email notifications
    await toggleEmailNotifications(customerId, enabled);

    // Get updated user
    const user = await getUserByStripeCustomerId(customerId);

    return NextResponse.json({
      success: true,
      emailsEnabled: user?.emails_enabled ?? enabled
    });
  } catch (error) {
    console.error('Error toggling email notifications:', error);
    return NextResponse.json(
      { error: 'Failed to toggle email notifications' },
      { status: 500 }
    );
  }
}
