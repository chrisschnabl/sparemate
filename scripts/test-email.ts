import { config } from 'dotenv';
import { sendNewListingsEmail } from '../lib/email';
import { SpareRoomAd } from '../lib/scraper';

// Load environment variables
config({ path: '.env.local' });

async function testEmail() {
  console.log('=================================================');
  console.log('📧 EMAIL TEST & DEBUG SCRIPT');
  console.log('=================================================\n');

  // Check environment variables
  console.log('🔍 Environment Check:');
  console.log('─────────────────────────────────────────────────');
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const apiKeyPreview = process.env.RESEND_API_KEY
    ? `${process.env.RESEND_API_KEY.substring(0, 10)}...`
    : 'NOT SET';

  console.log(`RESEND_API_KEY: ${hasApiKey ? '✅' : '❌'} ${apiKeyPreview}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || '(using default: onboarding@resend.dev)'}`);
  console.log('');

  if (!hasApiKey) {
    console.log('❌ ERROR: RESEND_API_KEY is not set!');
    console.log('   Please add it to .env.local file\n');
    process.exit(1);
  }

  // Get test email from command line or use default
  const testEmail = process.argv[2] || process.env.EMAIL_FROM || 'test@example.com';
  console.log('📬 Test Configuration:');
  console.log('─────────────────────────────────────────────────');
  console.log(`Recipient: ${testEmail}`);
  console.log(`From: ${process.env.EMAIL_FROM || 'Sparemate <onboarding@resend.dev>'}`);
  console.log('');

  try {
    // Create mock listings
    const mockListings: SpareRoomAd[] = [
      {
        id: '12345678',
        url: 'https://www.spareroom.co.uk/flatshare/london/12345678',
        title: '2 Bedroom Flat in Central London',
        price: '£1,500 pcm',
        location: 'Shoreditch (E1 6AN)',
        propertyType: '2 bed flat',
        availability: 'Available Now',
        billsIncluded: true,
        minTerm: '6 months',
        maxTerm: '12 months',
        imageUrl: null,
        postedAt: 'Added today',
        rawText: 'Mock listing text',
      },
      {
        id: '87654321',
        url: 'https://www.spareroom.co.uk/flatshare/london/87654321',
        title: 'Double Room in Shared House',
        price: '£800 pcm',
        location: 'Hackney (E8 2AA)',
        propertyType: 'Double room',
        availability: 'Available 01 January',
        billsIncluded: false,
        minTerm: null,
        maxTerm: null,
        imageUrl: null,
        postedAt: 'Added 2 hours ago',
        rawText: 'Mock listing text',
      },
    ];

    console.log('📦 Mock Listings:');
    console.log('─────────────────────────────────────────────────');
    mockListings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing.title}`);
      console.log(`   Price: ${listing.price}`);
      console.log(`   Location: ${listing.location}`);
    });
    console.log('');

    console.log('📤 Sending Email...');
    console.log('─────────────────────────────────────────────────');

    const startTime = Date.now();
    await sendNewListingsEmail(testEmail, mockListings);
    const duration = Date.now() - startTime;

    console.log('');
    console.log('=================================================');
    console.log('✅ SUCCESS! Email sent successfully');
    console.log('=================================================');
    console.log(`Duration: ${duration}ms`);
    console.log(`\n📬 Check your inbox at: ${testEmail}`);
    console.log('\nNext steps:');
    console.log('  1. Check your email inbox');
    console.log('  2. Check spam/junk folder if not in inbox');
    console.log('  3. View sent emails: https://resend.com/emails');
    console.log('  4. Check Resend logs for delivery status\n');

    process.exit(0);
  } catch (error) {
    console.log('');
    console.log('=================================================');
    console.log('❌ ERROR! Email sending failed');
    console.log('=================================================\n');

    if (error instanceof Error) {
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('\nStack Trace:');
      console.log(error.stack);
    } else {
      console.log('Error:', error);
    }

    console.log('\n🔍 Troubleshooting:');
    console.log('  1. Verify RESEND_API_KEY in .env.local is correct');
    console.log('  2. Check Resend account has credits/is active');
    console.log('  3. Verify email address format is valid');
    console.log('  4. Check Resend dashboard: https://resend.com');
    console.log('  5. Review API docs: https://resend.com/docs\n');

    process.exit(1);
  }
}

testEmail();
