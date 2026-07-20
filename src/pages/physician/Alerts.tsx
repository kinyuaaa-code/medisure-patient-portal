import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface Alert {
  id: string;
  patient: string;
  type: string;
  message: string;
  time: string;
  severity: string;
  acknowledged: boolean;
}

const Alerts = () => {
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "risk_alerts"));

      const alerts: Alert[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAt = new Date(data.createdAt);
        const diff = Date.now() - createdAt.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const timeLabel = hours < 1 ? "Just now" : hours < 24 ? `${hours} hours ago` : `${Math.floor(hours / 24)}d ago`;
        return {
          id: d.id,
          patient: data.patientName || "Unknown Patient",
          type: data.alertType || "Alert",
          message: data.message || "",
          time: timeLabel,
          severity: data.severity || "moderate",
          acknowledged: data.acknowledged || false,
        };
      });

      alerts.sort((a, b) => {
        const aTime = snapshot.docs.find((d) => d.id === a.id)?.data().createdAt || "";
        const bTime = snapshot.docs.find((d) => d.id === b.id)?.data().createdAt || "";
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setAlertList(alerts);
    } catch (err) {
      console.error("Error loading alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const acknowledge = async (id: string) => {
    try {
      await updateDoc(doc(db, "risk_alerts", id), {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      });
      setAlertList((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };

  const badgeStyle = (severity: string) => severity === "critical" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700";
  const cardStyle = (severity: string) => severity === "critical" ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200";

  const active = alertList.filter((a) => !a.acknowledged);
  const done = alertList.filter((a) => a.acknowledged);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-400">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-400 mt-1">{active.length} active alerts requiring attention</p>
      </div>

      {active.length > 0 ? (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Active</p>
          <div className="space-y-3">
            {active.map((alert) => (
              <div key={alert.id} className={`${cardStyle(alert.severity)} rounded-2xl p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{alert.patient}</span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeStyle(alert.severity)}`}>{alert.severity}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">{alert.type} · {alert.time}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                <div className="flex gap-2">
                  <button onClick={() => acknowledge(alert.id)} className="flex-1 text-xs bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Acknowledge</button>
                  <button className="flex-1 text-xs border border-gray-300 text-gray-600 py-2 rounded-xl hover:bg-white transition-colors">View Patient</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-white rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm">No active alerts right now.</p>
          <p className="text-green-500 text-sm mt-1">All patients are within acceptable adherence levels.</p>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Acknowledged</p>
          <div className="space-y-3">
            {done.map((alert) => (
              <div key={alert.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 opacity-60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-700">{alert.patient}</span>
                  <span className="text-xs text-gray-400">· {alert.type}</span>
                </div>
                <p className="text-sm text-gray-400">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
