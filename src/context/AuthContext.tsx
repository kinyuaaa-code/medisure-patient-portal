import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (role?: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
          setUser({
            id: fbUser.uid,
            name: userDoc.data().name,
            email: fbUser.email || "",
            role: userDoc.data().role,
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", result.user.uid));
    if (userDoc.exists()) {
      const profile: UserProfile = {
        id: result.user.uid,
        name: userDoc.data().name,
        email: result.user.email || "",
        role: userDoc.data().role,
      };
      setUser(profile);
      return profile as any;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string = "patient"
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", result.user.uid), {
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      dateOfBirth: "",
      phoneNumber: "",
      bloodType: "",
      conditions: [],
      treatmentPlan: "",
      allergies: "",
      emergencyContact: "",
    });
    const profile: UserProfile = {
      id: result.user.uid,
      name,
      email,
      role,
    };
    setUser(profile);
    return profile as any;
  };

  const loginWithGoogle = async (role: string = "patient") => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Check if user already exists in Firestore
    const userDoc = await getDoc(doc(db, "users", result.user.uid));

    if (!userDoc.exists()) {
      // New user — create their profile
      await setDoc(doc(db, "users", result.user.uid), {
        name: result.user.displayName || "User",
        email: result.user.email || "",
        role,
        createdAt: new Date().toISOString(),
        dateOfBirth: "",
        phoneNumber: "",
        bloodType: "",
        conditions: [],
        treatmentPlan: "",
        allergies: "",
        emergencyContact: "",
      });
    }

    const existingRole = userDoc.exists() ? userDoc.data().role : role;

    const profile: UserProfile = {
      id: result.user.uid,
      name: result.user.displayName || "User",
      email: result.user.email || "",
      role: existingRole,
    };
    setUser(profile);
    return profile as any;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        loginWithGoogle,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;