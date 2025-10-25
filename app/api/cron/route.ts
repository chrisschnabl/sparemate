/**
 * Cron Job API Endpoint
 * Triggered by Vercel Cron every 5 minutes
 * Checks for new SpareRoom listings for all active subscribers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsers, updateLastCheckedAdId } from '@/lib/db';
import { fetchSpareRoomAds, getNewAds } from '@/lib/scraper';
import { sendNewListingsEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  // Verify this request is from Vercel Cron or authorized manually
  const userAgent = req.headers.get('user-agent') || '';
  const authHeader = req.headers.get('authorization');

  // Allow requests from:
  // 1. Vercel Cron (has vercel-cron user agent)
  // 2. Manual testing with CRON_SECRET (authorization header)
  const isVercelCron = userAgent.includes('vercel-cron');
  const isAuthorized = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔄 Cron job started at', new Date().toISOString());

  try {
    // Get all active subscribers
    const activeUsers = await getActiveUsers();
    console.log(`📊 Found ${activeUsers.length} active user(s)`);

    if (activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users to process',
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      notifications: 0,
    };

    // Process each user
    for (const user of activeUsers) {
      results.processed++;

      try {
        // Skip users without a Spareroom URL
        if (!user.spareroom_url) {
          console.log(`⚠️  User ${user.email} has no Spareroom URL, skipping`);
          results.failed++;
          results.errors.push(`${user.email}: No Spareroom URL`);
          continue;
        }

        console.log(`🔍 Checking listings for ${user.email}...`);

        // Fetch all ads from the user's Spareroom URL
        const allAds = await fetchSpareRoomAds(user.spareroom_url);
        console.log(`   Found ${allAds.length} total ads`);

        if (allAds.length === 0) {
          console.log(`   No ads found for ${user.email}`);
          results.successful++;
          continue;
        }

        // Find new ads since last check
        const newAds = getNewAds(allAds, user.last_checked_ad_id);

        if (newAds.length === 0) {
          console.log(`   No new ads for ${user.email}`);

          // Update last checked ad ID to current newest (no email needed)
          const newestAdId = allAds[0].id;
          updateLastCheckedAdId(user.id, newestAdId);
          console.log(`   Updated last_checked_ad_id to ${newestAdId}`);

          results.successful++;
        } else {
          console.log(`   🆕 ${newAds.length} new ad(s) for ${user.email}`);

          // Send email notification
          try {
            await sendNewListingsEmail(user.email, newAds);
            results.notifications++;
            console.log(`   ✅ Email sent to ${user.email}`);

            // Only update last_checked_ad_id if email was sent successfully
            // This ensures we retry failed emails on the next run
            const newestAdId = allAds[0].id;
            updateLastCheckedAdId(user.id, newestAdId);
            console.log(`   Updated last_checked_ad_id to ${newestAdId}`);

            results.successful++;
          } catch (emailError) {
            console.error(`   ❌ Failed to send email to ${user.email}:`, emailError);
            results.errors.push(`${user.email}: Email failed`);
            results.failed++;
            // Don't update last_checked_ad_id - we'll retry these ads next time
            console.log(`   ⚠️  Keeping last_checked_ad_id for retry`);
            continue; // Skip to next user
          }
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
        results.failed++;
        results.errors.push(
          `${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Add a small delay between users to avoid rate limiting
      if (activeUsers.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('✅ Cron job completed');
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Successful: ${results.successful}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Notifications sent: ${results.notifications}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
