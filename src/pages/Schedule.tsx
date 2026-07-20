import React, { useState, useEffect } from "react";
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  category: string;
  times: string[];
  frequency: string;
  startDate: string;
  active: boolean;
}

const Schedule = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    drugName: "",
    dosage: "",
    category: "",
    time: "",
    frequency: "Once daily",
  });

  useEffect(() => {
    if (!user) return;
    loadMedications();
  }, [user]);

  const loadMedications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "medication_schedules"),
        where("patientId", "==", user.id)
      );
      const snapshot = await getDocs(q);
      const meds: Medication[] = snapshot.docs.map((d) => ({
        id: d.id,
        drugName: d.data().drugName,
        dosage: d.data().dosage,
        category: d.data().category || "General",
        times: d.data().times || [],
        frequency: d.data().frequency,
        startDate: d.data().startDate,
        active: d.data().active,
      }));
      setMedications(meds);
    } catch (err) {
      console.error("Error loading medications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!newMed.drugName || !newMed.dosage || !newMed.time || !user) return;
    try {
      const docRef = await addDoc(collection(db, "medication_schedules"), {
        patientId: user.id,
        drugName: newMed.drugName,
        dosage: newMed.dosage,
        category: newMed.category || "General",
        times: [newMed.time],
        frequency: newMed.frequency,
        startDate: new Date().toISOString().split("T")[0],
        active: true,
        createdAt: new Date().toISOString(),
      });

      setMedications((prev) => [
        ...prev,
        {
          id: docRef.id,
          drugName: newMed.drugName,
          dosage: newMed.dosage,
          category: newMed.category || "General",
          times: [newMed.time],
          frequency: newMed.frequency,
          startDate: new Date().toISOString().split("T")[0],
          active: true,
        },
      ]);

      setNewMed({
        drugName: "",
        dosage: "",
        category: "",
        time: "",
        frequency: "Once daily",
      });
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding medication:", err);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await updateDoc(doc(db, "medication_schedules", id), {
        active: false,
        updatedAt: new Date().toISOString(),
      });
      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, active: false } : m))
      );
    } catch (err) {
      console.error("Error deactivating medication:", err);
    }
  };

  const activeMeds = medications.filter((m) => m.active);
  const inactiveMeds = medications.filter((m) => !m.active);

  const MedCard = ({ med }: { med: Medication }) => {
    const expanded = expandedId === med.id;
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          className="w-full px-4 py-4 flex items-center justify-between text-left"
          onClick={() => setExpandedId(expanded ? null : med.id)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                med.active ? "bg-blue-50" : "bg-gray-100"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  med.active ? "text-blue-400" : "text-gray-300"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {med.drugName}
                </span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                  {med.dosage}
                </span>
                {!med.active && (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {med.category} · {med.frequency}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Scheduled times</span>
                <span className="text-gray-700 font-medium">
                  {med.times.join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Frequency</span>
                <span className="text-gray-700 font-medium">
                  {med.frequency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Start date</span>
                <span className="text-gray-700 font-medium">
                  {med.startDate}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span
                  className={`font-medium ${
                    med.active ? "text-green-500" : "text-gray-400"
                  }`}
                >
                  {med.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            {med.active && (
              <button
                onClick={() => handleDeactivate(med.id)}
                className="mt-3 w-full py-2 text-sm text-red-400 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Deactivate Medication
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Schedule</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeMeds.length} active medications
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Add Medication Form */}
      {showAddForm && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
            New Medication
          </h2>
          <div className="space-y-3">
            <input
              placeholder="Medication name *"
              value={newMed.drugName}
              onChange={(e) =>
                setNewMed({ ...newMed, drugName: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              placeholder="Dosage (e.g. 10 mg) *"
              value={newMed.dosage}
              onChange={(e) =>
                setNewMed({ ...newMed, dosage: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              placeholder="Category (e.g. Blood pressure)"
              value={newMed.category}
              onChange={(e) =>
                setNewMed({ ...newMed, category: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              placeholder="Time (e.g. 08:00 AM) *"
              value={newMed.time}
              onChange={(e) => setNewMed({ ...newMed, time: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <select
              value={newMed.frequency}
              onChange={(e) =>
                setNewMed({ ...newMed, frequency: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option>Once daily</option>
              <option>Twice daily</option>
              <option>Three times daily</option>
              <option>Weekly</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMedication}
                className="flex-1 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="mx-4 mt-5 bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
          Loading medications...
        </div>
      ) : (
        <>
          {/* Active Medications */}
          <div className="mx-4 mt-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Active
            </p>
            {activeMeds.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
                No active medications. Tap + Add to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {activeMeds.map((med) => (
                  <MedCard key={med.id} med={med} />
                ))}
              </div>
            )}
          </div>

          {/* Inactive */}
          {inactiveMeds.length > 0 && (
            <div className="mx-4 mt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Inactive
              </p>
              <div className="space-y-3">
                {inactiveMeds.map((med) => (
                  <MedCard key={med.id} med={med} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Schedule;