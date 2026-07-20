import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
} from "firebase/firestore";

interface Note {
  id: string;
  note: string;
  providerName: string;
  createdAt: string;
}

interface Props {
  patientId: string;
  providerId: string;
  providerName: string;
}

const ProviderNotes = ({ patientId, providerId, providerName }: Props) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, [patientId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(
        query(
          collection(db, "provider_notes"),
          where("patientId", "==", patientId)
        )
      );
      const loaded: Note[] = snapshot.docs.map((d) => ({
        id: d.id,
        note: d.data().note,
        providerName: d.data().providerName,
        createdAt: d.data().createdAt,
      }));
      loaded.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotes(loaded);
    } catch (err) {
      console.error("Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newNote.trim()) return;
    try {
      setSaving(true);
      const docRef = await addDoc(collection(db, "provider_notes"), {
        patientId,
        providerId,
        providerName,
        note: newNote.trim(),
        createdAt: new Date().toISOString(),
      });
      setNotes((prev) => [
        {
          id: docRef.id,
          note: newNote.trim(),
          providerName,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewNote("");
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Add note */}
      <div className="mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a clinical note for this patient..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving || !newNote.trim()}
          className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {saving ? "Saving..." : "Add Note"}
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-300">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-blue-600">
                  {note.providerName}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(note.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{note.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderNotes;