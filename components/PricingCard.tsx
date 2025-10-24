'use client';

import { useEffect } from 'react';

export default function PricingCard() {
  useEffect(() => {
    // Load Stripe Buy Button script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.body.removeChild(script);
    };
  }, []);

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

        {/* Stripe Buy Button */}
        <div className="flex justify-center">
          <stripe-buy-button
            buy-button-id="buy_btn_1SLiF5DHXZlmhouDgTDwxphx"
            publishable-key="pk_test_51SL6WSDHXZlmhouD2NOsuUM4fniq7K5L4Qww6eW16TrJgnYzb2fUXk013LCXWswfV9o9EFSIoCIO8MW8oT0ukJJD00m49d1sex"
          >
          </stripe-buy-button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          By subscribing, you agree to our terms of service. You can cancel anytime.
        </p>
      </div>
    </div>
  );
}
