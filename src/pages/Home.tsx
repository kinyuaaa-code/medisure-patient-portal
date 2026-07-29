import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import DoseRatingModal from "../components/ui/DoseRatingModal";

interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  category: string;
  times: string[];
  logged: boolean;
  scheduleId: string;
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const Home = () => {
  const { user } = useAuth();
  const today = formatDate(new Date());

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [sideEffects, setSideEffects] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [adherenceHistory, setAdherenceHistory] = useState<any[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingMed, setPendingMed] = useState<Medication | null>(null);

  const moods = [
    { label: "Great", emoji: "😊" },
    { label: "Good", emoji: "🙂" },
    { label: "Okay", emoji: "😐" },
    { label: "Low", emoji: "😞" },
  ];

  const firstName = user?.name?.split(" ")[0] || "there";
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "P";

  const loggedCount = medications.filter((m) => m.logged).length;
  const totalCount = medications.length;
  const progressPercent =
    totalCount > 0 ? Math.round((loggedCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (!user) return;
    loadMedications();
    loadAdherenceHistory();
  }, [user]);

  const loadMedications = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const q = query(
        collection(db, "medication_schedules"),
        where("patientId", "==", user.id),
        where("active", "==", true)
      );
      const snapshot = await getDocs(q);

      const doseQuery = query(
        collection(db, "dose_logs"),
        where("patientId", "==", user.id)
      );
      const doseSnapshot = await getDocs(doseQuery);

      const todayStr = new Date().toISOString().split("T")[0];
      const loggedScheduleIds = doseSnapshot.docs
        .filter((d) => d.data().loggedAt?.startsWith(todayStr))
        .map((d) => d.data().scheduleId);

      const meds: Medication[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        scheduleId: docSnap.id,
        drugName: docSnap.data().drugName,
        dosage: docSnap.data().dosage,
        category: docSnap.data().category || "General",
        times: docSnap.data().times || [],
        logged: loggedScheduleIds.includes(docSnap.id),
      }));

      setMedications(meds);
    } catch (err) {
      console.error("Error loading medications:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdherenceHistory = async () => {
    if (!user) return;
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toISOString().split("T")[0],
          day: d.toLocaleDateString("en-GB", { weekday: "short" }),
        };
      });

      const doseSnap = await getDocs(
        query(collection(db, "dose_logs"), where("patientId", "==", user.id))
      );
      const allDoses = doseSnap.docs.map((d) => d.data());

      const history = last7Days.map(({ date, day }) => {
        const dayDoses = allDoses.filter((d) => d.loggedAt?.startsWith(date));
        const taken = dayDoses.filter((d) => d.status === "taken").length;
        const total = dayDoses.length;
        return {
          day,
          score: total > 0 ? Math.round((taken / total) * 100) : 0,
          taken,
          total,
        };
      });

      setAdherenceHistory(history);
    } catch (err) {
      console.error("Error loading adherence history:", err);
    }
  };

  const handleLogDose = async (med: Medication) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "dose_logs"), {
        patientId: user.id,
        scheduleId: med.scheduleId,
        status: "taken",
        loggedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      setMedications((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, logged: true } : m))
      );

      loadAdherenceHistory();

      // Show rating modal
      setPendingMed(med);
      setShowRatingModal(true);
    } catch (err) {
      console.error("Error logging dose:", err);
    }
  };

  const handleRatingSubmit = async (rating: number, sideEffect: string) => {
    if (!user || !pendingMed) return;
    try {
      await addDoc(collection(db, "medication_ratings"), {
        patientId: user.id,
        scheduleId: pendingMed.scheduleId,
        drugName: pendingMed.drugName,
        rating,
        sideEffect: sideEffect || null,
        ratedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error saving rating:", err);
    } finally {
      setShowRatingModal(false);
      setPendingMed(null);
    }
  };

  const handleRatingSkip = () => {
    setShowRatingModal(false);
    setPendingMed(null);
  };

  const handleSaveJournal = async () => {
    if (!selectedMood || !user) return;
    try {
      await addDoc(collection(db, "journal_entries"), {
        patientId: user.id,
        mood: selectedMood,
        notes: sideEffects || null,
        createdAt: new Date().toISOString(),
      });
      setJournalSaved(true);
      setSelectedMood(null);
      setSideEffects("");
      setTimeout(() => setJournalSaved(false), 3000);
    } catch (err) {
      console.error("Error saving journal:", err);
    }
  };

  return (
    <div className="pb-24 bg-gray-100 min-h-screen">
      {/* Header Card */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">{today}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
              Hello, {firstName} 👋
            </h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 font-semibold text-sm">
              {initials}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-500 font-medium">
              Today's Progress
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600 font-medium">
                {loggedCount}/{totalCount} doses
              </span>
              <span className="text-xl font-bold text-blue-600">
                {progressPercent}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Today's Medications */}
      <div className="mx-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">
            Today's Medications
          </h2>
          <span className="text-sm text-blue-500 font-medium">
            {totalCount} scheduled
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
            Loading medications...
          </div>
        ) : medications.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm">No medications scheduled.</p>
            <p className="text-blue-500 text-sm mt-1">
              Go to Schedule to add medications.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      med.logged ? "bg-green-100" : "bg-blue-50"
                    }`}
                  >
                    {med.logged ? (
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {med.drugName}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        {med.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {med.category} · {med.times?.join(", ")}
                    </p>
                  </div>
                </div>
                {med.logged ? (
                  <span className="text-sm font-semibold text-green-500 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
                    Logged ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleLogDose(med)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors duration-150"
                  >
                    Log Dose
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7-Day Adherence Chart */}
      {adherenceHistory.length > 0 && (
        <div className="mx-4 mt-5 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">
                7-Day Adherence
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Your dose completion this week
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {Math.round(
                  adherenceHistory.reduce((sum, d) => sum + d.score, 0) /
                    adherenceHistory.length
                )}%
              </p>
              <p className="text-xs text-gray-400">weekly avg</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={adherenceHistory} barSize={28}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [`${value}%`, "Adherence"]}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {adherenceHistory.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.score >= 80
                        ? "#22c55e"
                        : entry.score >= 50
                        ? "#3b82f6"
                        : entry.score === 0
                        ? "#e5e7eb"
                        : "#f59e0b"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500 block" />
              <span className="text-xs text-gray-400">Great (80%+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500 block" />
              <span className="text-xs text-gray-400">Good (50-79%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 block" />
              <span className="text-xs text-gray-400">Low (&lt;50%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Mood Journal */}
      <div className="mx-4 mt-5 bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-1">
          Mood Journal
        </h2>
        <p className="text-sm text-blue-500 mb-4">
          How are you feeling today?
        </p>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {moods.map((mood) => (
            <button
              key={mood.label}
              onClick={() => setSelectedMood(mood.label)}
              className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all duration-150 ${
                selectedMood === mood.label
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-100 bg-gray-50 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs text-gray-600 mt-1 font-medium">
                {mood.label}
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={sideEffects}
          onChange={(e) => setSideEffects(e.target.value)}
          placeholder="Any side effects or notes? (optional)"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />

        <button
          onClick={handleSaveJournal}
          disabled={!selectedMood}
          className={`w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
            selectedMood
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {journalSaved ? "✓ Journal Entry Saved!" : "Save Journal Entry"}
        </button>
      </div>

      {/* Dose Rating Modal */}
      {showRatingModal && pendingMed && (
        <DoseRatingModal
          medicationName={pendingMed.drugName}
          onSubmit={handleRatingSubmit}
          onSkip={handleRatingSkip}
        />
      )}
    </div>
  );
};

export default Home;