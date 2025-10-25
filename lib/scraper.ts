/**
 * SpareRoom Scraper
 * Scrapes SpareRoom listings and extracts ad details
 */

import * as cheerio from 'cheerio';

export interface SpareRoomAd {
  id: string;
  url: string;
  title: string;
  price: string | null;
  location: string | null;
  propertyType: string | null;
  availability: string | null;
  billsIncluded: boolean;
  minTerm: string | null;
  maxTerm: string | null;
  imageUrl: string | null;
  postedAt: string | null;
  rawText: string;
}

/**
 * Extract price from text
 */
function extractPrice(text: string): string | null {
  const match = text.match(/£[\d,]+\s*(?:pcm|pw|per month|per week)/i);
  return match ? match[0] : null;
}

/**
 * Extract location from text
 */
function extractLocation(text: string): string | null {
  // Look for postcode patterns like (NW8), (SW8), etc.
  const match = text.match(/([A-Za-z\s]+)\s*\(([A-Z]{1,2}\d{1,2}[A-Z]?)\)/);
  if (match) {
    return `${match[1].trim()} (${match[2]})`;
  }
  return null;
}

/**
 * Extract property type from text
 */
function extractPropertyType(text: string): string | null {
  const patterns = [
    /\d+\s+bed\s+(?:flat|house|apartment)/i,
    /Double\s+room/i,
    /Single\s+room/i,
    /Studio/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

/**
 * Extract availability date from text
 */
function extractAvailability(text: string): string | null {
  const match = text.match(/Available\s+(?:Now|(?:\d{1,2}\s+\w+(?:\s+\d{4})?))/i);
  return match ? match[0] : null;
}

/**
 * Check if bills are included
 */
function extractBillsIncluded(text: string): boolean {
  return /bills?\s+included/i.test(text) || /\(all[- ]in\)/i.test(text);
}

/**
 * Extract minimum rental term
 */
function extractMinTerm(text: string): string | null {
  const match = text.match(/Min(?:imum)?\s+(?:term|let)[:\s]+(\d+)\s+months?/i);
  return match ? `${match[1]} months` : null;
}

/**
 * Extract maximum rental term
 */
function extractMaxTerm(text: string): string | null {
  const match = text.match(/Max(?:imum)?\s+(?:term|let)[:\s]+(\d+)\s+months?/i);
  return match ? `${match[1]} months` : null;
}

/**
 * Extract posted date from text
 */
function extractPostedAt(text: string): string | null {
  // Look for patterns like "Added today", "Added 2 hours ago", "Added 3 days ago"
  const patterns = [
    /Added\s+(today|yesterday)/i,
    /Added\s+(\d+)\s+(hour|hours|day|days|week|weeks)\s+ago/i,
    /Posted\s+(today|yesterday)/i,
    /Posted\s+(\d+)\s+(hour|hours|day|days|week|weeks)\s+ago/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

/**
 * Parse SpareRoom HTML and extract all ads
 */
function parseSpareRoomAds(html: string): Map<string, SpareRoomAd> {
  const $ = cheerio.load(html);
  const ads = new Map<string, SpareRoomAd>();

  // Find all listing items - specifically target list items with articles
  $('ul li article').each((_, element) => {
    const $article = $(element);
    const $link = $article.find('a').first();

    // Check for featured label and skip if present
    const featuredLabel = $article.find('header div p').first().text().trim();
    if (featuredLabel && featuredLabel.toLowerCase().includes('featured')) {
      console.log('Skipping featured listing');
      return; // Skip this listing
    }

    const href = $link.attr('href');
    if (!href || !href.includes('flatshare_detail.pl') || !href.includes('flatshare_id=')) {
      return;
    }

    const match = href.match(/flatshare_id=(\d+)/);
    if (!match) return;

    const adId = match[1];
    const fullUrl = href.startsWith('/')
      ? `https://www.spareroom.co.uk${href}`
      : href;

    // Extract title from specific path: article/a/div/div[1]/div[2]/div/h2
    // Try multiple selectors to find the h2 title
    let $title = $link.find('h2').first();
    let title = $title.text().trim();

    // If title is empty or too long (likely grabbed wrong element), try class selector
    if (!title || title.length > 200) {
      $title = $link.find('.listing-card__title, h2.listing-card__title').first();
      title = $title.text().trim();
    }

    // Remove "Featured" from title if present and trim all spaces
    title = title.replace(/featured/gi, '').trim();

    // Remove extra whitespace and newlines
    title = title.replace(/\s+/g, ' ').trim();

    title = title || 'No title found';

    console.log('Extracted title:', title);

    // Extract location from: article/a/div/div[1]/div[2]/div/p[1]
    const $locationEl = $link.find('div div:nth-child(2) div p').first();
    const location = $locationEl.text().trim() || null;

    // Extract price from: article/a/div/div[1]/div[2]/div/p[2] or p.listing-card__price
    let price: string | null = null;
    const $priceEl = $link.find('p.listing-card__price').first();
    if ($priceEl.length > 0) {
      price = $priceEl.text().trim();
    } else {
      // Fallback: try second <p> tag
      const $priceAlt = $link.find('div div:nth-child(2) div p:nth-child(2)').first();
      if ($priceAlt.length > 0) {
        price = $priceAlt.text().trim();
      }
    }

    // Extract image from: article/a/div/div[1]/div[1]/div[1]/img
    let imageUrl: string | null = null;

    // Find the MAIN listing image - try multiple strategies in order of priority
    // 1. Look for image with listing-card__main-image class
    let $img = $link.find('img.listing-card__main-image').first();

    // 2. If not found, look for any image with "main" in its class
    if ($img.length === 0) {
      $img = $link.find('img[class*="main"]').first();
    }

    // 3. If still not found, get the first img tag
    if ($img.length === 0) {
      $img = $link.find('img').first();
    }

    console.log('=====================================');
    console.log('Looking for image in listing:', adId, '-', title);
    console.log('Image element found:', $img.length > 0);
    console.log('Image class:', $img.attr('class'));

    if ($img.length > 0) {
      const rawSrc = $img.attr('src');
      console.log('Raw src attribute:', rawSrc);
      console.log('All img attributes:', {
        src: $img.attr('src'),
        'data-src': $img.attr('data-src'),
        class: $img.attr('class'),
        alt: $img.attr('alt')
      });

      // Try ALL possible image attributes
      let src = $img.attr('src') ||
                $img.attr('data-src') ||
                $img.attr('data-lazy-src') ||
                $img.attr('data-original') ||
                $img.attr('data-srcset') ||
                $img.attr('srcset') ||
                null;

      if (src) {
        console.log('Before cleanup:', src);

        // Clean up HTML entities (&amp; -> &)
        src = src.replace(/&amp;/g, '&');

        console.log('After HTML entity cleanup:', src);

        // Take first URL from srcset if that's what we got
        const cleanSrc = src.split(',')[0].split(' ')[0].trim();

        console.log('After split/trim:', cleanSrc);

        // Handle protocol-relative URLs (starting with //)
        if (cleanSrc.startsWith('//')) {
          imageUrl = `https:${cleanSrc}`;
        } else if (cleanSrc.startsWith('http')) {
          imageUrl = cleanSrc;
        } else if (cleanSrc.startsWith('/')) {
          imageUrl = `https://www.spareroom.co.uk${cleanSrc}`;
        } else {
          // Relative URL without leading slash
          imageUrl = `https://www.spareroom.co.uk/${cleanSrc}`;
        }
        console.log('✅ FINAL IMAGE URL:', imageUrl);
      } else {
        console.log('❌ Image element found but no src attribute for listing:', adId);
      }
    } else {
      console.log('❌ NO image element found for listing:', adId);
      console.log('Article HTML snippet:', $article.html()?.substring(0, 500));
    }
    console.log('=====================================');

    // Collect all text for regex extraction
    const rawText = $article.text();

    const ad: SpareRoomAd = {
      id: adId,
      url: fullUrl,
      title,
      price: price || extractPrice(rawText), // Use extracted price, fallback to regex
      location: location || extractLocation(rawText),
      propertyType: extractPropertyType(rawText),
      availability: extractAvailability(rawText),
      billsIncluded: extractBillsIncluded(rawText),
      minTerm: extractMinTerm(rawText),
      maxTerm: extractMaxTerm(rawText),
      imageUrl,
      postedAt: extractPostedAt(rawText),
      rawText,
    };

    ads.set(adId, ad);
  });

  return ads;
}

/**
 * Fetch and parse SpareRoom page to get all ads
 */
export async function fetchSpareRoomAds(url: string): Promise<SpareRoomAd[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const adsMap = parseSpareRoomAds(html);

    // Convert map to array and sort by ID (descending) to get newest first
    return Array.from(adsMap.values()).sort((a, b) => {
      return parseInt(b.id) - parseInt(a.id);
    });
  } catch (error) {
    console.error('Error fetching SpareRoom ads:', error);
    throw error;
  }
}

/**
 * Get new ads since the last checked ad ID
 */
export function getNewAds(
  allAds: SpareRoomAd[],
  lastCheckedAdId: string | null
): SpareRoomAd[] {
  if (!lastCheckedAdId) {
    // If no last checked ID, return empty (don't spam new users with existing ads)
    // The cron job will initialize their last_checked_ad_id to the current newest
    return [];
  }

  // Find all ads with ID greater than the last checked ID
  const lastCheckedIdNum = parseInt(lastCheckedAdId);
  const newAds = allAds.filter((ad) => parseInt(ad.id) > lastCheckedIdNum);

  return newAds;
}

/**
 * Format ad details for email
 */
export function formatAdForEmail(ad: SpareRoomAd): string {
  const lines: string[] = [];

  lines.push(`**${ad.title}**`);
  lines.push(`ID: ${ad.id}`);
  lines.push(`URL: ${ad.url}`);

  if (ad.price) {
    const priceStr = ad.billsIncluded ? `${ad.price} (bills included)` : ad.price;
    lines.push(`Price: ${priceStr}`);
  }

  if (ad.location) {
    lines.push(`Location: ${ad.location}`);
  }

  if (ad.propertyType) {
    lines.push(`Type: ${ad.propertyType}`);
  }

  if (ad.availability) {
    lines.push(`Availability: ${ad.availability}`);
  }

  if (ad.minTerm || ad.maxTerm) {
    const termParts: string[] = [];
    if (ad.minTerm) termParts.push(`min ${ad.minTerm}`);
    if (ad.maxTerm) termParts.push(`max ${ad.maxTerm}`);
    lines.push(`Term: ${termParts.join(', ')}`);
  }

  return lines.join('\n');
}
