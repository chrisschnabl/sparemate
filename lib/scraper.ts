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
 * Parse SpareRoom HTML and extract all ads
 */
function parseSpareRoomAds(html: string): Map<string, SpareRoomAd> {
  const $ = cheerio.load(html);
  const ads = new Map<string, SpareRoomAd>();

  // Find all listing items
  $('li').each((_, element) => {
    const $li = $(element);
    const rawTextParts: string[] = [];

    // Collect all text from the listing
    $li.find('*').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        rawTextParts.push(text);
      }
    });

    // Look for the main ad link
    $li.find('a').each((_, anchor) => {
      const href = $(anchor).attr('href');
      if (href && href.includes('flatshare_detail.pl') && href.includes('flatshare_id=')) {
        const match = href.match(/flatshare_id=(\d+)/);
        if (match) {
          const adId = match[1];
          const fullUrl = href.startsWith('/')
            ? `https://www.spareroom.co.uk${href}`
            : href;

          const rawText = rawTextParts.join(' ');
          const title = $(anchor).text().trim() || 'No title found';

          const ad: SpareRoomAd = {
            id: adId,
            url: fullUrl,
            title: title.length > 15 ? title : 'No title found',
            price: extractPrice(rawText),
            location: extractLocation(rawText),
            propertyType: extractPropertyType(rawText),
            availability: extractAvailability(rawText),
            billsIncluded: extractBillsIncluded(rawText),
            minTerm: extractMinTerm(rawText),
            maxTerm: extractMaxTerm(rawText),
            rawText,
          };

          ads.set(adId, ad);
        }
      }
    });
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
    // If no last checked ID, return the newest ad only (to initialize)
    return allAds.length > 0 ? [allAds[0]] : [];
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
