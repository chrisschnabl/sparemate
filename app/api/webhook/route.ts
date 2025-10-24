import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createUser, updateUserSubscription, getUserByStripeCustomerId } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_email || session.metadata?.email;
        const spareroomUrl = session.metadata?.spareroomUrl;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (customerEmail && customerId) {
          try {
            // Check if user already exists
            const existingUser = getUserByStripeCustomerId(customerId);

            if (!existingUser) {
              // Create new user with Spareroom URL
              createUser(customerEmail, customerId, spareroomUrl);
              console.log(`New user created: ${customerEmail} with URL: ${spareroomUrl}`);
            }

            // Update subscription details
            if (subscriptionId) {
              updateUserSubscription(customerId, subscriptionId, 'active');
              console.log(`Subscription activated for: ${customerEmail}`);
            }
          } catch (error) {
            console.error('Error creating/updating user:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        updateUserSubscription(customerId, subscriptionId, status);
        console.log(`Subscription updated: ${customerId} - ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;

        updateUserSubscription(customerId, subscriptionId, 'canceled');
        console.log(`Subscription canceled: ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
