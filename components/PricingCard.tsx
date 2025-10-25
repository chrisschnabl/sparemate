'use client';

import { useState, useEffect } from 'react';

interface Listing {
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
}

export default function PricingCard() {
  const [spareroomUrl, setSpareroomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [showListings, setShowListings] = useState(false);
  const [urlStored, setUrlStored] = useState(false);

  const handleInputClick = async () => {
    // Only auto-paste if the field is empty
    if (spareroomUrl) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      // Check if clipboard contains a valid Spareroom URL
      if (clipboardText.startsWith('https://www.spareroom.co.uk/flatshare/')) {
        setSpareroomUrl(clipboardText);
      }
    } catch (err) {
      // Clipboard access denied or not available - silently fail
      console.log('Clipboard access not available');
    }
  };

  useEffect(() => {
    // Load Stripe Buy Button script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleFetchListings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowListings(false);

    // Validate URL
    if (!spareroomUrl.startsWith('https://www.spareroom.co.uk/flatshare/')) {
      setError('Please enter a valid Spareroom URL starting with https://www.spareroom.co.uk/flatshare/');
      setLoading(false);
      return;
    }

    try {
      // Store the URL in database/localStorage for later
      const storeResponse = await fetch('/api/store-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spareroomUrl }),
      });

      if (!storeResponse.ok) {
        throw new Error('Failed to store URL');
      }

      const storeData = await storeResponse.json();
      // Store the URL and custom ID in localStorage so we can reference it after payment
      localStorage.setItem('sparemate_url_id', storeData.urlId);
      localStorage.setItem('sparemate_spareroom_url', spareroomUrl);

      // Fetch listings from Spareroom
      const listingsResponse = await fetch('/api/fetch-listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spareroomUrl }),
      });

      const listingsData = await listingsResponse.json();

      if (!listingsResponse.ok) {
        throw new Error(listingsData.error || 'Failed to fetch listings');
      }

      setListings(listingsData.listings);
      setShowListings(true);
      setUrlStored(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
      <h2 className="text-3xl font-bold text-center mb-6">
        Simple, Transparent Pricing
      </h2>

      {/* Three Colored Bubbles */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-full shadow-md">
          <span className="text-lg">🆓</span>
          <span className="font-semibold">3 Days Free Trial</span>
        </div>
        <div className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-full shadow-md">
          <span className="text-lg">⏰</span>
          <span className="font-semibold">Cancel Anytime</span>
        </div>
        <div className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-full shadow-md">
          <span className="text-lg">💯</span>
          <span className="font-semibold">100% Refund</span>
        </div>
      </div>

      <p className="text-gray-600 text-center mb-6">
        Try everything with no commitment. No long-term contracts or hidden fees. Not satisfied? Get your money back, no questions asked.
      </p>

      <hr className="my-6 border-gray-200" />

      {/* Subscription Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-3">Complete Your Subscription</h3>

        {/* Highlighted Price - Free Trial Emphasis */}
        <div className="bg-pink-100 border-2 border-pink-500 rounded-lg p-4 mb-5 text-center">
          <div className="mb-2">
            <span className="text-2xl font-bold text-pink-700">3-Day Free Trial</span>
          </div>
          <p className="text-sm text-pink-700 mb-3">
            Only £10 per week after trial
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-pink-600">
            <span className="italic">✓ 90% visit their first flat in trial</span>
            <span className="italic">✓ Cancel anytime, full refund</span>
          </div>
        </div>

        {/* Spareroom URL Form */}
        {!showListings && (
          <form onSubmit={handleFetchListings} className="space-y-4">
            <div>
              <label htmlFor="spareroomUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Your Spareroom Search URL
              </label>
              <input
                type="url"
                id="spareroomUrl"
                value={spareroomUrl}
                onChange={(e) => setSpareroomUrl(e.target.value)}
                onClick={handleInputClick}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="https://www.spareroom.co.uk/flatshare/..."
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2">
                Go to Spareroom, set your search filters, and copy the URL from your browser.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 text-white py-4 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading your listings...' : 'Preview Your Search'}
            </button>
          </form>
        )}

        {/* Show Listings */}
        {showListings && listings.length > 0 && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                ✅ <strong>Found {listings.length} listing{listings.length !== 1 ? 's' : ''}!</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                Most recent: {(() => {
                  const recentCount = listings.filter(listing => {
                    const listingId = parseInt(listing.id);
                    const now = Date.now();
                    const estimatedAge = Math.floor((now - (listingId * 1000)) / (1000 * 60 * 60));
                    return estimatedAge < 1;
                  }).length;

                  const newestListing = listings[0];
                  const listingId = parseInt(newestListing.id);
                  const now = Date.now();
                  const estimatedAge = Math.floor((now - (listingId * 1000)) / (1000 * 60 * 60));

                  if (estimatedAge < 1) {
                    return `${recentCount} posted in the last hour`;
                  }
                  if (estimatedAge < 24) return `Posted ${estimatedAge} hour${estimatedAge !== 1 ? 's' : ''} ago`;
                  const days = Math.floor(estimatedAge / 24);
                  return `Posted ${days} day${days !== 1 ? 's' : ''} ago`;
                })()}
              </p>
              <div className="mt-2 bg-red-50 border border-red-200 rounded px-3 py-2">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ {(() => {
                    const recentCount = listings.filter(listing => {
                      const listingId = parseInt(listing.id);
                      const now = Date.now();
                      const estimatedAge = Math.floor((now - (listingId * 1000)) / (1000 * 60 * 60));
                      return estimatedAge < 1;
                    }).length;
                    return `${recentCount} of ${listings.length} listing${recentCount !== 1 ? 's' : ''} posted in the last hour that Spareroom's email alerts would have missed`;
                  })()}
                </p>
              </div>
              <p className="text-xs text-green-700 mt-2">
                📬 Subscribe to get instant notifications within 1 minute of posting
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 mb-4">
              {listings.slice(0, 5).map((listing) => (
                <div
                  key={listing.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-pink-500 transition-colors bg-white"
                >
                  {/* Image */}
                  <div className="h-32 overflow-hidden bg-gray-200 relative flex items-center justify-center">
                    {listing.imageUrl ? (
                      <>
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover absolute inset-0 blur-[2px]"
                          onError={(e) => {
                            // If image fails to load, hide it
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center -z-10">
                          <span className="text-4xl">🏠</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <span className="text-4xl">🏠</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 flex-1">
                        {listing.title}
                      </h4>
                      {listing.price && (
                        <span className="text-sm font-bold text-pink-600 ml-2">
                          <span className="blur-[2px] select-none">
                            {listing.price.replace(/\s*(pcm|pw|per month|per week)$/i, '')}
                          </span>
                          <span className="ml-1">
                            {listing.price.match(/\s*(pcm|pw|per month|per week)$/i)?.[0]}
                          </span>
                        </span>
                      )}
                    </div>
                    {listing.postedAt && (
                      <div className="mb-2">
                        <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          🕐 {listing.postedAt}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-600 space-y-1">
                      {listing.location && (
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          <span>{listing.location}</span>
                        </div>
                      )}
                      {listing.availability && (
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{listing.availability}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {listings.length > 5 && (
              <p className="text-xs text-gray-500 text-center mb-4">
                Showing 5 of {listings.length} listings. Subscribe to see all and get instant notifications!
              </p>
            )}

            <button
              onClick={() => {
                setShowListings(false);
                setListings([]);
                setSpareroomUrl('');
                setUrlStored(false);
              }}
              className="text-sm text-pink-600 hover:text-pink-700 mb-4"
            >
              ← Change search URL
            </button>
          </div>
        )}

        {/* Stripe Buy Button */}
        {urlStored && (
          <div className="flex justify-center">
            {/* @ts-expect-error Stripe Buy Button is a custom web component */}
            <stripe-buy-button
              buy-button-id="buy_btn_1SLiF5DHXZlmhouDgTDwxphx"
              publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
            >
            {/* @ts-expect-error */}
            </stripe-buy-button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          By subscribing, you agree to our terms of service. You can cancel anytime.
        </p>
      </div>
    </div>
  );
}
