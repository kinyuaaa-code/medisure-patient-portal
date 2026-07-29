import React, { useState, useEffect } from "react";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
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

interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  moodEmoji: string;
  notes: string;
  createdAt: string;
}

const moods = [
  { label: "Great", emoji: "😊", score: 4, color: "#22c55e" },
  { label: "Good", emoji: "🙂", score: 3, color: "#3b82f6" },
  { label: "Okay", emoji: "😐", score: 2, color: "#f59e0b" },
  { label: "Low", emoji: "😞", score: 1, color: "#ef4444" },
];

const getMoodEmoji = (mood: string) =>
  moods.find((m) => m.label === mood)?.emoji || "🙂";

const getMoodScore = (mood: string) =>
  moods.find((m) => m.label === mood)?.score || 0;

const getMoodColor = (mood: string) =>
  moods.find((m) => m.label === mood)?.color || "#9ca3af";

const moodBadgeColor = (mood: string) => {
  switch (mood) {
    case "Great": return "bg-green-100 text-green-600";
    case "Good": return "bg-blue-100 text-blue-600";
    case "Okay": return "bg-yellow-100 text-yellow-600";
    case "Low": return "bg-red-100 text-red-500";
    default: return "bg-gray-100 text-gray-500";
  }
};

const Journal = () => {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moodTrend, setMoodTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadEntries();
  }, [user]);

  const loadEntries = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "journal_entries"),
        where("patientId", "==", user.id)
      );
      const snapshot = await getDocs(q);
      const loaded: JournalEntry[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          date: new Date(doc.data().createdAt).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          mood: doc.data().mood,
          moodEmoji: getMoodEmoji(doc.data().mood),
          notes: doc.data().notes || "",
          createdAt: doc.data().createdAt,
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setEntries(loaded);

      // Build 7-day mood trend
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toISOString().split("T")[0],
          day: d.toLocaleDateString("en-GB", { weekday: "short" }),
        };
      });

      const trend = last7Days.map(({ date, day }) => {
        const dayEntries = snapshot.docs.filter((d) =>
          d.data().createdAt?.startsWith(date)
        );
        if (dayEntries.length === 0) return { day, score: 0, mood: "None" };
        const latestEntry = dayEntries[dayEntries.length - 1].data();
        return {
          day,
          score: getMoodScore(latestEntry.mood),
          mood: latestEntry.mood,
          color: getMoodColor(latestEntry.mood),
        };
      });

      setMoodTrend(trend);
    } catch (err) {
      console.error("Error loading journal entries:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMood || !user) return;
    try {
      const newEntryData = {
        patientId: user.id,
        mood: selectedMood,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(
        collection(db, "journal_entries"),
        newEntryData
      );

      const newEntry: JournalEntry = {
        id: docRef.id,
        date: new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        mood: selectedMood,
        moodEmoji: getMoodEmoji(selectedMood),
        notes: notes || "",
        createdAt: new Date().toISOString(),
      };

      setEntries((prev) => [newEntry, ...prev]);
      setSaved(true);
      setSelectedMood(null);
      setNotes("");
      setTimeout(() => setSaved(false), 3000);

      // Refresh trend after saving
      loadEntries();
    } catch (err) {
      console.error("Error saving journal entry:", err);
    }
  };

  return (
    <div className="pb-24 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">My Journal</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Track your mood and side effects
        </p>
      </div>

      {/* Mood Trend Chart */}
      {moodTrend.some((d) => d.score > 0) && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                7-Day Mood Trend
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                How you've been feeling this week
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {entries.length > 0 ? entries[0].moodEmoji : ""}
              </p>
              <p className="text-xs text-gray-400">latest</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={moodTrend} barSize={28}>
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
                domain={[0, 4]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  const labels: any = { 0: "", 1: "Low", 2: "Okay", 3: "Good", 4: "Great" };
                  return labels[v] || "";
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
                formatter={(value: any, name: any, props: any) => [
                  props.payload.mood || "No entry",
                  "Mood",
                ]}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {moodTrend.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color || "#e5e7eb"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Mood Legend */}
          <div className="flex items-center gap-3 mt-3 justify-center flex-wrap">
            {moods.map((m) => (
              <div key={m.label} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm block"
                  style={{ backgroundColor: m.color }}
                />
                <span className="text-xs text-gray-400">
                  {m.emoji} {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Entry Form */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">
          New Entry
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any side effects or notes? (optional)"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />

        <button
          onClick={handleSave}
          disabled={!selectedMood}
          className={`w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
            selectedMood
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saved ? "✓ Entry Saved!" : "Save Journal Entry"}
        </button>
      </div>

      {/* Past Entries */}
      <div className="mx-4 mt-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Past Entries
        </p>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
            Loading entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
            No journal entries yet. How are you feeling today?
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {entry.date}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${moodBadgeColor(entry.mood)}`}
                  >
                    {entry.moodEmoji} {entry.mood}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Journal;