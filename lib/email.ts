/**
 * Email Service using Resend
 * Sends notification emails for new SpareRoom listings
 */

import { Resend } from 'resend';
import { SpareRoomAd } from './scraper';

const resend = new Resend(process.env.RESEND_API_KEY);

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
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              You're receiving this because you subscribed to <strong>Sparemate</strong>
            </p>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
              Instant notifications for SpareRoom listings
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

  const footer = `\n\n${'='.repeat(60)}\n\nYou're receiving this because you subscribed to Sparemate.\nInstant notifications for SpareRoom listings.`;

  return header + adsText + footer;
}

/**
 * Send email notification for new listings
 */
export async function sendNewListingsEmail(
  to: string,
  ads: SpareRoomAd[]
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (ads.length === 0) {
    console.log('No ads to send');
    return;
  }

  try {
    const subject =
      ads.length === 1
        ? `🚨 New SpareRoom Listing: ${ads[0].title}`
        : `🚨 ${ads.length} New SpareRoom Listings`;

    await resend.emails.send({
      from: 'Sparemate <notifications@updates.sparemate.com>',
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
