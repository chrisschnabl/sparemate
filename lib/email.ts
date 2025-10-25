/**
 * Email Service using Resend
 * Sends notification emails for new SpareRoom listings
 */

import { Resend } from 'resend';
import { SpareRoomAd } from './scraper';

let resendInstance: Resend | null = null;

function getResendInstance(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Generate HTML email template for new listings
 */
function generateEmailHtml(ads: SpareRoomAd[]): string {
  const adsHtml = ads
    .map(
      (ad) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #ffffff;">
      <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 20px;">
        ${ad.title}
      </h2>

      <div style="margin-bottom: 16px;">
        ${ad.price ? `<p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #059669;">
          ${ad.price}${ad.billsIncluded ? ' <span style="font-size: 14px; color: #10b981;">(bills included)</span>' : ''}
        </p>` : ''}

        ${ad.location ? `<p style="margin: 4px 0; color: #4b5563;">
          📍 ${ad.location}
        </p>` : ''}

        ${ad.propertyType ? `<p style="margin: 4px 0; color: #4b5563;">
          🏠 ${ad.propertyType}
        </p>` : ''}

        ${ad.availability ? `<p style="margin: 4px 0; color: #4b5563;">
          📅 ${ad.availability}
        </p>` : ''}

        ${ad.minTerm || ad.maxTerm ? `<p style="margin: 4px 0; color: #4b5563;">
          ⏱️ ${[ad.minTerm ? `min ${ad.minTerm}` : '', ad.maxTerm ? `max ${ad.maxTerm}` : ''].filter(Boolean).join(', ')}
        </p>` : ''}
      </div>

      <a href="${ad.url}"
         style="display: inline-block; background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Listing →
      </a>

      <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
        Listing ID: ${ad.id}
      </p>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New SpareRoom Listings</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0; color: white; font-size: 28px; text-align: center;">
              🚨 New Listing${ads.length > 1 ? 's' : ''} Found!
            </h1>
            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); text-align: center; font-size: 16px;">
              ${ads.length} new ${ads.length === 1 ? 'property has' : 'properties have'} been posted on SpareRoom
            </p>
          </div>

          ${adsHtml}

          <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
              You're receiving this because you subscribed to <strong>Sparemate</strong>
            </p>
            <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
              Instant notifications for SpareRoom listings
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              Need help? Contact <a href="mailto:support@antichris.llc" style="color: #ec4899; text-decoration: none;">support@antichris.llc</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate plain text email for new listings
 */
function generateEmailText(ads: SpareRoomAd[]): string {
  const header = `🚨 NEW LISTING${ads.length > 1 ? 'S' : ''} FOUND!\n\n${ads.length} new ${ads.length === 1 ? 'property has' : 'properties have'} been posted on SpareRoom\n\n${'='.repeat(60)}\n\n`;

  const adsText = ads
    .map((ad) => {
      const lines: string[] = [];
      lines.push(`${ad.title}`);
      lines.push(`ID: ${ad.id}`);
      lines.push(`URL: ${ad.url}`);

      if (ad.price) {
        const priceStr = ad.billsIncluded
          ? `${ad.price} (bills included)`
          : ad.price;
        lines.push(`Price: ${priceStr}`);
      }

      if (ad.location) lines.push(`Location: ${ad.location}`);
      if (ad.propertyType) lines.push(`Type: ${ad.propertyType}`);
      if (ad.availability) lines.push(`Availability: ${ad.availability}`);

      if (ad.minTerm || ad.maxTerm) {
        const termParts: string[] = [];
        if (ad.minTerm) termParts.push(`min ${ad.minTerm}`);
        if (ad.maxTerm) termParts.push(`max ${ad.maxTerm}`);
        lines.push(`Term: ${termParts.join(', ')}`);
      }

      return lines.join('\n');
    })
    .join('\n\n' + '-'.repeat(60) + '\n\n');

  const footer = `\n\n${'='.repeat(60)}\n\nYou're receiving this because you subscribed to Sparemate.\nInstant notifications for SpareRoom listings.\n\nNeed help? Contact support@antichris.llc`;

  return header + adsText + footer;
}

/**
 * Send welcome email after subscription
 */
export async function sendWelcomeEmail(
  to: string,
  successPageUrl: string,
  stripePortalUrl: string
): Promise<void> {
  const resend = getResendInstance();

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Sparemate</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px;">
                🎉 Welcome to Sparemate!
              </h1>
              <p style="margin: 16px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px;">
                Your subscription is now active
              </p>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
                What's Next?
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">
                Thank you for subscribing! We're already monitoring your Spareroom search and will notify you within <strong>1 minute</strong> when new properties appear.
              </p>

              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #10b981;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">
                  📋 View Your Listings
                </h3>
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">
                  See all current listings from your saved search and manage your subscription.
                </p>
                <a href="${successPageUrl}"
                   style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  View Your Listings →
                </a>
              </div>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">
                  💳 Manage Subscription
                </h3>
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px;">
                  Update payment details, view invoices, or cancel anytime.
                </p>
                <a href="${stripePortalUrl}"
                   style="display: inline-block; background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Manage Subscription →
                </a>
              </div>

              <div style="border-left: 4px solid #10b981; padding-left: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #047857; font-weight: 600;">
                  ✅ Your 3-day free trial has started
                </p>
                <p style="margin: 8px 0 0 0; color: #4b5563; font-size: 14px;">
                  You'll be charged £10/week after the trial. Cancel anytime with 100% refund guarantee.
                </p>
              </div>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
                How It Works
              </h2>

              <div style="margin-bottom: 16px;">
                <div style="display: inline-block; background-color: #ec4899; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; margin-right: 8px;">1</div>
                <span style="color: #4b5563;">We check your Spareroom search every <strong>5 minutes</strong></span>
              </div>

              <div style="margin-bottom: 16px;">
                <div style="display: inline-block; background-color: #ec4899; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; margin-right: 8px;">2</div>
                <span style="color: #4b5563;">When new listings appear, we send you an instant email</span>
              </div>

              <div style="margin-bottom: 16px;">
                <div style="display: inline-block; background-color: #ec4899; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; margin-right: 8px;">3</div>
                <span style="color: #4b5563;">You get notified <strong>within 1 minute</strong> of posting</span>
              </div>

              <div>
                <div style="display: inline-block; background-color: #ec4899; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; margin-right: 8px;">4</div>
                <span style="color: #4b5563;">Be the first to apply and increase your chances!</span>
              </div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                Need help? Contact us at <a href="mailto:support@antichris.llc" style="color: #ec4899; text-decoration: none; font-weight: 600;">support@antichris.llc</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Sparemate. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
🎉 WELCOME TO SPAREMATE!

Your subscription is now active.

WHAT'S NEXT?

Thank you for subscribing! We're already monitoring your Spareroom search and will notify you within 1 minute when new properties appear.

📋 VIEW YOUR LISTINGS
See all current listings from your saved search and manage your subscription.
${successPageUrl}

💳 MANAGE SUBSCRIPTION
Update payment details, view invoices, or cancel anytime.
${stripePortalUrl}

✅ Your 3-day free trial has started
You'll be charged £10/week after the trial. Cancel anytime with 100% refund guarantee.

HOW IT WORKS

1. We check your Spareroom search every 5 minutes
2. When new listings appear, we send you an instant email
3. You get notified within 1 minute of posting
4. Be the first to apply and increase your chances!

Need help? Contact us at support@antichris.llc

© ${new Date().getFullYear()} Sparemate. All rights reserved.
    `.trim();

    const fromEmail = process.env.EMAIL_FROM || 'Sparemate <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromEmail,
      to,
      subject: '🎉 Welcome to Sparemate - Your subscription is active!',
      html: htmlContent,
      text: textContent,
    });

    console.log(`✓ Welcome email sent to ${to}`);
  } catch (error) {
    console.error(`✗ Failed to send welcome email to ${to}:`, error);
    throw error;
  }
}

/**
 * Send email notification for new listings
 */
export async function sendNewListingsEmail(
  to: string,
  ads: SpareRoomAd[]
): Promise<void> {
  const resend = getResendInstance();

  if (ads.length === 0) {
    console.log('No ads to send');
    return;
  }

  try {
    const subject =
      ads.length === 1
        ? `🚨 New SpareRoom Listing: ${ads[0].title}`
        : `🚨 ${ads.length} New SpareRoom Listings`;

    // Use custom email sender if configured, otherwise use Resend's default
    // For production with verified domain: 'Sparemate <notifications@yourdomain.com>'
    // For testing: 'Sparemate <onboarding@resend.dev>' (Resend's default)
    const fromEmail = process.env.EMAIL_FROM || 'Sparemate <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: generateEmailHtml(ads),
      text: generateEmailText(ads),
    });

    console.log(`✓ Email sent to ${to} for ${ads.length} new listing(s)`);
  } catch (error) {
    console.error(`✗ Failed to send email to ${to}:`, error);
    throw error;
  }
}
