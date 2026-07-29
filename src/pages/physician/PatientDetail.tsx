import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import ProviderNotes from "../../components/ui/ProviderNotes";
import MedicationRatings from "../../components/ui/MedicationRatings";

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

const PatientDetail = ({ patientId, onBack }: PatientDetailProps) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [doseLogs, setDoseLogs] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [adherenceScore, setAdherenceScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(false);
  const [treatmentPlanEdit, setTreatmentPlanEdit] = useState("");
  const [savingTreatment, setSavingTreatment] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  useEffect(() => {
    if (patient?.assignedProviderId === user?.id) {
      setAssigned(true);
    } else {
      setAssigned(false);
    }
  }, [patient, user]);

  const loadPatientData = async () => {
    try {
      setLoading(true);

      const userDoc = await getDoc(doc(db, "users", patientId));
      if (userDoc.exists()) setPatient(userDoc.data());

      const medSnap = await getDocs(
        query(
          collection(db, "medication_schedules"),
          where("patientId", "==", patientId),
          where("active", "==", true)
        )
      );
      setMedications(medSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const doseSnap = await getDocs(
        query(collection(db, "dose_logs"), where("patientId", "==", patientId))
      );
      const doses = doseSnap.docs.map((d) => d.data());
      doses.sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      );
      setDoseLogs(doses.slice(0, 10));

      const adherenceSnap = await getDocs(
        query(
          collection(db, "adherence_scores"),
          where("patientId", "==", patientId)
        )
      );
      const scores = adherenceSnap.docs.map((d) => d.data());
      scores.sort(
        (a, b) =>
          new Date(b.calculatedAt).getTime() -
          new Date(a.calculatedAt).getTime()
      );
      setAdherenceScore(scores[0]?.adherenceScore || 0);

      const journalSnap = await getDocs(
        query(
          collection(db, "journal_entries"),
          where("patientId", "==", patientId)
        )
      );
      const entries = journalSnap.docs.map((d) => d.data());
      entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setJournals(entries.slice(0, 5));
    } catch (err) {
      console.error("Error loading patient data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!user) return;
    try {
      setAssigning(true);
      await updateDoc(doc(db, "users", patientId), {
        assignedProviderId: user.id,
        assignedProviderName: user.name,
        assignedAt: new Date().toISOString(),
      });
      setAssigned(true);
      setPatient((prev: any) => ({
        ...prev,
        assignedProviderId: user.id,
        assignedProviderName: user.name,
      }));
    } catch (err) {
      console.error("Error assigning patient:", err);
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveTreatmentPlan = async () => {
    try {
      setSavingTreatment(true);
      await updateDoc(doc(db, "users", patientId), {
        treatmentPlan: treatmentPlanEdit,
        updatedAt: new Date().toISOString(),
      });
      setPatient((prev: any) => ({
        ...prev,
        treatmentPlan: treatmentPlanEdit,
      }));
      setEditingTreatment(false);
    } catch (err) {
      console.error("Error saving treatment plan:", err);
    } finally {
      setSavingTreatment(false);
    }
  };

  const severityColor = (score: number) => {
    if (score < 40) return "text-red-500 bg-red-50";
    if (score < 70) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const severityLabel = (score: number) => {
    if (score < 40) return "Critical";
    if (score < 70) return "Moderate";
    return "Good";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-400">Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl overflow-y-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Patients
      </button>

      {/* Patient Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 text-lg font-bold">
              {patient?.name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") || "?"}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{patient?.name}</h1>
            <p className="text-sm text-gray-400">{patient?.email}</p>
            {patient?.phoneNumber && (
              <p className="text-sm text-gray-400">{patient?.phoneNumber}</p>
            )}
          </div>
          <div
            className={`px-4 py-2 rounded-xl text-sm font-bold ${severityColor(adherenceScore)}`}
          >
            {adherenceScore}% — {severityLabel(adherenceScore)}
          </div>
        </div>

        {/* Assignment Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {assigned ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Assigned Provider</p>
                <p className="text-sm font-semibold text-gray-800">
                  {patient?.assignedProviderName || user?.name}
                </p>
                <p className="text-xs text-green-500 mt-0.5">✓ You are assigned to this patient</p>
              </div>
              <button
                onClick={handleAssign}
                className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50"
              >
                Reassign to Me
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Assigned Provider</p>
                <p className="text-sm text-gray-500">
                  {patient?.assignedProviderName || "Unassigned"}
                </p>
              </div>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {assigning ? "Assigning..." : "Assign to Me"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Health Information */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Health Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">Blood Type</p>
              <p className="text-sm font-semibold text-gray-800">
                {patient?.bloodType || "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Date of Birth</p>
              <p className="text-sm font-semibold text-gray-800">
                {patient?.dateOfBirth || "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Allergies</p>
              <p className="text-sm font-semibold text-gray-800">
                {patient?.allergies || "None recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Emergency Contact</p>
              <p className="text-sm font-semibold text-gray-800">
                {patient?.emergencyContact || "Not recorded"}
              </p>
            </div>
          </div>
        </div>

        {/* Diagnosed Conditions & Treatment Plan */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Diagnosed Conditions</h2>
          {patient?.conditions?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.conditions.map((c: string, i: number) => (
                <span
                  key={i}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300">No conditions recorded</p>
          )}

          {/* Treatment Plan - Editable by Provider */}
          <h2 className="font-bold text-gray-900 mt-5 mb-3">Treatment Plan</h2>
          {editingTreatment ? (
            <div>
              <textarea
                value={treatmentPlanEdit}
                onChange={(e) => setTreatmentPlanEdit(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditingTreatment(false)}
                  className="flex-1 text-sm text-gray-500 border border-gray-200 py-2 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTreatmentPlan}
                  disabled={savingTreatment}
                  className="flex-1 text-sm bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50"
                >
                  {savingTreatment ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-700 leading-relaxed flex-1">
                {patient?.treatmentPlan || "No treatment plan recorded"}
              </p>
              <button
                onClick={() => {
                  setTreatmentPlanEdit(patient?.treatmentPlan || "");
                  setEditingTreatment(true);
                }}
                className="text-xs text-blue-600 border border-blue-200 px-3 py-1 rounded-xl hover:bg-blue-50 flex-shrink-0"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Medications */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="font-bold text-gray-900 mb-4">
          Active Medications ({medications.length})
        </h2>
        {medications.length === 0 ? (
          <p className="text-sm text-gray-300">No active medications</p>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {med.drugName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {med.category} · {med.frequency}
                  </p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                  {med.dosage}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Medication Effectiveness Ratings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="font-bold text-gray-900 mb-4">
          Medication Effectiveness Ratings
        </h2>
      <MedicationRatings patientId={patientId} />
    </div>
      {/* Medication Ratings */}
      <MedicationRatings patientId={patientId} />

      {/* Recent Dose Logs */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="font-bold text-gray-900 mb-4">Recent Dose Logs</h2>
        {doseLogs.length === 0 ? (
          <p className="text-sm text-gray-300">No dose logs yet</p>
        ) : (
          <div className="space-y-2">
            {doseLogs.map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <p className="text-sm text-gray-700">
                  {new Date(log.loggedAt).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                    log.status === "taken"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-500"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Journal Entries */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="font-bold text-gray-900 mb-4">Recent Journal Entries</h2>
        {journals.length === 0 ? (
          <p className="text-sm text-gray-300">No journal entries yet</p>
        ) : (
          <div className="space-y-3">
            {journals.map((entry, i) => (
              <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {entry.mood}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-sm text-gray-600">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Provider Notes */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">Provider Notes</h2>
        <ProviderNotes
          patientId={patientId}
          providerId={user?.id || ""}
          providerName={user?.name || ""}
        />
      </div>
    </div>
  );
};

export default PatientDetail;