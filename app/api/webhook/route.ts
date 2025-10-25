import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createUser, updateUserSubscription, getUserByStripeCustomerId, updateUserSpareroomUrl, query } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
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
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (customerEmail && customerId) {
          try {
            console.log(`[webhook] Processing checkout for ${customerEmail}, customer: ${customerId}`);

            // Check if user already exists
            const existingUser = await getUserByStripeCustomerId(customerId);
            console.log(`[webhook] Existing user:`, existingUser ? 'Found' : 'Not found');

            // Look for pending URL for this email (from store-url API)
            let spareroomUrl = null;
            try {
              const pendingUrlResult = await query(`
                SELECT spareroom_url FROM pending_urls
                WHERE url_id IN (
                  SELECT url_id FROM pending_urls
                  ORDER BY created_at DESC
                  LIMIT 1
                )
              `);
              console.log(`[webhook] Pending URLs found:`, pendingUrlResult.rows.length);
              if (pendingUrlResult.rows.length > 0) {
                spareroomUrl = pendingUrlResult.rows[0].spareroom_url;
                console.log(`[webhook] Using spareroom_url:`, spareroomUrl);
              }
            } catch (pendingError) {
              console.error('[webhook] Error fetching pending URL:', pendingError);
            }

            if (!existingUser) {
              // Create new user with Spareroom URL
              await createUser(customerEmail, customerId, spareroomUrl);
              console.log(`New user created: ${customerEmail} with URL: ${spareroomUrl}`);
            } else if (spareroomUrl) {
              // Update existing user with URL
              await updateUserSpareroomUrl(customerId, spareroomUrl);
              console.log(`Updated user ${customerEmail} with URL: ${spareroomUrl}`);
            }

            // Fetch the actual subscription status from Stripe
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              await updateUserSubscription(customerId, subscriptionId, subscription.status);
              console.log(`Subscription status set to: ${subscription.status} for ${customerEmail}`);

              // Send welcome email with success page link and Stripe portal link
              if (spareroomUrl) {
                try {
                  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                  const successPageUrl = `${baseUrl}/success?session_id=${session.id}`;

                  // Create Stripe billing portal session
                  const portalSession = await stripe.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: baseUrl,
                  });

                  await sendWelcomeEmail(customerEmail, successPageUrl, portalSession.url);
                  console.log(`Welcome email sent to ${customerEmail} with success page link`);
                } catch (emailError) {
                  console.error(`Failed to send welcome email to ${customerEmail}:`, emailError);
                  // Don't throw - we don't want email failures to break the webhook
                }
              }
            }

            // Clean up pending URL
            if (spareroomUrl) {
              try {
                await query(`DELETE FROM pending_urls WHERE created_at < NOW() - INTERVAL '1 hour'`);
              } catch (cleanupError) {
                console.log('Could not clean up pending URLs');
              }
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

        await updateUserSubscription(customerId, subscriptionId, status);
        console.log(`Subscription updated: ${customerId} - ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;

        await updateUserSubscription(customerId, subscriptionId, 'canceled');
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
