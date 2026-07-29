import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface HealthProfile {
  dateOfBirth: string;
  phoneNumber: string;
  bloodType: string;
  conditions: string[];
  treatmentPlan: string;
  allergies: string;
  emergencyContact: string;
}

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [health, setHealth] = useState<HealthProfile>({
    dateOfBirth: "",
    phoneNumber: "",
    bloodType: "",
    conditions: [],
    treatmentPlan: "",
    allergies: "",
    emergencyContact: "",
  });
  const [conditionInput, setConditionInput] = useState("");

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "P";

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, "users", user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || "");
        setHealth({
          dateOfBirth: data.dateOfBirth || "",
          phoneNumber: data.phoneNumber || "",
          bloodType: data.bloodType || "",
          conditions: data.conditions || [],
          treatmentPlan: data.treatmentPlan || "",
          allergies: data.allergies || "",
          emergencyContact: data.emergencyContact || "",
        });
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "users", user.id), {
        name: name.trim(),
        ...health,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    if (!conditionInput.trim()) return;
    setHealth((prev) => ({
      ...prev,
      conditions: [...prev.conditions, conditionInput.trim()],
    }));
    setConditionInput("");
  };

  const removeCondition = (index: number) => {
    setHealth((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="pb-24 bg-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your account and health info</p>
        </div>
        <button
          onClick={() => editing ? setEditing(false) : setEditing(true)}
          className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
            editing
              ? "bg-gray-100 text-gray-500"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Avatar */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-3">
          <span className="text-purple-600 text-2xl font-bold">{initials}</span>
        </div>
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-center border border-gray-200 rounded-xl px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        ) : (
          <h2 className="text-lg font-bold text-gray-900">{name}</h2>
        )}
        <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium mt-2 capitalize">
          {user?.role}
        </span>
      </div>

      {/* Account Info */}
      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</p>
        </div>
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Email Address</p>
          <p className="text-sm font-semibold text-gray-800">{user?.email}</p>
        </div>
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Phone Number</p>
          {editing ? (
            <input
              value={health.phoneNumber}
              onChange={(e) => setHealth({ ...health, phoneNumber: e.target.value })}
              placeholder="e.g. +254 700 000000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {health.phoneNumber || <span className="text-gray-300">Not set</span>}
            </p>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Date of Birth</p>
          {editing ? (
            <input
              type="date"
              value={health.dateOfBirth}
              onChange={(e) => setHealth({ ...health, dateOfBirth: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {health.dateOfBirth || <span className="text-gray-300">Not set</span>}
            </p>
          )}

        </div>
      </div>

      {/* Health Information */}
      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Health Information</p>
        </div>

        {/* Blood Type */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Blood Type</p>
          {editing ? (
            <select
              value={health.bloodType}
              onChange={(e) => setHealth({ ...health, bloodType: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select blood type</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {health.bloodType || <span className="text-gray-300">Not set</span>}
            </p>
          )}
        </div>

        {/* Conditions */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Diagnosed Conditions</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {health.conditions.length === 0 && !editing && (
              <span className="text-sm text-gray-300">None recorded</span>
            )}
            {health.conditions.map((c, i) => (
              <span
                key={i}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full flex items-center gap-1"
              >
                {c}
                {editing && (
                  <button
                    onClick={() => removeCondition(i)}
                    className="text-blue-400 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="flex gap-2 mt-2">
              <input
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCondition()}
                placeholder="Add condition (press Enter)"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={addCondition}
                className="text-sm bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Treatment Plan */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Current Treatment Plan</p>
          {editing ? (
            <textarea
              value={health.treatmentPlan}
              onChange={(e) => setHealth({ ...health, treatmentPlan: e.target.value })}
              placeholder="Describe your current treatment plan..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-800 leading-relaxed">
              {health.treatmentPlan || <span className="text-gray-300">Not set</span>}
            </p>
          )}
        </div>

        {/* Allergies */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Allergies</p>
          {editing ? (
            <input
              value={health.allergies}
              onChange={(e) => setHealth({ ...health, allergies: e.target.value })}
              placeholder="e.g. Penicillin, Peanuts"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {health.allergies || <span className="text-gray-300">None recorded</span>}
            </p>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Emergency Contact</p>
          {editing ? (
            <input
              value={health.emergencyContact}
              onChange={(e) => setHealth({ ...health, emergencyContact: e.target.value })}
              placeholder="Name & phone number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {health.emergencyContact || <span className="text-gray-300">Not set</span>}
            </p>
          )}
        </div>
      </div>

      {/* Save / Logout */}
      <div className="mx-4 mt-4 space-y-3">
        {editing && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-2xl font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
        {saved && (
          <p className="text-center text-sm text-green-500">✓ Profile updated successfully</p>
        )}
        <button
          onClick={handleLogout}
          className="w-full py-3 text-sm text-red-400 border border-red-200 rounded-2xl hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;