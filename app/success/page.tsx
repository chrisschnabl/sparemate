export default function Success() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Sparemate!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your subscription is now active. You'll start receiving instant notifications about new Spareroom listings.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            What happens next?
          </h2>
          <ul className="text-left text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span>📧</span>
              <span>Check your email for confirmation and setup instructions</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🚀</span>
              <span>Notifications will be sent to your email within 1 minute of new listings</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🎯</span>
              <span>Be the first to apply and increase your chances of success</span>
            </li>
          </ul>
        </div>

        <div className="text-sm text-gray-500">
          <p className="mb-2">
            Your 3-day free trial has started. After the trial, you'll be charged £10/week.
          </p>
          <p>
            You can cancel anytime from your Stripe customer portal.
          </p>
        </div>

        <a
          href="/"
          className="inline-block mt-8 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
