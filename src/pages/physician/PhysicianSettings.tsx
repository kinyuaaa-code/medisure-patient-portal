import React, { useState } from "react";

const PhysicianSettings = () => {
  const [threshold, setThreshold] = useState(70);
  const [notification, setNotification] = useState("Email + SMS");
  const [frequency, setFrequency] = useState("Weekly");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">System and account settings</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        {/* Alert Threshold */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-800">Alert Threshold</p>
              <p className="text-sm text-gray-400">Trigger alerts when adherence falls below</p>
            </div>
            <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl">{threshold}%</span>
          </div>
          <input
            type="range"
            min={50} max={90} value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50%</span><span>90%</span>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Notification Preferences</p>
            <p className="text-sm text-gray-400">Receive alerts via</p>
          </div>
          <select
            value={notification}
            onChange={(e) => setNotification(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option>Email + SMS</option>
            <option>Email only</option>
            <option>SMS only</option>
            <option>Push only</option>
          </select>
        </div>

        {/* Report Frequency */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Report Frequency</p>
            <p className="text-sm text-gray-400">Automated summary reports</p>
          </div>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </div>

        {/* Data Retention */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Data Retention</p>
            <p className="text-sm text-gray-400">Patient data retained for</p>
          </div>
          <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl">7 years</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-2xl transition-colors"
      >
        {saved ? "✓ Settings Saved!" : "Save Settings"}
      </button>
    </div>
  );
};

export default PhysicianSettings;