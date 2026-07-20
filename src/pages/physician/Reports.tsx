import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

interface ReportData {
  totalPatients: number;
  assignedPatients: number;
  avgAdherence: number;
  criticalPatients: number;
  moderatePatients: number;
  goodPatients: number;
  totalDosesLogged: number;
  totalMissedDoses: number;
  totalJournalEntries: number;
  atRiskPatients: any[];
}

const Reports = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadReportData();
  }, [user]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Get all patients assigned to this provider
      const usersSnap = await getDocs(collection(db, "users"));
      const allPatients = usersSnap.docs.filter(
        (doc) => doc.data().role === "patient"
      );
      const assignedPatients = allPatients.filter(
        (doc) => doc.data().assignedProviderId === user?.id
      );

      // Get adherence scores for assigned patients
      let totalScore = 0;
      let critical = 0;
      let moderate = 0;
      let good = 0;
      const atRisk: any[] = [];

      for (const patient of assignedPatients) {
        const adherenceSnap = await getDocs(
          query(
            collection(db, "adherence_scores"),
            where("patientId", "==", patient.id)
          )
        );
        const scores = adherenceSnap.docs.map((d) => d.data());
        scores.sort(
          (a, b) =>
            new Date(b.calculatedAt).getTime() -
            new Date(a.calculatedAt).getTime()
        );
        const score = scores[0]?.adherenceScore || 0;
        totalScore += score;

        if (score < 40) {
          critical++;
          atRisk.push({ name: patient.data().name, score, severity: "critical" });
        } else if (score < 70) {
          moderate++;
          atRisk.push({ name: patient.data().name, score, severity: "moderate" });
        } else {
          good++;
        }
      }

      // Get dose logs
      const doseSnap = await getDocs(collection(db, "dose_logs"));
      const allDoses = doseSnap.docs.map((d) => d.data());
      const assignedIds = assignedPatients.map((p) => p.id);
      const myDoses = allDoses.filter((d) => assignedIds.includes(d.patientId));
      const takenDoses = myDoses.filter((d) => d.status === "taken").length;
      const missedDoses = myDoses.filter((d) => d.status === "missed").length;

      // Get journal entries
      const journalSnap = await getDocs(collection(db, "journal_entries"));
      const myJournals = journalSnap.docs.filter((d) =>
        assignedIds.includes(d.data().patientId)
      );

      setReportData({
        totalPatients: allPatients.length,
        assignedPatients: assignedPatients.length,
        avgAdherence:
          assignedPatients.length > 0
            ? Math.round(totalScore / assignedPatients.length)
            : 0,
        criticalPatients: critical,
        moderatePatients: moderate,
        goodPatients: good,
        totalDosesLogged: takenDoses,
        totalMissedDoses: missedDoses,
        totalJournalEntries: myJournals.length,
        atRiskPatients: atRisk,
      });
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (reportType: string) => {
    if (!reportData) return;
    setGeneratingPdf(reportType);

    // Generate a simple text report
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let content = "";

    if (reportType === "adherence") {
      content = `
MEDISURE - MONTHLY ADHERENCE REPORT
Generated: ${date}
Provider: ${user?.name}
${"=".repeat(50)}

SUMMARY
-------
Total Assigned Patients: ${reportData.assignedPatients}
Average Adherence Score: ${reportData.avgAdherence}%
Doses Logged: ${reportData.totalDosesLogged}
Missed Doses: ${reportData.totalMissedDoses}

PATIENT RISK BREAKDOWN
----------------------
Critical (< 40%): ${reportData.criticalPatients} patients
Moderate (40-69%): ${reportData.moderatePatients} patients
Good (70%+): ${reportData.goodPatients} patients

AT-RISK PATIENTS
----------------
${reportData.atRiskPatients.map((p) => `${p.name} - ${p.score}% (${p.severity})`).join("\n") || "None"}

${"=".repeat(50)}
MediSure Medical Adherence Support System
      `.trim();
    } else if (reportType === "atrisk") {
      content = `
MEDISURE - AT-RISK PATIENT SUMMARY
Generated: ${date}
Provider: ${user?.name}
${"=".repeat(50)}

AT-RISK PATIENTS REQUIRING ATTENTION
-------------------------------------
${
  reportData.atRiskPatients.length > 0
    ? reportData.atRiskPatients
        .map(
          (p) =>
            `Patient: ${p.name}\nAdherence: ${p.score}%\nStatus: ${p.severity.toUpperCase()}\n`
        )
        .join("\n")
    : "No at-risk patients currently."
}

${"=".repeat(50)}
MediSure Medical Adherence Support System
      `.trim();
    } else if (reportType === "sideeffects") {
      content = `
MEDISURE - SIDE EFFECTS LOG
Generated: ${date}
Provider: ${user?.name}
${"=".repeat(50)}

Total Journal Entries: ${reportData.totalJournalEntries}

Note: View individual patient profiles for detailed
side effect notes recorded in their journal entries.

${"=".repeat(50)}
MediSure Medical Adherence Support System
      `.trim();
    }

    // Create and download the file
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MediSure_${reportType}_${date.replace(/ /g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setTimeout(() => setGeneratingPdf(null), 1000);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-400">Loading report data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">
          Adherence and clinical reports for your patients
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-blue-600">
            {reportData?.assignedPatients}
          </p>
          <p className="text-xs text-gray-400 mt-1">Assigned Patients</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-blue-600">
            {reportData?.avgAdherence}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Avg Adherence</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-red-500">
            {reportData?.criticalPatients}
          </p>
          <p className="text-xs text-gray-400 mt-1">Critical Patients</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-green-500">
            {reportData?.totalDosesLogged}
          </p>
          <p className="text-xs text-gray-400 mt-1">Doses Logged</p>
        </div>
      </div>

      {/* Patient Risk Breakdown */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="font-bold text-gray-900 mb-4">Patient Risk Breakdown</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-700">Critical (below 40%)</span>
            </div>
            <span className="text-sm font-bold text-red-500">
              {reportData?.criticalPatients} patients
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm text-gray-700">Moderate (40–69%)</span>
            </div>
            <span className="text-sm font-bold text-yellow-600">
              {reportData?.moderatePatients} patients
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-sm text-gray-700">Good (70%+)</span>
            </div>
            <span className="text-sm font-bold text-green-600">
              {reportData?.goodPatients} patients
            </span>
          </div>
        </div>

        {/* Progress bars */}
        {reportData && reportData.assignedPatients > 0 && (
          <div className="mt-4 h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-red-400 h-full"
              style={{
                width: `${(reportData.criticalPatients / reportData.assignedPatients) * 100}%`,
              }}
            />
            <div
              className="bg-yellow-400 h-full"
              style={{
                width: `${(reportData.moderatePatients / reportData.assignedPatients) * 100}%`,
              }}
            />
            <div
              className="bg-green-400 h-full"
              style={{
                width: `${(reportData.goodPatients / reportData.assignedPatients) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Downloadable Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <span className="text-3xl">📊</span>
          <h3 className="font-bold text-gray-900 mt-3 mb-1">
            Monthly Adherence Report
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })} ·{" "}
            {reportData?.assignedPatients} patients
          </p>
          <button
            onClick={() => handleDownload("adherence")}
            disabled={generatingPdf === "adherence"}
            className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-xl hover:bg-blue-50 font-medium transition-colors disabled:opacity-50"
          >
            {generatingPdf === "adherence" ? "Generating..." : "Download Report"}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <span className="text-3xl">⚠️</span>
          <h3 className="font-bold text-gray-900 mt-3 mb-1">
            At-Risk Patient Summary
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Updated now · {reportData?.atRiskPatients.length} flagged
          </p>
          <button
            onClick={() => handleDownload("atrisk")}
            disabled={generatingPdf === "atrisk"}
            className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-xl hover:bg-blue-50 font-medium transition-colors disabled:opacity-50"
          >
            {generatingPdf === "atrisk" ? "Generating..." : "Download Report"}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <span className="text-3xl">💊</span>
          <h3 className="font-bold text-gray-900 mt-3 mb-1">
            Dose Logging Summary
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {reportData?.totalDosesLogged} doses logged ·{" "}
            {reportData?.totalMissedDoses} missed
          </p>
          <span className="text-sm text-gray-400 bg-gray-100 px-4 py-1.5 rounded-xl">
            In progress
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <span className="text-3xl">📋</span>
          <h3 className="font-bold text-gray-900 mt-3 mb-1">Side Effects Log</h3>
          <p className="text-sm text-gray-400 mb-4">
            {reportData?.totalJournalEntries} journal entries recorded
          </p>
          <button
            onClick={() => handleDownload("sideeffects")}
            disabled={generatingPdf === "sideeffects"}
            className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-xl hover:bg-blue-50 font-medium transition-colors disabled:opacity-50"
          >
            {generatingPdf === "sideeffects" ? "Generating..." : "Download Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
