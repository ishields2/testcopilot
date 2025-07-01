'use client';

import { useEffect } from 'react';

export default function Home() {
  /* ───────── Load MailerLite universal script once ───────── */
  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://assets.mailerlite.com/js/universal.js';
    s.async = true;
    document.body.appendChild(s);

    // init ML
    (window as any).ml =
      (window as any).ml ||
      function () {
        ((window as any).ml.q = (window as any).ml.q || []).push(arguments);
      };
    (window as any).ml('account', '1631994'); // ← your MailerLite account ID
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 px-6 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-blue-600">
          TestCopilot
        </h1>

        <p className="text-xl md:text-2xl mb-8">
          AI-powered insights for your Cypress tests.
          <br className="hidden md:inline" />
          No setup. No fluff. Just answers.
        </p>

        <ul className="text-lg text-left mx-auto mb-10 list-disc list-inside max-w-md">
          <li>🔍 Spot flaky tests instantly</li>
          <li>🧠 Get plain-English explanations of failures</li>
          <li>🧬 Sniff out brittle selectors before they break</li>
        </ul>

        {/* ───────── MailerLite embedded form ───────── */}
        <div className="ml-embedded mx-auto" data-form="JbRC73"></div>

        <p className="text-sm text-gray-500 mt-6">
          No spam. Just early access + updates.
        </p>
      </div>
    </main>
  );
}
