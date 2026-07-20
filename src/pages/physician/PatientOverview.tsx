import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { db } from "../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import PatientDetail from "./PatientDetail";
import { useAuth } from "../../context/AuthContext";

interface Patient {
  id: string;
  name: string;
  email: string;
  adherenceScore: number;
  lastDoseAt: string | null;
  conditions: string;
  severity: string;
  isAssigned: boolean;
}

const severityStyle = (severity: string) => {
  switch (severity) {
    case "critical": return { card: "bg-red-50 border border-red-200", dot: "bg-red-500", badge: "bg-red-100 text-red-600" };
    case "moderate": return { card: "bg-yellow-50 border border-yellow-200", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700" };
    default: return { card: "bg-white border border-gray-100", dot: "bg-green-400", badge: "bg-green-100 text-green-600" };
  }
};

const getSeverity = (score: number) => {
  if (score < 40) return "critical";
  if (score < 70) return "moderate";
  return "good";
};

const getLastDoseLabel = (lastDose: string | null) => {
  if (!lastDose) return "Never";
  const diff = Date.now() - new Date(lastDose).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const PatientOverview = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [viewingPatient, setViewingPatient] = useState<string | null>(null);
  const [adherenceData, setAdherenceData] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      console.log("Loading patients from Firebase...");

      const usersSnap = await getDocs(collection(db, "users"));

      // Show only assigned patients OR unassigned patients
      const patientUsers = usersSnap.docs.filter((doc) => {
        const data = doc.data();
        return (
          data.role === "patient" &&
          (data.assignedProviderId === user?.id || !data.assignedProviderId)
        );
      });

      console.log("Found users:", usersSnap.docs.length, "patients:", patientUsers.length);

      const patientList: Patient[] = await Promise.all(
        patientUsers.map(async (doc) => {
          const userData = doc.data();

          const adherenceSnap = await getDocs(
            query(collection(db, "adherence_scores"), where("patientId", "==", doc.id))
          );
          const scores = adherenceSnap.docs.map((d) => d.data());
          scores.sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
          const latestScore = scores[0]?.adherenceScore || 0;

          const doseSnap = await getDocs(
            query(collection(db, "dose_logs"), where("patientId", "==", doc.id))
          );
          const doses = doseSnap.docs.map((d) => d.data());
          doses.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
          const lastDose = doses[0]?.loggedAt || null;

          return {
            id: doc.id,
            name: userData.name || "Unknown",
            email: userData.email || "",
            adherenceScore: latestScore,
            lastDoseAt: lastDose,
            conditions: userData.conditions?.join(", ") || "Not specified",
            severity: getSeverity(latestScore),
            isAssigned: userData.assignedProviderId === user?.id,
          };
        })
      );

      patientList.sort((a, b) => a.adherenceScore - b.adherenceScore);
      setPatients(patientList);
      console.log("Final patient list:", patientList.length, "patients loaded");

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      const allDoseSnap = await getDocs(collection(db, "dose_logs"));
      const allDoses = allDoseSnap.docs.map((d) => d.data());

      const trend = last7Days.map((day) => {
        const dayDoses = allDoses.filter((d) => d.loggedAt?.startsWith(day));
        const taken = dayDoses.filter((d) => d.status === "taken").length;
        const total = dayDoses.length;
        return {
          day: day.slice(5),
          value: total > 0 ? Math.round((taken / total) * 100) : 0,
        };
      });

      setAdherenceData(trend);
    } catch (err) {
      console.error("Error loading patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const critical = patients.filter((p) => p.severity === "critical");
  const moderate = patients.filter((p) => p.severity === "moderate");
  const avgAdherence = patients.length > 0
    ? Math.round(patients.reduce((sum, p) => sum + p.adherenceScore, 0) / patients.length)
    : 0;

  if (viewingPatient) {
    return (
      <PatientDetail
        patientId={viewingPatient}
        onBack={() => {
          setViewingPatient(null);
          loadPatients(); // Refresh list after returning
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-400">Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Overview</h1>
        <p className="text-sm text-gray-400 mt-1">
          {patients.filter((p) => p.isAssigned).length} assigned ·{" "}
          {patients.filter((p) => !p.isAssigned).length} unassigned ·{" "}
          {critical.length} critical, {moderate.length} moderate
        </p>
      </div>

      {/* Risk Alerts */}
      {[...critical, ...moderate].length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Risk Alerts
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...critical, ...moderate].map((patient) => {
              const style = severityStyle(patient.severity);
              return (
                <button
                  key={patient.id}
                  onClick={() =>
                    setSelectedPatient(
                      selectedPatient === patient.id ? null : patient.id
                    )
                  }
                  className={`${style.card} rounded-2xl p-4 text-left transition-all duration-150 hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                      <span className="font-semibold text-gray-900">{patient.name}</span>
                      {patient.isAssigned && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          Your patient
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${style.badge}`}>
                      {patient.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 ml-4">
                    {patient.adherenceScore}% adherence · Last dose{" "}
                    {getLastDoseLabel(patient.lastDoseAt)} · {patient.conditions}
                  </p>
                  {selectedPatient === patient.id && (
                    <div className="mt-3 ml-4 pt-3 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPatient(patient.id);
                        }}
                        className="flex-1 text-xs bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                      >
                        View Profile
                      </button>
                      <button className="flex-1 text-xs border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50">
                        Acknowledge
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-Day Adherence Trend */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">7-Day Cohort Adherence Trend</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Aggregate adherence across your patient cohort
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{avgAdherence}%</p>
            <p className="text-xs text-gray-400">avg adherence</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={adherenceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#d1d5db" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#d1d5db" />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
            <ReferenceLine y={80} stroke="#93c5fd" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* All Patients Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">All Patients</h2>
          <span className="text-xs text-gray-400">Click a patient to view full profile</span>
        </div>
        {patients.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            No patients registered yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {patients.map((patient) => {
              const style = severityStyle(patient.severity);
              return (
                <div
                  key={patient.id}
                  onClick={() => setViewingPatient(patient.id)}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">
                        {patient.name.split(" ").map((n: string) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {patient.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {patient.isAssigned ? "✓ Your patient" : "Unassigned"} · {patient.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">
                        {patient.adherenceScore}%
                      </p>
                      <p className="text-xs text-gray-400">adherence</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${style.badge}`}
                    >
                      {patient.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientOverview;