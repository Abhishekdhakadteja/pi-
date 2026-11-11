// Simple two-language dictionary. Hindi (hi) is the default.
// Add a key in BOTH languages. Keep words short and plain.

export type Lang = "hi" | "en";
export const LANGS: Lang[] = ["hi", "en"];
export const LANG_COOKIE = "lang";

const en = {
  appName: "ClinicEase",
  tagline: "Simple clinic management",
  switchLang: "हिंदी",
  staffLogin: "Staff login",
  bookAppointment: "Book appointment",
  logout: "Logout",
  home: "Home",
  back: "Back",
  save: "Save",
  saved: "Saved",
  cancel: "Cancel",
  loading: "Please wait...",
  yes: "Yes",
  no: "No",

  // login
  loginTitle: "Staff login",
  emailOrPhone: "Email or mobile number",
  password: "Password",
  login: "Login",
  loginFailed: "Login failed. Check your email/mobile and password.",
  noStaffProfile: "Your account is not linked to any clinic. Ask the clinic admin.",

  // roles / nav
  attenderDesk: "Attender desk",
  todaysList: "Today's list",
  doctorView: "Doctor view",
  settings: "Settings",
  reports: "Reports",
  reminders: "Reminders",

  // desk
  searchByPhone: "Patient mobile number",
  search: "Search",
  noPatientFound: "No patient with this number. Add a new patient:",
  addPatient: "Add patient",
  addNewFamilyMember: "Add another family member",
  name: "Name",
  phone: "Mobile number",
  age: "Age",
  gender: "Gender",
  male: "Male",
  female: "Female",
  other: "Other",
  address: "Address",
  consentText: "Patient agrees to be contacted by SMS or WhatsApp for appointments and reminders.",
  consentRequired: "Please tick the consent box.",
  choosePatient: "Choose patient",
  bookToday: "Book today",
  bookAnotherDay: "Book another day",
  pickDate: "Pick a date",
  book: "Book",
  tokenNumber: "Token number",
  token: "Token",
  time: "Time",
  date: "Date",
  dayFull: "This day is full",
  nextFreeDay: "Next free day",
  bookOn: "Book on",
  alreadyBooked: "Already booked for this day",
  newSearch: "New search",
  lastVisit: "Last visit",
  never: "Never",

  // today list
  total: "Total",
  done: "Done",
  remaining: "Remaining",
  status_booked: "Booked",
  status_waiting: "Waiting",
  status_in_room: "In room",
  status_done: "Done",
  status_missed: "Missed",
  markMissed: "Missed",
  confirmMissed: "Mark this patient as missed?",
  noPatientsToday: "No patients today yet.",
  source_qr: "QR",
  source_attender: "Desk",
  live: "Live",

  // doctor
  inRoom: "Patient in room",
  noOneInRoom: "No patient in the room.",
  callNext: "Call next patient",
  noOneWaiting: "No one is waiting.",
  pastVisits: "Past visits",
  noPastVisits: "No past visits.",
  todaysNotes: "Today's notes",
  diagnosis: "Diagnosis",
  saveNotes: "Save notes",
  treatmentCourse: "Medicine course",
  daysOfMedicine: "Days of medicine given",
  saveCourse: "Save course",
  medicineEnds: "Medicine ends on",
  nextVisit: "Next visit",
  complete: "Complete",
  years: "yrs",

  // booking (patient)
  bookTitle: "Book your appointment",
  enterPhone: "Enter your mobile number",
  sendOtp: "Send OTP",
  enterOtp: "Enter the OTP sent to your mobile",
  verify: "Verify",
  otpSentTo: "OTP sent to",
  changeNumber: "Change number",
  whoIsVisiting: "Who is visiting?",
  pickDay: "Pick a day",
  full: "Full",
  pickTime: "Pick a time",
  confirm: "Confirm booking",
  bookingConfirmed: "Booking confirmed",
  yourToken: "Your token",
  seeLiveQueue: "See live queue",
  noFreeSlots: "No free time on this day.",
  showExistingBooking: "You already have a booking on this day:",

  // queue
  nowRunning: "Now running",
  yourNumber: "Your number",
  patientsAhead: "Patients ahead of you",
  turnComing: "Your turn is coming, please be ready.",
  goInNow: "Please go in now.",
  reconnecting: "Reconnecting...",
  queueNotStarted: "Not started yet",
  visitDone: "Your visit is complete.",

  // admin
  clinicSettings: "Clinic settings",
  clinicName: "Clinic name",
  slotsPerDay: "Appointments per day",
  openingTime: "Opening time",
  closingTime: "Closing time",
  generateQr: "Generate clinic QR code",
  printPoster: "Print poster",
  scanToBook: "Scan to book your appointment",
  scanToBookHi: "अपॉइंटमेंट बुक करने के लिए स्कैन करें",
  remindersSent: "Reminders sent",
  editWording: "Edit message wording",
  messageHindi: "Hindi message",
  messageEnglish: "English message",
  placeholdersHelp: "You can use: {patient} {doctor} {clinic} {link}",
  optOut: "Stop messages",
  optedOut: "Opted out",
  optOutPatient: "Stop messages for a patient (mobile number)",
  noReminders: "No reminders yet.",
  channel: "Channel",
  kind: "Type",
  kind_first: "First",
  kind_follow_up: "Follow-up",
  rstatus_sent: "Sent",
  rstatus_logged: "Logged (not sent)",
  rstatus_failed: "Failed",
  rstatus_skipped: "Skipped",
  rstatus_queued: "Queued",

  // reports
  today: "Today",
  thisWeek: "This week",
  thisMonth: "This month",
  booked: "Booked",
  missed: "Missed",
  walkIn: "Desk (walk-in)",
  qrBookings: "QR bookings",
  bookedAfterReminder: "Booked after a reminder",
  exportExcel: "Export to Excel",

  // errors
  err_phone: "Enter a valid 10-digit Indian mobile number.",
  err_name: "Please enter the name.",
  err_age: "Enter a valid age (0-120).",
  err_date: "Pick a valid date.",
  err_days: "Enter days between 1 and 365.",
  err_generic: "Something went wrong. Please try again.",
  err_network: "No internet connection. Please try again.",
  err_otp: "Wrong or expired OTP. Please try again.",
  err_otp_rate: "Too many OTP requests. Please wait 10 minutes.",
  err_slot_taken: "This time was just taken. Please pick another.",
  err_past: "This time has already passed.",
  err_not_allowed: "You are not allowed to open this page.",
  err_session: "Your session has ended. Please verify your mobile again.",
} as const;

export type DictKey = keyof typeof en;
type Dict = Record<DictKey, string>;

const hi: Dict = {
  appName: "ClinicEase",
  tagline: "आसान क्लिनिक मैनेजमेंट",
  switchLang: "English",
  staffLogin: "स्टाफ लॉगिन",
  bookAppointment: "अपॉइंटमेंट बुक करें",
  logout: "लॉगआउट",
  home: "होम",
  back: "वापस",
  save: "सेव करें",
  saved: "सेव हो गया",
  cancel: "रद्द करें",
  loading: "कृपया रुकें...",
  yes: "हाँ",
  no: "नहीं",

  loginTitle: "स्टाफ लॉगिन",
  emailOrPhone: "ईमेल या मोबाइल नंबर",
  password: "पासवर्ड",
  login: "लॉगिन",
  loginFailed: "लॉगिन नहीं हुआ। ईमेल/मोबाइल और पासवर्ड जाँचें।",
  noStaffProfile: "आपका अकाउंट किसी क्लिनिक से जुड़ा नहीं है। एडमिन से पूछें।",

  attenderDesk: "अटेंडर डेस्क",
  todaysList: "आज की लिस्ट",
  doctorView: "डॉक्टर व्यू",
  settings: "सेटिंग्स",
  reports: "रिपोर्ट",
  reminders: "रिमाइंडर",

  searchByPhone: "मरीज़ का मोबाइल नंबर",
  search: "खोजें",
  noPatientFound: "इस नंबर पर कोई मरीज़ नहीं मिला। नया मरीज़ जोड़ें:",
  addPatient: "मरीज़ जोड़ें",
  addNewFamilyMember: "परिवार का दूसरा सदस्य जोड़ें",
  name: "नाम",
  phone: "मोबाइल नंबर",
  age: "उम्र",
  gender: "लिंग",
  male: "पुरुष",
  female: "महिला",
  other: "अन्य",
  address: "पता",
  consentText: "मरीज़ अपॉइंटमेंट और रिमाइंडर के लिए SMS या WhatsApp पर संपर्क के लिए सहमत है।",
  consentRequired: "कृपया सहमति वाला बॉक्स टिक करें।",
  choosePatient: "मरीज़ चुनें",
  bookToday: "आज बुक करें",
  bookAnotherDay: "किसी और दिन बुक करें",
  pickDate: "तारीख चुनें",
  book: "बुक करें",
  tokenNumber: "टोकन नंबर",
  token: "टोकन",
  time: "समय",
  date: "तारीख",
  dayFull: "यह दिन पूरा भर चुका है",
  nextFreeDay: "अगला खाली दिन",
  bookOn: "इस दिन बुक करें",
  alreadyBooked: "इस दिन पहले से बुकिंग है",
  newSearch: "नई खोज",
  lastVisit: "पिछली विज़िट",
  never: "कभी नहीं",

  total: "कुल",
  done: "हो गए",
  remaining: "बाकी",
  status_booked: "बुक",
  status_waiting: "इंतज़ार में",
  status_in_room: "अंदर",
  status_done: "हो गया",
  status_missed: "नहीं आए",
  markMissed: "नहीं आए",
  confirmMissed: "क्या यह मरीज़ नहीं आया?",
  noPatientsToday: "आज अभी कोई मरीज़ नहीं।",
  source_qr: "QR",
  source_attender: "डेस्क",
  live: "लाइव",

  inRoom: "अंदर वाला मरीज़",
  noOneInRoom: "अभी अंदर कोई मरीज़ नहीं।",
  callNext: "अगला मरीज़ बुलाएँ",
  noOneWaiting: "कोई इंतज़ार में नहीं है।",
  pastVisits: "पिछली विज़िट",
  noPastVisits: "कोई पिछली विज़िट नहीं।",
  todaysNotes: "आज के नोट्स",
  diagnosis: "डायग्नोसिस",
  saveNotes: "नोट्स सेव करें",
  treatmentCourse: "दवा का कोर्स",
  daysOfMedicine: "कितने दिन की दवा दी",
  saveCourse: "कोर्स सेव करें",
  medicineEnds: "दवा खत्म होगी",
  nextVisit: "अगली विज़िट",
  complete: "पूरा हुआ",
  years: "साल",

  bookTitle: "अपना अपॉइंटमेंट बुक करें",
  enterPhone: "अपना मोबाइल नंबर डालें",
  sendOtp: "OTP भेजें",
  enterOtp: "मोबाइल पर आया OTP डालें",
  verify: "जाँचें",
  otpSentTo: "OTP भेजा गया",
  changeNumber: "नंबर बदलें",
  whoIsVisiting: "कौन दिखाने आ रहा है?",
  pickDay: "दिन चुनें",
  full: "भरा हुआ",
  pickTime: "समय चुनें",
  confirm: "बुकिंग पक्की करें",
  bookingConfirmed: "बुकिंग पक्की हो गई",
  yourToken: "आपका टोकन",
  seeLiveQueue: "लाइव लाइन देखें",
  noFreeSlots: "इस दिन कोई समय खाली नहीं।",
  showExistingBooking: "इस दिन आपकी बुकिंग पहले से है:",

  nowRunning: "अभी चल रहा है",
  yourNumber: "आपका नंबर",
  patientsAhead: "आपसे पहले मरीज़",
  turnComing: "आपकी बारी आने वाली है, तैयार रहें।",
  goInNow: "कृपया अभी अंदर जाएँ।",
  reconnecting: "दोबारा जुड़ रहे हैं...",
  queueNotStarted: "अभी शुरू नहीं हुआ",
  visitDone: "आपकी विज़िट पूरी हो गई।",

  clinicSettings: "क्लिनिक सेटिंग्स",
  clinicName: "क्लिनिक का नाम",
  slotsPerDay: "एक दिन में अपॉइंटमेंट",
  openingTime: "खुलने का समय",
  closingTime: "बंद होने का समय",
  generateQr: "क्लिनिक QR कोड बनाएँ",
  printPoster: "पोस्टर प्रिंट करें",
  scanToBook: "Scan to book your appointment",
  scanToBookHi: "अपॉइंटमेंट बुक करने के लिए स्कैन करें",
  remindersSent: "भेजे गए रिमाइंडर",
  editWording: "मैसेज के शब्द बदलें",
  messageHindi: "हिंदी मैसेज",
  messageEnglish: "अंग्रेज़ी मैसेज",
  placeholdersHelp: "आप लिख सकते हैं: {patient} {doctor} {clinic} {link}",
  optOut: "मैसेज बंद करें",
  optedOut: "मैसेज बंद",
  optOutPatient: "किसी मरीज़ के मैसेज बंद करें (मोबाइल नंबर)",
  noReminders: "अभी कोई रिमाइंडर नहीं।",
  channel: "चैनल",
  kind: "प्रकार",
  kind_first: "पहला",
  kind_follow_up: "दूसरा (फॉलो-अप)",
  rstatus_sent: "भेजा गया",
  rstatus_logged: "लॉग हुआ (भेजा नहीं)",
  rstatus_failed: "फेल",
  rstatus_skipped: "छोड़ा गया",
  rstatus_queued: "लाइन में",

  today: "आज",
  thisWeek: "इस हफ्ते",
  thisMonth: "इस महीने",
  booked: "बुक हुए",
  missed: "नहीं आए",
  walkIn: "डेस्क (सीधे आए)",
  qrBookings: "QR बुकिंग",
  bookedAfterReminder: "रिमाइंडर के बाद बुक किया",
  exportExcel: "Excel में डाउनलोड करें",

  err_phone: "सही 10 अंकों का मोबाइल नंबर डालें।",
  err_name: "कृपया नाम डालें।",
  err_age: "सही उम्र डालें (0-120)।",
  err_date: "सही तारीख चुनें।",
  err_days: "1 से 365 के बीच दिन डालें।",
  err_generic: "कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।",
  err_network: "इंटरनेट नहीं है। कृपया दोबारा कोशिश करें।",
  err_otp: "OTP गलत है या पुराना हो गया। दोबारा कोशिश करें।",
  err_otp_rate: "बहुत बार OTP माँगा गया। 10 मिनट रुकें।",
  err_slot_taken: "यह समय अभी किसी ने ले लिया। दूसरा समय चुनें।",
  err_past: "यह समय निकल चुका है।",
  err_not_allowed: "आपको यह पेज खोलने की अनुमति नहीं है।",
  err_session: "आपका सेशन खत्म हो गया। मोबाइल दोबारा वेरिफाई करें।",
};

const DICTS: Record<Lang, Dict> = { en, hi };

export function isLang(v: unknown): v is Lang {
  return v === "hi" || v === "en";
}

export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? hi;
}

export type T = (key: DictKey) => string;

export function makeT(lang: Lang): T {
  const d = getDict(lang);
  return (key) => d[key] ?? en[key] ?? key;
}

/** Error codes returned by server actions map to dictionary keys. */
export type ErrorCode =
  | "err_phone"
  | "err_name"
  | "err_age"
  | "err_date"
  | "err_days"
  | "err_generic"
  | "err_otp"
  | "err_otp_rate"
  | "err_slot_taken"
  | "err_past"
  | "err_not_allowed"
  | "err_session"
  | "consentRequired"
  | "loginFailed"
  | "noStaffProfile";
