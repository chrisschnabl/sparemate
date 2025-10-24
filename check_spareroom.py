#!/usr/bin/env python3
"""
SpareRoom Ad Monitor
Checks for new ads every minute and notifies when a new listing appears.
"""

import time
import re
from datetime import datetime
from urllib.request import urlopen, Request
from html.parser import HTMLParser


class SpareRoomParser(HTMLParser):
    """Parse SpareRoom HTML to extract all ad listings with detailed information."""

    def __init__(self):
        super().__init__()
        self.ads = {}  # Store ads by ID with all details
        self.current_li = None
        self.in_main_link = False
        self.capture_text = False
        self.text_buffer = []
        self.text_context = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Start of a listing item
        if tag == 'li':
            # Check if this li contains an ad
            self.current_li = {'raw_text': []}

        # Look for the main ad link
        if tag == 'a' and 'href' in attrs_dict and self.current_li is not None:
            href = attrs_dict['href']
            if 'flatshare_detail.pl' in href and 'flatshare_id=' in href:
                match = re.search(r'flatshare_id=(\d+)', href)
                if match:
                    ad_id = match.group(1)
                    # Build full URL
                    if href.startswith('/'):
                        url = f'https://www.spareroom.co.uk{href}'
                    else:
                        url = href

                    self.current_li['id'] = ad_id
                    self.current_li['url'] = url
                    self.in_main_link = True
                    self.capture_text = True

    def handle_endtag(self, tag):
        if tag == 'a' and self.in_main_link:
            self.in_main_link = False
            self.capture_text = False

        if tag == 'li' and self.current_li is not None:
            # Process the complete listing
            if 'id' in self.current_li:
                ad_id = self.current_li['id']
                raw_text = ' '.join(self.current_li['raw_text'])

                # Extract structured data from accumulated text
                ad_data = {
                    'id': ad_id,
                    'url': self.current_li['url'],
                    'title': self._extract_title(raw_text),
                    'price': self._extract_price(raw_text),
                    'location': self._extract_location(raw_text),
                    'property_type': self._extract_property_type(raw_text),
                    'availability': self._extract_availability(raw_text),
                    'bills_included': self._extract_bills_included(raw_text),
                    'min_term': self._extract_min_term(raw_text),
                    'max_term': self._extract_max_term(raw_text),
                    'raw_text': raw_text
                }

                self.ads[ad_id] = ad_data

            self.current_li = None
            self.text_buffer = []

    def handle_data(self, data):
        if self.current_li is not None:
            stripped = data.strip()
            if stripped:
                self.current_li['raw_text'].append(stripped)
                if self.capture_text:
                    self.text_buffer.append(stripped)

    def _extract_title(self, text):
        """Extract the ad title from text buffer."""
        if self.text_buffer:
            # First substantial text is usually the title
            for item in self.text_buffer:
                if len(item) > 15:
                    return item
        return "No title found"

    def _extract_price(self, text):
        """Extract price from text."""
        match = re.search(r'£[\d,]+\s*(?:pcm|pw|per month|per week)', text, re.IGNORECASE)
        return match.group(0) if match else None

    def _extract_location(self, text):
        """Extract location/area from text."""
        # Look for postcode patterns like (NW8), (SW8), etc.
        match = re.search(r'([A-Za-z\s]+)\s*\(([A-Z]{1,2}\d{1,2}[A-Z]?)\)', text)
        if match:
            return f"{match.group(1).strip()} ({match.group(2)})"
        return None

    def _extract_property_type(self, text):
        """Extract property type (room/flat/house)."""
        patterns = [
            r'\d+\s+bed\s+(?:flat|house|apartment)',
            r'Double\s+room',
            r'Single\s+room',
            r'Studio'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        return None

    def _extract_availability(self, text):
        """Extract availability date."""
        match = re.search(r'Available\s+(?:Now|(?:\d{1,2}\s+\w+(?:\s+\d{4})?))', text, re.IGNORECASE)
        return match.group(0) if match else None

    def _extract_bills_included(self, text):
        """Check if bills are included in the price."""
        if re.search(r'bills?\s+included', text, re.IGNORECASE):
            return True
        if re.search(r'\(all[- ]in\)', text, re.IGNORECASE):
            return True
        return False

    def _extract_min_term(self, text):
        """Extract minimum rental term."""
        match = re.search(r'Min(?:imum)?\s+(?:term|let)[:\s]+(\d+)\s+months?', text, re.IGNORECASE)
        return match.group(1) + ' months' if match else None

    def _extract_max_term(self, text):
        """Extract maximum rental term."""
        match = re.search(r'Max(?:imum)?\s+(?:term|let)[:\s]+(\d+)\s+months?', text, re.IGNORECASE)
        return match.group(1) + ' months' if match else None

    def get_newest_ad(self):
        """Return the ad with the highest ID (newest)."""
        if not self.ads:
            return None
        newest_id = max(self.ads.keys(), key=int)
        return self.ads[newest_id]


def fetch_newest_ad(url):
    """Fetch the SpareRoom page and extract the newest ad."""
    try:
        # Add headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }

        req = Request(url, headers=headers)
        with urlopen(req, timeout=30) as response:
            html = response.read().decode('utf-8')

        parser = SpareRoomParser()
        parser.feed(html)

        # Get the ad with the highest ID (newest)
        newest_ad = parser.get_newest_ad()
        return newest_ad

    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Error fetching page: {e}")
        return None


def format_ad_details(ad):
    """Format ad details in a structured, readable way."""
    lines = []
    lines.append(f"  Title:        {ad['title']}")
    lines.append(f"  ID:           {ad['id']}")
    lines.append(f"  URL:          {ad['url']}")

    if ad['price']:
        price_str = ad['price']
        if ad['bills_included']:
            price_str += " (bills included)"
        lines.append(f"  Price:        {price_str}")

    if ad['location']:
        lines.append(f"  Location:     {ad['location']}")

    if ad['property_type']:
        lines.append(f"  Type:         {ad['property_type']}")

    if ad['availability']:
        lines.append(f"  Availability: {ad['availability']}")

    if ad['min_term'] or ad['max_term']:
        term_parts = []
        if ad['min_term']:
            term_parts.append(f"min {ad['min_term']}")
        if ad['max_term']:
            term_parts.append(f"max {ad['max_term']}")
        lines.append(f"  Term:         {', '.join(term_parts)}")

    return '\n'.join(lines)


def main():
    """Main monitoring loop."""
    search_url = 'https://www.spareroom.co.uk/flatshare/index.cgi?search_id=1393389294&offset=0&sort_by=days_since_placed'

    print("🏠 SpareRoom Ad Monitor Started")
    print(f"Checking every 60 seconds...")
    print(f"URL: {search_url}\n")

    last_ad_id = None

    while True:
        try:
            current_time = datetime.now().strftime('%H:%M:%S')

            ad = fetch_newest_ad(search_url)

            if ad:
                if last_ad_id is None:
                    # First run - just store the current newest ad
                    last_ad_id = ad['id']
                    print(f"[{current_time}] Monitoring initialized")
                    print(f"\nCurrent newest ad:")
                    print(format_ad_details(ad))
                    print()

                elif ad['id'] != last_ad_id:
                    # New ad detected!
                    print(f"\n{'='*70}")
                    print(f"🚨 NEW AD DETECTED! [{current_time}]")
                    print(f"{'='*70}")
                    print(format_ad_details(ad))
                    print(f"{'='*70}\n")

                    last_ad_id = ad['id']
                else:
                    # No change
                    print(f"[{current_time}] No new ads (current: {ad['id']})")
            else:
                print(f"[{current_time}] Could not fetch ad data")

            # Wait 60 seconds before next check
            time.sleep(60)

        except KeyboardInterrupt:
            print("\n\n👋 Monitoring stopped by user")
            break
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Unexpected error: {e}")
            time.sleep(60)


if __name__ == '__main__':
    main()
