export type ApptStatus = "booked" | "waiting" | "in_room" | "done" | "missed";
export type ApptSource = "qr" | "attender";

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  date: string;
  slot_time: string;
  token_number: number;
  status: ApptStatus;
  source: ApptSource;
};

export type BookResult =
  | { result: "booked" | "existing"; appointment: Appointment }
  | { result: "full"; next_free_day: string | null }
  | { result: "slot_taken" | "past" };

export type PatientSummary = {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  last_visit: string | null;
};
