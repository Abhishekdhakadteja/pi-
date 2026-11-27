"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/journey-client";

type Lang = "hi" | "en";
type Chapter = { time: string; icon: string; title: string; say: string; screen: string[] };

// "A doctor's day with Clinic Easy AI": 7 chapters, about 7 minutes. Plays by itself; the
// browser's own voice can read it aloud (free, no audio files). Only features that are live today.
const CHAPTERS: Record<Lang, Chapter[]> = {
  hi: [
    { time: "सुबह 8:55", icon: "🌅", title: "क्लिनिक खुलने से पहले", say: "डॉक्टर साहब, क्लिनिक खुलने से पहले ही आपके फ़ोन पर आज का पूरा हाल है। कितने मरीज़ बुक हैं, कौन follow-up पर आने वाला है, और कल की कमाई कितनी रही। कोई रजिस्टर नहीं, कोई फ़ोन कॉल नहीं। सब एक स्क्रीन पर।", screen: ["आज बुक: 18 मरीज़", "Follow-up आज: 6", "कल की कमाई: ₹7,800"] },
    { time: "सुबह 9:10", icon: "🧾", title: "रिसेप्शन पर 20 सेकंड", say: "मरीज़ आया। रिसेप्शन वाला नाम, मोबाइल और तकलीफ़ डालता है, चाहे बोलकर ही। टोकन नंबर अपने आप बनता है। पुराना मरीज़ है तो उसकी पिछली visit तुरंत दिखती है। एक मरीज़ के लिए बीस सेकंड।", screen: ["🎤 बोलकर नाम और तकलीफ़", "टोकन #7 बना", "पुराना मरीज़: 3 पिछली visit"] },
    { time: "सुबह 9:30", icon: "📱", title: "भीड़ नहीं, लाइव कतार", say: "मरीज़ QR स्कैन करके अपने फ़ोन पर देखता है कि अभी कौन सा टोकन चल रहा है। वो बाहर चाय पी सकता है, शोर नहीं करता। आपकी वेटिंग रूम शांत रहती है, और मरीज़ ख़ुश।", screen: ["अभी अंदर: टोकन #5", "आपका नंबर: #7", "लगभग 12 मिनट"] },
    { time: "दोपहर 12:00", icon: "💊", title: "पर्ची और follow-up एक साथ", say: "आप दवा लिखते हैं, कितने दिन की है, और अगली visit कब। बस। Clinic Easy याद रखता है कि दवा कब ख़त्म होगी। साफ़ छपी पर्ची, आपके क्लिनिक के नाम से।", screen: ["दवा: 15 दिन", "दवा ख़त्म: 12 दिसंबर", "अगली visit: 14 दिसंबर"] },
    { time: "शाम 6:00", icon: "💚", title: "मरीज़ ख़ुद लौटकर आते हैं", say: "दवा ख़त्म होने से पहले, और अगली visit से पहले, मरीज़ को आपके नाम से WhatsApp पर याद आता है। एक टैप। जो मरीज़ भूल जाते थे, वो अब लौटते हैं। ये इलाज भी पूरा करवाता है, और आपकी प्रैक्टिस भी बढ़ाता है।", screen: ["आज के रिमाइंडर: 9", "✓ Ramesh ji: दवा ख़त्म होने वाली", "✓ Sunita ji: कल visit"] },
    { time: "रात 9:00", icon: "📊", title: "दिन का हिसाब, एक नज़र में", say: "दिन ख़त्म। कितने मरीज़, कितनी फीस कैश में, कितनी UPI में, क्या ख़र्च हुआ। दिन, हफ़्ता, महीना, साल। Excel में डाउनलोड भी, CA के लिए तैयार।", screen: ["आज: 22 मरीज़", "कमाई: ₹8,400 (UPI ₹5,100)", "महीना: ₹1,92,000"] },
    { time: "हमेशा", icon: "✨", title: "आपका AI मैनेजर (Pro)", say: "Pro में आपका अपना AI मैनेजर है। पूछिए: इस हफ़्ते कितने नए मरीज़ आए? किसकी follow-up छूट गई? वो तुरंत बताता है, सिर्फ़ आपकी क्लिनिक के डेटा से। आपका समय, मरीज़ों के लिए। अब बारी आपकी है। पाँच मिनट का लाइव डेमो ख़ुद चलाकर देखिए।", screen: ["आप: इस हफ़्ते की follow-up?", "AI: 4 मरीज़ नहीं आए, सूची तैयार", "1 टैप में सबको रिमाइंडर"] },
  ],
  en: [
    { time: "8:55 AM", icon: "🌅", title: "Before the clinic opens", say: "Doctor, before your clinic opens, today's picture is already on your phone. Who is booked, who is due for follow-up, and yesterday's earnings. No register, no phone calls. One screen.", screen: ["Booked today: 18", "Follow-ups today: 6", "Yesterday: ₹7,800"] },
    { time: "9:10 AM", icon: "🧾", title: "20 seconds at the desk", say: "A patient arrives. The front desk types, or just speaks, the name, mobile and complaint. The token is made automatically. For an old patient, past visits show at once. Twenty seconds per patient.", screen: ["🎤 Name and complaint by voice", "Token #7 created", "Returning: 3 past visits"] },
    { time: "9:30 AM", icon: "📱", title: "No crowd, a live queue", say: "Patients scan a QR and watch the running token on their own phone. They can wait outside, calmly. Your waiting room stays quiet and patients stay happy.", screen: ["Now inside: #5", "Your token: #7", "About 12 min"] },
    { time: "12:00 PM", icon: "💊", title: "Prescription and follow-up together", say: "You write the medicine, how many days, and the next visit. That's it. Clinic Easy remembers when the medicine runs out. A clean printed slip with your clinic's name.", screen: ["Medicine: 15 days", "Runs out: 12 Dec", "Next visit: 14 Dec"] },
    { time: "6:00 PM", icon: "💚", title: "Patients come back on their own", say: "Before the medicine runs out, and before the next visit, the patient gets a WhatsApp reminder in your name. One tap. Patients who used to forget now return. Better treatment, and a growing practice.", screen: ["Reminders today: 9", "✓ Ramesh: medicine ending", "✓ Sunita: visit tomorrow"] },
    { time: "9:00 PM", icon: "📊", title: "The day's accounts at a glance", say: "Day done. Patients, fees in cash and UPI, expenses. Day, week, month, year. Download to Excel, ready for your CA.", screen: ["Today: 22 patients", "Earned: ₹8,400 (UPI ₹5,100)", "Month: ₹1,92,000"] },
    { time: "Always", icon: "✨", title: "Your AI manager (Pro)", say: "With Pro you get your own AI manager. Ask: how many new patients this week? Whose follow-up was missed? It answers instantly, from your clinic's data only. Your time goes back to patients. Now it's your turn. Try the five-minute live demo yourself.", screen: ["You: this week's follow-ups?", "AI: 4 missed, list ready", "Remind all in 1 tap"] },
  ],
};

const MIN_MS = 30_000;

export function Webinar({ lang, refTag }: { lang: Lang; refTag: string | null }) {
  const chapters = CHAPTERS[lang];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const durRef = useRef(MIN_MS);
  const ch = chapters[i];

  // chapter length: long enough to read (or to be read aloud)
  useEffect(() => {
    durRef.current = Math.max(MIN_MS, ch.say.length * 85);
    setElapsed(0);
  }, [ch]);

  const speak = useCallback(() => {
    try {
      const s = window.speechSynthesis;
      s.cancel();
      if (!voice || !playing) return;
      const u = new SpeechSynthesisUtterance(ch.say);
      u.lang = lang === "hi" ? "hi-IN" : "en-IN";
      u.rate = 0.98;
      const v = s.getVoices().find((x) => x.lang?.toLowerCase().startsWith(lang === "hi" ? "hi" : "en-in"));
      if (v) u.voice = v;
      s.speak(u);
    } catch {}
  }, [ch, lang, voice, playing]);

  useEffect(() => {
    speak();
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    };
  }, [speak]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 250;
        if (next >= durRef.current) {
          if (i < chapters.length - 1) setI(i + 1);
          else {
            setPlaying(false);
            setDone(true);
          }
          return 0;
        }
        return next;
      });
    }, 250);
    return () => clearInterval(t);
  }, [playing, i, chapters.length]);

  const start = () => {
    setPlaying(true);
    setDone(false);
    track("webinar", refTag);
  };
  const totalPct = ((i + Math.min(1, elapsed / durRef.current)) / chapters.length) * 100;
  const hi = lang === "hi";

  return (
    <div className="w-full">
      <div className="card os-scan relative overflow-hidden p-5" data-testid="webinar-stage">
        <div className="flex items-center justify-between text-xs font-bold tracking-wider">
          <span className="text-cyan-200">
            {hi ? "अध्याय" : "CHAPTER"} {i + 1}/{chapters.length} · {ch.time}
          </span>
          <span className={`flex items-center gap-1.5 ${playing ? "text-rose-300" : "text-slate-400"}`}>
            <span className={`h-2 w-2 rounded-full ${playing ? "os-live-dot bg-rose-400" : "bg-slate-500"}`} />
            {playing ? (hi ? "चल रहा है" : "PLAYING") : hi ? "रुका" : "PAUSED"}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-5xl" aria-hidden>
            {ch.icon}
          </span>
          <h2 className="text-2xl font-bold text-white">{ch.title}</h2>
        </div>
        <div className="mt-4 rounded-2xl bg-[#030712]/70 p-4 ring-1 ring-cyan-400/20">
          {ch.screen.map((l, k) => (
            <div key={l} className="flex items-center gap-2 py-1 font-mono text-sm text-emerald-200" style={{ animation: `fadein .5s ${k * 0.35}s both` }}>
              <span className="text-cyan-400">›</span> {l}
            </div>
          ))}
        </div>
        <p className="mt-4 leading-relaxed text-slate-200">{ch.say}</p>
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] transition-[width] duration-200" style={{ width: `${totalPct}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!playing ? (
            <button onClick={start} className="btn bg-gradient-to-r from-[#14d8b8] to-[#22B8F5] text-[#020617]" data-testid="webinar-play">
              ▶ {done ? (hi ? "फिर से" : "Replay") : i === 0 && elapsed === 0 ? (hi ? "वेबिनार शुरू करें" : "Start webinar") : hi ? "चलाएँ" : "Play"}
            </button>
          ) : (
            <button onClick={() => setPlaying(false)} className="btn bg-white/10 text-white ring-1 ring-white/20">
              ⏸ {hi ? "रोकें" : "Pause"}
            </button>
          )}
          <button onClick={() => i > 0 && setI(i - 1)} className="btn-small bg-white/5 text-white ring-1 ring-white/15" aria-label="previous">
            ⏮
          </button>
          <button onClick={() => (i < chapters.length - 1 ? setI(i + 1) : setDone(true))} className="btn-small bg-white/5 text-white ring-1 ring-white/15" aria-label="next">
            ⏭
          </button>
          <button onClick={() => setVoice(!voice)} className="btn-small ml-auto bg-white/5 text-white ring-1 ring-white/15">
            {voice ? "🔊" : "🔇"} {hi ? "आवाज़" : "Voice"}
          </button>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        {chapters.map((c, k) => (
          <li key={c.title}>
            <button onClick={() => setI(k)} className={`w-full rounded-xl px-3 py-2 text-left ring-1 ${k === i ? "bg-cyan-400/15 text-white ring-cyan-300/50" : k < i ? "bg-white/5 text-slate-300 ring-white/10" : "bg-transparent text-slate-400 ring-white/10"}`}>
              {k < i ? "✓" : c.icon} {c.time} · {c.title}
            </button>
          </li>
        ))}
      </ol>

      {(done || i === chapters.length - 1) && (
        <div className="card mt-5 border border-amber-300/40 p-5 text-center" data-testid="webinar-cta">
          <h3 className="text-xl font-bold text-white">{hi ? "अब ख़ुद चलाकर देखिए" : "Now try it yourself"}</h3>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/demo?ref=webinar" className="btn bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-[#020617]">
              ▶ {hi ? "5 मिनट LIVE डेमो" : "5-minute LIVE demo"}
            </Link>
            <Link href="/start?step=offer&ref=webinar" className="btn border border-amber-300/50 bg-amber-300/10 text-amber-50">
              🎁 {hi ? "मेरा प्लान और लॉन्च ऑफ़र" : "My plan and launch offer"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
