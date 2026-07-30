import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "../config/firebase";

const VAPID_KEY = "BJ-9G7ZL0xgdcIKzhcFLI0eEC4LDcjbDv5eaWLBKxENCgV4T57fULPFDSrahF404pxjITOcJrs6ft4Nji5LMgk8";

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log("FCM Token:", token);

    // Save token to localStorage for later use
    localStorage.setItem("fcm_token", token);
    return token;
  } catch (err) {
    console.error("Error getting notification permission:", err);
    // Fall back to basic browser notifications
    return "basic";
  }
};

export const scheduleLocalReminder = (
  medicationName: string,
  dosage: string,
  dueTime: Date
) => {
  const now = new Date();
  const delay = dueTime.getTime() - now.getTime();

  if (delay < 0) return;

  // Schedule notification at due time
  setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification("MediSure — Dose Reminder 💊", {
        body: `Time to take your ${medicationName} ${dosage}`,
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag: `dose-${medicationName}`,
      });
    }
  }, delay);

  // Schedule 15-minute warning
  const warningDelay = delay - 15 * 60 * 1000;
  if (warningDelay > 0) {
    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification("MediSure — Upcoming Dose ⏰", {
          body: `${medicationName} ${dosage} is due in 15 minutes`,
          icon: "/logo192.png",
          badge: "/logo192.png",
          tag: `dose-warning-${medicationName}`,
        });
      }
    }, warningDelay);
  }
};

export const scheduleAllReminders = (medications: any[]) => {
  medications.forEach((med) => {
    if (med.logged) return;
    const times: string[] = med.times || [];
    times.forEach((time: string) => {
      const [hourStr, minuteStr] = time.replace(/AM|PM/gi, "").trim().split(":");
      let hour = parseInt(hourStr);
      const minute = parseInt(minuteStr || "0");
      if (time.toUpperCase().includes("PM") && hour !== 12) hour += 12;
      if (time.toUpperCase().includes("AM") && hour === 12) hour = 0;

      const dueTime = new Date();
      dueTime.setHours(hour, minute, 0, 0);

      scheduleLocalReminder(med.drugName, med.dosage, dueTime);
    });
  });
};

export const listenForMessages = () => {
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      if (Notification.permission === "granted" && payload.notification) {
        new Notification(payload.notification.title || "MediSure", {
          body: payload.notification.body,
          icon: "/logo192.png",
        });
      }
    });
  } catch (err) {
    console.error("Error setting up message listener:", err);
  }
};