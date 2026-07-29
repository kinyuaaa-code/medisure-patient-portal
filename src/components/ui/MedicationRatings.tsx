import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Rating {
  id: string;
  drugName: string;
  rating: number;
  sideEffect: string;
  ratedAt: string;
}

interface Props {
  patientId: string;
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`text-lg ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
      >
        ★
      </span>
    ))}
  </div>
);

const ratingLabel = (rating: number) => {
  const labels: { [key: number]: string } = {
    1: "Not effective",
    2: "Slightly effective",
    3: "Moderately effective",
    4: "Very effective",
    5: "Extremely effective",
  };
  return labels[rating] || "";
};

const MedicationRatings = ({ patientId }: Props) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgByDrug, setAvgByDrug] = useState<any[]>([]);

  useEffect(() => {
    loadRatings();
  }, [patientId]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(
          collection(db, "medication_ratings"),
          where("patientId", "==", patientId)
        )
      );

      const loaded: Rating[] = snap.docs.map((d) => ({
        id: d.id,
        drugName: d.data().drugName,
        rating: d.data().rating,
        sideEffect: d.data().sideEffect || "",
        ratedAt: d.data().ratedAt,
      }));

      loaded.sort(
        (a, b) =>
          new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime()
      );
      setRatings(loaded);

      // Calculate average rating per drug
      const drugMap: { [key: string]: number[] } = {};
      loaded.forEach((r) => {
        if (!drugMap[r.drugName]) drugMap[r.drugName] = [];
        drugMap[r.drugName].push(r.rating);
      });

      const avgs = Object.entries(drugMap).map(([drug, scores]) => ({
        drug,
        avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        count: scores.length,
      }));

      setAvgByDrug(avgs);
    } catch (err) {
      console.error("Error loading ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading ratings...</p>;
  }

  if (ratings.length === 0) {
    return (
      <p className="text-sm text-gray-300">
        No effectiveness ratings recorded yet.
      </p>
    );
  }

  return (
    <div>
      {/* Average by drug */}
      {avgByDrug.length > 0 && (
        <div className="mb-4 space-y-3">
          {avgByDrug.map((item) => (
            <div
              key={item.drug}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.drug}</p>
                <p className="text-xs text-gray-400">{item.count} rating{item.count !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <StarDisplay rating={Math.round(item.avg)} />
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.avg}/5 — {ratingLabel(Math.round(item.avg))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent ratings */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
        Recent Ratings
      </p>
      <div className="space-y-2">
        {ratings.slice(0, 5).map((r) => (
          <div key={r.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{r.drugName}</p>
              {r.sideEffect && (
                <p className="text-xs text-gray-400 mt-0.5">{r.sideEffect}</p>
              )}
              <p className="text-xs text-gray-300 mt-0.5">
                {new Date(r.ratedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <StarDisplay rating={r.rating} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicationRatings;