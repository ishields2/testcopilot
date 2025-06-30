export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 px-6 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-blue-600">
          TestCopilot
        </h1>
        <p className="text-xl md:text-2xl mb-8">
          AI-powered insights for your Cypress tests.<br className="hidden md:inline" /> No setup. No fluff. Just answers.
        </p>
        <ul className="text-lg text-left mx-auto mb-10 list-disc list-inside max-w-md">
          <li>🔍 Spot flaky tests instantly</li>
          <li>🧠 Get plain-English explanations of failures</li>
          <li>🧬 Sniff out brittle selectors before they break</li>
        </ul>

        <form
          action="https://YOUR-MAILERLITE-FORM-URL"
          method="post"
          target="_blank"
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="Your email address"
            className="w-full sm:w-2/3 px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
          >
            Join Waitlist
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4">
          No spam. Just early access + updates.
        </p>
      </div>
    </main>
  );
}
