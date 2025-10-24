import PricingCard from '@/components/PricingCard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Sparemate
          </h1>
          <p className="text-2xl text-gray-600 mb-12">
            Instant Spareroom notifications
          </p>

          {/* Features */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Be the first
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get instant alerts without the lag of Spareroom (&lt;1 minute vs. multiple hours)
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Real-time Updates
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Never miss out on new properties and skip the queue
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="text-5xl mb-4">📬</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Increase reply rate
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Avoid being left on read
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="max-w-3xl mx-auto">
          <PricingCard />
        </div>

        {/* Footer */}
        <footer className="mt-24 text-center text-gray-500 text-sm">
          <p>Powered by Sparemate - Your personal Spareroom assistant</p>
        </footer>
      </main>
    </div>
  );
}
