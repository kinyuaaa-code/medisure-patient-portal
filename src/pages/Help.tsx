import React from "react";

const faqs = [
  { q: "How do I log a dose?", a: 'Tap the "Log Dose" button on any medication card on your Home screen.' },
  { q: "What if I missed a dose?", a: "You can still log a missed dose within 6 hours. Your physician will be notified of missed doses." },
  { q: "How is my adherence calculated?", a: "Your adherence score is the percentage of doses logged as taken out of all doses scheduled in the last 30 days." },
  { q: "Who can see my data?", a: "Only your assigned healthcare provider can view your adherence data and journal entries." },
  { q: "How do I update my medication schedule?", a: "Go to the Schedule tab and tap any medication to edit its details or timing." },
];

const Help = () => {
  return (
    <div className="pb-24 bg-gray-100 min-h-screen">
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Help & FAQs</h1>
        <p className="text-sm text-gray-400 mt-0.5">Common questions about MediSure</p>
      </div>

      <div className="mx-4 mt-4 space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 text-sm">{faq.q}</h3>
            <p className="text-sm text-blue-500 mt-1 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Help;
