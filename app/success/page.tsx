'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

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
  postedAt: string | null;
  imageUrl: string | null;
}

export default function Success() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spareroomUrl, setSpareroomUrl] = useState('');
  const [emailsEnabled, setEmailsEnabled] = useState(true);
  const [togglingEmails, setTogglingEmails] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(true);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    async function fetchListings() {
      try {
        // First, try to get URL from localStorage (most reliable)
        let url = localStorage.getItem('sparemate_spareroom_url');
        console.log('URL from localStorage:', url);

        if (!url) {
          console.warn('No URL in localStorage, trying session API...');
        }

        // If not in localStorage, try the API
        if (!url && sessionId) {
          console.log('Fetching session with ID:', sessionId, 'Attempt:', retryCount + 1);
          try {
            const sessionResponse = await fetch(`/api/get-session?session_id=${sessionId}`);
            const sessionData = await sessionResponse.json();

            console.log('Session response:', sessionData);

            if (!sessionResponse.ok) {
              console.error('Session fetch failed:', sessionData);

              // Retry if user not found and we haven't exceeded max retries
              if (sessionResponse.status === 404 && retryCount < maxRetries) {
                retryCount++;
                setRetryAttempt(retryCount);
                console.log(`Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
                setTimeout(fetchListings, 2000);
                return;
              }

              throw new Error(sessionData.error || 'Failed to get session');
            }

            url = sessionData.spareroomUrl;
          } catch (apiError) {
            console.error('API error:', apiError);
            // Continue to fallback
          }
        }

        if (!url) {
          setError('No Spareroom URL found. Please go back and try again.');
          setLoading(false);
          return;
        }

        // Store URL
        setSpareroomUrl(url);

        // Fetch listings from Spareroom
        const listingsResponse = await fetch('/api/fetch-listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ spareroomUrl: url }),
        });

        const listingsData = await listingsResponse.json();

        if (!listingsResponse.ok) {
          throw new Error(listingsData.error || 'Failed to fetch listings');
        }

        setListings(listingsData.listings);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    }

    fetchListings();
  }, [sessionId]);

  // Auto-hide success popup after 5 seconds with fade out
  useEffect(() => {
    if (showSuccessPopup) {
      const timer = setTimeout(() => {
        // Add fade-out class
        const popup = document.getElementById('success-popup');
        if (popup) {
          popup.style.opacity = '0';
          popup.style.transition = 'opacity 0.5s ease-out';
        }
        // Remove from DOM after fade out
        setTimeout(() => setShowSuccessPopup(false), 500);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup]);

  const handleToggleEmails = async () => {
    if (!sessionId) return;

    setTogglingEmails(true);
    try {
      const response = await fetch('/api/toggle-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          enabled: !emailsEnabled,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmailsEnabled(data.emailsEnabled);
      }
    } catch (err) {
      console.error('Error toggling emails:', err);
    }
    setTogglingEmails(false);
  };

  const handleRefresh = async () => {
    if (!spareroomUrl) return;

    setRefreshing(true);
    setError('');

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh listings');
    }

    setRefreshing(false);
  };

  const handleSendTestEmail = async () => {
    if (!sessionId || listings.length === 0) return;

    setSendingTestEmail(true);
    setTestEmailResult('');

    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          listings: listings.slice(0, 3) // Send first 3 listings as test
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setTestEmailResult('✅ Test email sent successfully! Check your inbox.');
      setTimeout(() => setTestEmailResult(''), 5000);
    } catch (err) {
      setTestEmailResult(`❌ ${err instanceof Error ? err.message : 'Failed to send test email'}`);
      setTimeout(() => setTestEmailResult(''), 5000);
    }

    setSendingTestEmail(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-8">
      {/* Success Popup Notification */}
      {showSuccessPopup && (
        <div id="success-popup" className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 text-center border-2 border-green-500 max-w-md">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              You're all set!
            </h2>
            <p className="text-gray-600">
              You'll start receiving instant notifications about new Spareroom listings.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* What Happens Next */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">


          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              What happens next?
            </h2>
            <ul className="text-left text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span>📧</span>
                <span>Notifications will be sent to your email within 1 minute of new listings</span>
              </li>
              <li className="flex items-start gap-2">
                <span>🚀</span>
                <span>Our system checks for new properties every 5 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <span>🎯</span>
                <span>Be the first to apply and increase your chances of success</span>
              </li>
            </ul>
          </div>


          {/* Email Notifications Toggle */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  📧 Email Notifications
                </h2>
                <p className="text-yellow-800 text-sm">
                  {emailsEnabled
                    ? 'You will receive instant email notifications when new listings appear.'
                    : 'Email notifications are currently disabled. Toggle to receive alerts.'}
                </p>
              </div>
              <button
                onClick={handleToggleEmails}
                disabled={togglingEmails}
                className={`ml-4 relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  emailsEnabled ? 'bg-green-500' : 'bg-gray-300'
                } ${togglingEmails ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    emailsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p className="mb-2">
              Your 3-day free trial has started. After the trial, you'll be charged £10/week.
            </p>
            <p>
              You can cancel anytime from your Stripe customer portal.
            </p>
          </div>
        </div>

        {/* Saved Search Results */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Your Saved Search Results
            </h2>
            {!loading && !error && spareroomUrl && (
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>{refreshing ? '🔄' : '↻'}</span>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail || listings.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>📧</span>
                  {sendingTestEmail ? 'Sending...' : 'Test Email'}
                </button>
              </div>
            )}
          </div>

          {testEmailResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              testEmailResult.startsWith('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testEmailResult}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
              <p className="mt-4 text-gray-600">
                {retryAttempt > 0
                  ? `Waiting for payment confirmation... (${retryAttempt}/5)`
                  : 'Loading your search results...'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No listings found for your search criteria.</p>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="space-y-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-pink-500 transition-colors"
                >
                  {/* Image */}
                  <div className="h-48 overflow-hidden bg-gray-200 relative flex items-center justify-center">
                    {listing.imageUrl ? (
                      <>
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover absolute inset-0"
                          onError={(e) => {
                            // If image fails to load, hide it
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center -z-10">
                          <span className="text-6xl">🏠</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <span className="text-6xl">🏠</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {listing.title}
                      </h3>
                      {listing.price && (
                        <span className="text-xl font-bold text-pink-600 ml-4">
                          {listing.price}
                          {listing.billsIncluded && (
                            <span className="text-sm text-green-600 ml-2">
                              (bills incl.)
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                    {listing.location && (
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{listing.location}</span>
                      </div>
                    )}
                    {listing.propertyType && (
                      <div className="flex items-center gap-2">
                        <span>🏠</span>
                        <span>{listing.propertyType}</span>
                      </div>
                    )}
                    {listing.availability && (
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{listing.availability}</span>
                      </div>
                    )}
                    {(listing.minTerm || listing.maxTerm) && (
                      <div className="flex items-center gap-2">
                        <span>⏱️</span>
                        <span>
                          {listing.minTerm && `Min: ${listing.minTerm}`}
                          {listing.minTerm && listing.maxTerm && ', '}
                          {listing.maxTerm && `Max: ${listing.maxTerm}`}
                        </span>
                      </div>
                    )}
                  </div>

                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-semibold"
                    >
                      View Details →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> These are your current listings. You'll receive email notifications within 1 minute whenever a new listing matching your criteria is posted!
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
