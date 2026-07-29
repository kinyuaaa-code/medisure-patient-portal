import React, { useState } from "react";

interface Props {
  medicationName: string;
  onSubmit: (rating: number, sideEffect: string) => void;
  onSkip: () => void;
}

const DoseRatingModal = ({ medicationName, onSubmit, onSkip }: Props) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [sideEffect, setSideEffect] = useState("");

  const labels: { [key: number]: string } = {
    1: "Not effective",
    2: "Slightly effective",
    3: "Moderately effective",
    4: "Very effective",
    5: "Extremely effective",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end justify-center z-50 px-4 pb-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="text-center mb-5">
          <span className="text-3xl">💊</span>
          <h2 className="text-lg font-bold text-gray-900 mt-2">
            Dose Logged!
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            How effective was your{" "}
            <span className="font-semibold text-gray-700">{medicationName}</span>{" "}
            today?
          </p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-3 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="text-4xl transition-transform duration-100 hover:scale-110"
            >
              <span
                className={
                  star <= (hovered || rating)
                    ? "text-yellow-400"
                    : "text-gray-200"
                }
              >
                ★
              </span>
            </button>
          ))}
        </div>

        {/* Rating Label */}
        <p className="text-center text-sm font-medium text-blue-600 mb-4 h-5">
          {hovered
            ? labels[hovered]
            : rating
            ? labels[rating]
            : "Tap a star to rate"}
        </p>

        {/* Side effects */}
        <textarea
          value={sideEffect}
          onChange={(e) => setSideEffect(e.target.value)}
          placeholder="Any side effects? (optional)"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-4"
        />

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            onClick={() => onSubmit(rating, sideEffect)}
            disabled={rating === 0}
            className="flex-1 py-3 text-sm bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoseRatingModal;