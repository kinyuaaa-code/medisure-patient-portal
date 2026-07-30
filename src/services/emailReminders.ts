import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_jxsmpkw";
const TEMPLATE_ID = "template_xvzcewi";
const PUBLIC_KEY = "5B5VqS5o44sHAL7vQ";

// Initialize EmailJS
emailjs.init(PUBLIC_KEY);

export const sendEmailReminder = async (
  patientName: string,
  patientEmail: string,
  medicationName: string,
  dosage: string,
  scheduledTime: string
) => {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        patient_name: patientName,
        patient_email: patientEmail,
        medication_name: medicationName,
        dosage,
        scheduled_time: scheduledTime,
      }
    );
    console.log(`Email reminder sent to ${patientEmail} for ${medicationName}`);
  } catch (err) {
    console.error("Error sending email reminder:", err);
  }
};

export const scheduleEmailReminders = (
  medications: any[],
  patientName: string,
  patientEmail: string
) => {
  if (!patientEmail) return;

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

      const delay = dueTime.getTime() - Date.now();

      // Send email 30 minutes before dose is due
      const emailDelay = delay - 30 * 60 * 1000;
      if (emailDelay > 0) {
        setTimeout(() => {
          sendEmailReminder(
            patientName,
            patientEmail,
            med.drugName,
            med.dosage,
            time
          );
        }, emailDelay);
        console.log(
          `Email reminder scheduled for ${med.drugName} at ${time} (in ${Math.round(emailDelay / 60000)} minutes)`
        );
      }
    });
  });
};