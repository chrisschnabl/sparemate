import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendNewListingsEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(req: NextRequest) {
  try {
    const { sessionId, listings } = await req.json();

    if (!sessionId || !listings || listings.length === 0) {
      return NextResponse.json(
        { error: 'Session ID and listings are required' },
        { status: 400 }
      );
    }

    // Get the customer email from the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customerEmail = session.customer_email || session.customer_details?.email;

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No email found for this session' },
        { status: 400 }
      );
    }

    // Send test email with the provided listings
    await sendNewListingsEmail(customerEmail, listings);

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${customerEmail}`,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
