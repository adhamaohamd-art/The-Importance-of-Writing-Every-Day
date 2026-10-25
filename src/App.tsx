import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  PenTool,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Award,
  ArrowUp,
  Share2,
  FileText,
  Layers,
  Sparkles,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import journalHeroImage from './assets/images/warm_journal_writing_1791727774394.jpg';

// Helper for soft audio chime when 2-minute timer ends
function playSoftChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.4);
  } catch (e) {
    console.error('Audio chime error:', e);
  }
}

// Sentence and word counting helpers
function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const segments = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && /[a-zA-Z]/.test(s));
  return segments.length;
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface VocabWord {
  id: string;
  word: string;
  pos: string;
  definition: string;
  example: string;
}

const VOCAB_LIST: VocabWord[] = [
  {
    id: 'journal',
    word: 'journal',
    pos: 'noun',
    definition: 'a book where you write your thoughts',
    example: 'I write in my journal every night.',
  },
  {
    id: 'express',
    word: 'express',
    pos: 'verb',
    definition: 'to share your thoughts or feelings',
    example: 'Writing helps me express my ideas.',
  },
  {
    id: 'improve',
    word: 'improve',
    pos: 'verb',
    definition: 'to get better',
    example: 'Practice will improve your writing.',
  },
  {
    id: 'organize',
    word: 'organize',
    pos: 'verb',
    definition: 'to put things in order',
    example: 'I organize my ideas before writing.',
  },
  {
    id: 'reflect',
    word: 'reflect',
    pos: 'verb',
    definition: 'to think carefully',
    example: 'Writing helps me reflect on my day.',
  },
];

const ARTICLE_SENTENCES = [
  'Writing every day has many benefits.',
  'It helps you express your ideas clearly, improves your vocabulary, and organizes your thoughts.',
  'Writing also helps you reflect on your day and understand your feelings.',
  'Many people write for 10 minutes every day.',
  'It is a simple habit that can change your life.',
];

const FULL_ARTICLE_TEXT = ARTICLE_SENTENCES.join(' ');

const SENTENCE_STARTERS = [
  'I write every day because...',
  'When I write, I feel...',
  'Writing helps me...',
  'My favorite thing to write about is...',
  'In the future, I want to write...',
];

const QUIZ_OPTIONS = [
  {
    id: 'opt-a',
    text: 'Many people write for 10 minutes every day.',
    isCorrect: false,
    explanation: 'This is a small fact/detail, not the central topic of the entire article.',
  },
  {
    id: 'opt-b',
    text: 'Writing every day has many benefits.',
    isCorrect: true,
    explanation: 'Correct! This is the main idea. All the other sentences describe the benefits!',
  },
  {
    id: 'opt-c',
    text: 'It improves your vocabulary and organizes your thoughts.',
    isCorrect: false,
    explanation: 'This is a supporting detail explaining one benefit, not the overall main idea.',
  },
  {
    id: 'opt-d',
    text: 'It is a simple habit that can change your life.',
    isCorrect: false,
    explanation: 'This is a concluding summary remark rather than the main topic stated at the beginning.',
  },
];

export default function App() {
  // Timer state for Section 1 (Warm-Up: 2 minutes)
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [partnerNote, setPartnerNote] = useState('');

  // Vocabulary audio state & learned check
  const [speakingVocabId, setSpeakingVocabId] = useState<string | null>(null);
  const [learnedVocab, setLearnedVocab] = useState<Record<string, boolean>>({});

  // Reading Text-to-Speech state
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.9); // gentle 0.9x for ESL B1
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);

  // Section 4 Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [hasCheckedQuiz, setHasCheckedQuiz] = useState(false);

  // Section 5 Writing Task state
  const [paragraphText, setParagraphText] = useState('');
  const [hasCopiedParagraph, setHasCopiedParagraph] = useState(false);
  const [studentName, setStudentName] = useState('');

  // Section 6 Padlet URL state
  const [padletUrl, setPadletUrl] = useState('');

  // Section 7 Student Self-Assessment Rubric Checklist
  const [rubricChecks, setRubricChecks] = useState({
    mainIdea: false,
    supportingDetails: false,
    paragraphLength: false,
    padletShared: false,
  });

  // Back to top visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Active section for sticky progress indicator
  const [scrollProgress, setScrollProgress] = useState(0);

  // Timer effect for 2-minute discussion
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playSoftChime();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Scroll listener for back to top button & overall reading progress
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setShowBackToTop(winScroll > 320);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update rubric check automatically when paragraph qualifies
  const sentenceCount = countSentences(paragraphText);
  const wordCount = countWords(paragraphText);

  useEffect(() => {
    if (sentenceCount >= 4 && sentenceCount <= 7) {
      setRubricChecks((prev) => ({ ...prev, paragraphLength: true }));
    }
  }, [sentenceCount]);

  useEffect(() => {
    if (selectedQuizOption === 'opt-b' && hasCheckedQuiz) {
      setRubricChecks((prev) => ({ ...prev, mainIdea: true }));
    }
  }, [selectedQuizOption, hasCheckedQuiz]);

  // Cancel any ongoing speech when unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format time mm:ss
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Speak vocabulary item
  const speakVocabulary = (vocab: VocabWord) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported by your browser.');
      return;
    }
    window.speechSynthesis.cancel();
    setSpeakingVocabId(vocab.id);

    const utterance = new SpeechSynthesisUtterance(`${vocab.word}. ${vocab.definition}. Example: ${vocab.example}`);
    utterance.rate = 0.88;
    utterance.lang = 'en-US';

    utterance.onend = () => setSpeakingVocabId(null);
    utterance.onerror = () => setSpeakingVocabId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Read aloud the entire article with sentence highlighting
  const handleToggleArticleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      setActiveSentenceIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    setIsReadingAloud(true);

    let currentIdx = 0;

    const speakSentence = (index: number) => {
      if (index >= ARTICLE_SENTENCES.length) {
        setIsReadingAloud(false);
        setActiveSentenceIndex(null);
        return;
      }

      setActiveSentenceIndex(index);
      const text = ARTICLE_SENTENCES[index];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        currentIdx++;
        speakSentence(currentIdx);
      };

      utterance.onerror = () => {
        setIsReadingAloud(false);
        setActiveSentenceIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakSentence(currentIdx);
  };

  // Stop article reading
  const handleStopReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsReadingAloud(false);
    setActiveSentenceIndex(null);
  };

  // Insert sentence starter into paragraph
  const handleInsertStarter = (starterText: string) => {
    setParagraphText((prev) => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) {
        return starterText + ' ';
      }
      return `${cleanPrev} ${starterText} `;
    });
  };

  // Copy paragraph to clipboard
  const handleCopyParagraph = async () => {
    if (!paragraphText.trim()) return;
    try {
      await navigator.clipboard.writeText(paragraphText);
      setHasCopiedParagraph(true);
      setTimeout(() => setHasCopiedParagraph(false), 3500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = paragraphText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setHasCopiedParagraph(true);
      setTimeout(() => setHasCopiedParagraph(false), 3500);
    }
  };

  // Open Padlet board
  const handleOpenPadlet = () => {
    const targetUrl = padletUrl.trim();
    if (!targetUrl) {
      alert('Please enter or check the Padlet URL before opening the board.');
      return;
    }
    setRubricChecks((prev) => ({ ...prev, padletShared: true }));
    let formatted = targetUrl;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'https://' + formatted;
    }
    window.open(formatted, '_blank', 'noopener,noreferrer');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2d3748] font-sans pb-24">
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-[#e5dfd5] z-50">
        <div
          className="h-full bg-gradient-to-r from-[#4a7c59] via-[#3b82a6] to-[#c86d51] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Header / Hero Banner */}
      <header className="relative bg-gradient-to-b from-[#eaf2f8] via-[#f4f7f5] to-[#faf8f5] border-b border-[#e2ddd5] pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Level Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#dbece1] text-[#2d5c3d] text-xs sm:text-sm font-semibold tracking-wide uppercase shadow-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-[#3e7e54] animate-pulse" />
            ESL Reading & Writing • Level B1 (Intermediate • Ages 15–16)
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1e3a4c] tracking-tight font-heading leading-tight mb-4">
            The Importance of Writing Every Day
          </h1>

          <p className="text-base sm:text-lg text-[#4a5568] max-w-2xl mx-auto mb-8 font-medium">
            Explore how regular writing improves your English fluency, clarifies your thoughts, and helps you express yourself with confidence.
          </p>

          {/* Lesson Objectives Card */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-5 sm:p-6 shadow-sm border border-[#d6e2e9] text-left max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3 text-[#2c5282]">
              <Sparkles className="w-5 h-5 text-[#3b82a6]" />
              <h2 className="text-base sm:text-lg font-bold font-heading text-[#1e3a4c]">
                Today's Lesson Objectives
              </h2>
            </div>
            <ul className="space-y-2.5 text-sm sm:text-base text-[#374151]">
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#e8f3ee] text-[#2d6a4f] flex items-center justify-center font-bold text-xs mt-0.5">
                  1
                </span>
                <span>
                  Students will read a short article and identify the <strong>main idea</strong> and <strong>three supporting details</strong> with 80% accuracy.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#eaf2f8] text-[#2b6cb0] flex items-center justify-center font-bold text-xs mt-0.5">
                  2
                </span>
                <span>
                  Students will write a <strong>4–5 sentence paragraph</strong> about their own writing habits and post it on Padlet.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main Single Page Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-16">

        {/* =========================================================================
            SECTION 1 — WARM-UP
        ========================================================================= */}
        <section id="section-1" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9] transition-all">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#fbebe4] text-[#b2553b] text-xs font-bold uppercase tracking-wider">
                Section 1
              </span>
              <span className="text-xs text-[#718096] flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" /> 5 Minutes
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading mb-6 flex items-center gap-3">
              Warm-Up Discussion
            </h2>

            {/* Illustration & Questions Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Warm Journal Illustration */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="relative w-full rounded-2xl overflow-hidden border border-[#e2ddd5] shadow-sm bg-[#f9f7f4] group">
                  <img
                    src={journalHeroImage}
                    alt="A student writing warmly in a personal journal with tea and books"
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-102"
                  />
                  <div className="p-2.5 bg-gradient-to-t from-[#2c3e50]/80 to-transparent absolute bottom-0 inset-x-0 text-white text-xs text-center font-medium">
                    Daily journaling inspires clearer thoughts
                  </div>
                </div>
              </div>

              {/* Discussion Questions */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-[#2d3748] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#4a7c59]" />
                    Think about these questions:
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#f7fafc] border border-[#e2e8f0] flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4a7c59] text-white flex items-center justify-center font-bold text-xs mt-0.5">
                        1
                      </span>
                      <p className="text-base font-medium text-[#2d3748]">
                        Do you write every day?
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#f7fafc] border border-[#e2e8f0] flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3b82a6] text-white flex items-center justify-center font-bold text-xs mt-0.5">
                        2
                      </span>
                      <p className="text-base font-medium text-[#2d3748]">
                        What do you write about?
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#f7fafc] border border-[#e2e8f0] flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#c86d51] text-white flex items-center justify-center font-bold text-xs mt-0.5">
                        3
                      </span>
                      <p className="text-base font-medium text-[#2d3748]">
                        Why is writing important?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Partner Note Box & 2-Minute Timer */}
                <div className="p-4 rounded-2xl bg-[#edf5ef] border border-[#cbe4d3]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4a7c59] animate-ping" />
                      <p className="text-sm font-bold text-[#2d6a4f]">
                        Discuss with your partner for 2 minutes.
                      </p>
                    </div>

                    {/* Interactive 2-minute timer */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#b8ddc3] shadow-xs self-start sm:self-auto">
                      <span className="font-mono text-base font-bold text-[#2d6a4f]">
                        {formatTimer(timerSeconds)}
                      </span>
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        aria-label={isTimerRunning ? 'Pause timer' : 'Start 2-minute partner timer'}
                        className="p-1 rounded-lg hover:bg-[#edf5ef] text-[#2d6a4f] transition-colors"
                        title={isTimerRunning ? 'Pause' : 'Start Timer'}
                      >
                        {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerSeconds(120);
                        }}
                        aria-label="Reset timer"
                        className="p-1 rounded-lg hover:bg-[#edf5ef] text-[#718096] transition-colors"
                        title="Reset to 2:00"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Partner discussion scratchpad */}
                  <div className="mt-2">
                    <label htmlFor="partner-notes" className="text-xs font-semibold text-[#4a5568] block mb-1">
                      Quick Partner Notes (Optional):
                    </label>
                    <input
                      id="partner-notes"
                      type="text"
                      value={partnerNote}
                      onChange={(e) => setPartnerNote(e.target.value)}
                      placeholder="e.g., My partner writes in a diary, texts friends, and makes to-do lists..."
                      className="w-full text-sm px-3 py-2 rounded-xl border border-[#cbe4d3] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#4a7c59] text-[#2d3748]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2 — VOCABULARY (5 words)
        ========================================================================= */}
        <section id="section-2" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9]">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#e8f1f5] text-[#2c6588] text-xs font-bold uppercase tracking-wider">
                Section 2
              </span>
              <span className="text-xs text-[#718096] font-medium">5 Key Words</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading">
                Vocabulary
              </h2>
              <p className="text-xs text-[#64748b] bg-[#f8fafc] px-3 py-1.5 rounded-lg border border-[#e2e8f0]">
                Click the speaker <Volume2 className="w-3.5 h-3.5 inline mx-0.5 text-[#3b82a6]" /> to hear pronunciation
              </p>
            </div>
            <p className="text-sm sm:text-base text-[#4a5568] mb-6">
              Review these 5 important vocabulary words before reading the article:
            </p>

            {/* 5 Vocabulary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {VOCAB_LIST.map((vocab, index) => {
                const isSpeaking = speakingVocabId === vocab.id;
                const isMarked = !!learnedVocab[vocab.id];

                return (
                  <div
                    key={vocab.id}
                    className={`rounded-2xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
                      isMarked
                        ? 'bg-[#f4f9f5] border-[#b7dfc3]'
                        : 'bg-[#faf8f5] border-[#e8e0d5] hover:border-[#3b82a6]/40 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Word Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#94a3b8]">{index + 1}.</span>
                          <h3 className="text-xl font-bold text-[#1e3a4c] font-heading">
                            {vocab.word}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#e2e8f0] text-[#475569]">
                            {vocab.pos}
                          </span>
                        </div>

                        {/* Pronunciation Audio Button */}
                        <button
                          onClick={() => speakVocabulary(vocab)}
                          disabled={isSpeaking}
                          aria-label={`Listen to ${vocab.word}`}
                          title={`Listen to pronunciation of ${vocab.word}`}
                          className={`p-2 rounded-xl transition-all ${
                            isSpeaking
                              ? 'bg-[#3b82a6] text-white animate-pulse'
                              : 'bg-white text-[#3b82a6] hover:bg-[#e8f1f5] border border-[#d6e4ec]'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Definition */}
                      <p className="text-sm text-[#334155] mb-3 leading-relaxed">
                        <strong className="text-[#1e293b]">Definition: </strong>
                        {vocab.definition}
                      </p>

                      {/* Example Sentence */}
                      <div className="bg-white/80 rounded-xl p-3 border border-[#e2e8f0] text-sm text-[#475569] italic">
                        <span className="not-italic font-semibold text-xs text-[#64748b] block mb-1 uppercase tracking-wide">
                          Example:
                        </span>
                        "{vocab.example}"
                      </div>
                    </div>

                    {/* Bottom check */}
                    <div className="mt-4 pt-3 border-t border-[#e2e8f0]/80 flex items-center justify-between">
                      <button
                        onClick={() =>
                          setLearnedVocab((prev) => ({
                            ...prev,
                            [vocab.id]: !prev[vocab.id],
                          }))
                        }
                        className="text-xs font-medium text-[#475569] flex items-center gap-1.5 hover:text-[#2d6a4f] transition-colors"
                      >
                        {isMarked ? (
                          <CheckCircle2 className="w-4 h-4 text-[#2d6a4f]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#94a3b8]" />
                        )}
                        <span>{isMarked ? 'Understood' : 'Mark as learned'}</span>
                      </button>
                      <span className="text-[11px] text-[#94a3b8]">B1 Core</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3 — READING
        ========================================================================= */}
        <section id="section-3" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9]">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#edf5ef] text-[#2d6a4f] text-xs font-bold uppercase tracking-wider">
                Section 3
              </span>
              <span className="text-xs text-[#718096] font-medium">Article & Audio</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading">
                  Read the Article
                </h2>
                <p className="text-sm text-[#64748b] mt-1">
                  Read carefully. Notice the vocabulary words and main points.
                </p>
              </div>

              {/* Read Aloud Audio Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleToggleArticleSpeech}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-all ${
                    isReadingAloud
                      ? 'bg-[#c86d51] text-white hover:bg-[#b55c41]'
                      : 'bg-[#3b82a6] text-white hover:bg-[#2f6f90]'
                  }`}
                >
                  {isReadingAloud ? (
                    <>
                      <Pause className="w-4 h-4" /> Pause Reading
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" /> Read Aloud
                    </>
                  )}
                </button>

                {isReadingAloud && (
                  <button
                    onClick={handleStopReading}
                    className="p-2.5 rounded-xl bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
                    title="Stop reading aloud"
                    aria-label="Stop reading aloud"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Speed toggle for ESL learners */}
                <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-xl p-1 text-xs font-semibold text-[#475569]">
                  <button
                    onClick={() => setSpeechRate(0.8)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      speechRate === 0.8 ? 'bg-white text-[#1e293b] shadow-xs' : 'hover:text-[#1e293b]'
                    }`}
                    title="Slower pace for language learning"
                  >
                    0.8x Slow
                  </button>
                  <button
                    onClick={() => setSpeechRate(1.0)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      speechRate === 1.0 ? 'bg-white text-[#1e293b] shadow-xs' : 'hover:text-[#1e293b]'
                    }`}
                  >
                    1.0x Normal
                  </button>
                </div>
              </div>
            </div>

            {/* Article Display Box */}
            <div className="relative bg-[#fbfaf7] border-2 border-[#e6decb] rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#ebd8c5]">
                <div className="flex items-center gap-2 text-[#4a5568]">
                  <FileText className="w-5 h-5 text-[#3b82a6]" />
                  <span className="font-heading font-bold text-base text-[#1e3a4c]">
                    Short Article: The Importance of Writing Every Day
                  </span>
                </div>
                <span className="text-xs bg-[#eaf2f8] text-[#2c6588] px-2.5 py-1 rounded-full font-medium">
                  5 Sentences • 54 Words
                </span>
              </div>

              {/* Article Content with Active Sentence Highlight */}
              <div className="space-y-3.5 text-base sm:text-lg md:text-xl leading-relaxed text-[#2c3e50] font-normal">
                {ARTICLE_SENTENCES.map((sentence, idx) => {
                  const isActive = activeSentenceIndex === idx;
                  return (
                    <p
                      key={idx}
                      className={`transition-all duration-300 px-3 py-1.5 rounded-xl ${
                        isActive
                          ? 'bg-[#d8eaf5] text-[#133852] font-medium shadow-xs border-l-4 border-[#3b82a6]'
                          : 'hover:bg-black/[0.02]'
                      }`}
                    >
                      {/* Highlight vocabulary occurrences subtly */}
                      {sentence}
                    </p>
                  );
                })}
              </div>

              {/* Active Audio State banner */}
              {isReadingAloud && (
                <div className="mt-6 pt-4 border-t border-[#ebd8c5] flex items-center justify-between text-xs text-[#2c6588] font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3b82a6] animate-ping" />
                    Listening to article (Sentence {activeSentenceIndex !== null ? activeSentenceIndex + 1 : 1} of {ARTICLE_SENTENCES.length})...
                  </span>
                  <span>Audio Speech Mode Active</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4 — MAIN IDEA & SUPPORTING DETAILS
        ========================================================================= */}
        <section id="section-4" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9]">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#fbebe4] text-[#b2553b] text-xs font-bold uppercase tracking-wider">
                Section 4
              </span>
              <span className="text-xs text-[#718096] font-medium">Reading Comprehension</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading mb-2">
              Find the Main Idea and Supporting Details
            </h2>
            <p className="text-sm sm:text-base text-[#4a5568] mb-8">
              A <strong>main idea</strong> is the most important message of the text. <strong>Supporting details</strong> give examples, reasons, and explanations that prove the main idea.
            </p>

            {/* Visual Organizer Diagram */}
            <div className="bg-[#fcfaf7] border border-[#e8ded2] rounded-2xl p-6 sm:p-8 mb-10 shadow-xs">
              <div className="text-center mb-6">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#8c6b44] bg-[#f5ecdd] px-3 py-1 rounded-full">
                  Visual Organizer Diagram
                </span>
              </div>

              {/* MAIN IDEA: Top Big Box */}
              <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-gradient-to-r from-[#fff7e6] via-[#fef3c7] to-[#fde68a] border-2 border-[#d97706] rounded-2xl p-5 sm:p-6 shadow-xs text-center relative">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d97706] text-white text-xs font-extrabold uppercase tracking-wide mb-2 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" /> MAIN IDEA
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#78350f] font-heading">
                    "Writing every day has many benefits."
                  </h3>
                  <p className="text-xs text-[#92400e] mt-1 font-medium">
                    (The central point of the entire article)
                  </p>
                </div>

                {/* Connecting arrow down */}
                <div className="flex flex-col items-center my-3">
                  <div className="w-0.5 h-6 bg-[#cbd5e1]" />
                  <div className="text-xs font-bold text-[#64748b] bg-white px-2.5 py-0.5 rounded-full border border-[#cbd5e1]">
                    Supported by 3 key details
                  </div>
                  <div className="w-0.5 h-4 bg-[#cbd5e1]" />
                </div>
              </div>

              {/* SUPPORTING DETAILS: Three Boxes Below */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Detail 1 */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-[#4a7c59] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#edf5ef] text-[#2d6a4f] mb-3">
                      <span>Detail 1</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#1e293b]">
                      "It helps you express your ideas clearly."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#edf2f7] text-xs text-[#64748b]">
                    Explains: <em>clear expression</em>
                  </div>
                </div>

                {/* Detail 2 */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-[#3b82a6] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#e8f1f5] text-[#2c6588] mb-3">
                      <span>Detail 2</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#1e293b]">
                      "It improves your vocabulary and organizes your thoughts."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#edf2f7] text-xs text-[#64748b]">
                    Explains: <em>word skills & order</em>
                  </div>
                </div>

                {/* Detail 3 */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-[#c86d51] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#fbebe4] text-[#b2553b] mb-3">
                      <span>Detail 3</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#1e293b]">
                      "It helps you reflect on your day and understand your feelings."
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#edf2f7] text-xs text-[#64748b]">
                    Explains: <em>reflection & emotions</em>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Quiz */}
            <div className="p-6 rounded-2xl bg-[#f4f7f9] border border-[#d6e2e9]">
              <div className="flex items-center gap-2 mb-2 text-[#1e3a4c]">
                <Layers className="w-5 h-5 text-[#3b82a6]" />
                <h3 className="text-lg font-bold font-heading">
                  Interactive Practice: Click the sentence that is the MAIN IDEA
                </h3>
              </div>
              <p className="text-sm text-[#4a5568] mb-4">
                Select one option below to test your understanding:
              </p>

              <div className="space-y-3">
                {QUIZ_OPTIONS.map((opt, i) => {
                  const isSelected = selectedQuizOption === opt.id;
                  const isCorrectAnswer = opt.isCorrect;

                  let cardStyle = 'bg-white border-[#e2e8f0] hover:border-[#3b82a6] text-[#2d3748]';
                  if (hasCheckedQuiz) {
                    if (isCorrectAnswer) {
                      cardStyle = 'bg-[#edf5ef] border-[#4a7c59] text-[#1c4b2b] shadow-xs ring-2 ring-[#4a7c59]/20';
                    } else if (isSelected && !isCorrectAnswer) {
                      cardStyle = 'bg-[#fef2f2] border-[#ef4444] text-[#991b1b]';
                    } else {
                      cardStyle = 'bg-white/70 border-[#e2e8f0] text-[#64748b] opacity-60';
                    }
                  } else if (isSelected) {
                    cardStyle = 'bg-[#eaf2f8] border-[#3b82a6] text-[#1e3a4c] ring-2 ring-[#3b82a6]/20';
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedQuizOption(opt.id);
                        setHasCheckedQuiz(true);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${cardStyle}`}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold text-xs mt-0.5 text-[#334155]">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm sm:text-base">
                          "{opt.text}"
                        </p>
                        {hasCheckedQuiz && isSelected && (
                          <div className="mt-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                            {isCorrectAnswer ? (
                              <span className="text-[#2d6a4f] flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-[#2d6a4f]" /> {opt.explanation}
                              </span>
                            ) : (
                              <span className="text-[#dc2626] flex items-center gap-1">
                                <XCircle className="w-4 h-4 text-[#dc2626]" /> {opt.explanation}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {hasCheckedQuiz && (
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#e2e8f0]">
                  <p className="text-xs text-[#475569]">
                    {selectedQuizOption === 'opt-b' ? (
                      <span className="text-[#2d6a4f] font-bold">
                        Excellent work! You found the main idea. (3 / 3 Rubric points achieved)
                      </span>
                    ) : (
                      <span className="text-[#c86d51] font-semibold">
                        Notice that Option B tells what the whole paragraph is about. Try again!
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedQuizOption(null);
                      setHasCheckedQuiz(false);
                    }}
                    className="text-xs text-[#3b82a6] hover:underline font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5 — WRITING TASK
        ========================================================================= */}
        <section id="section-5" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9]">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#edf5ef] text-[#2d6a4f] text-xs font-bold uppercase tracking-wider">
                Section 5
              </span>
              <span className="text-xs text-[#718096] font-medium">Independent Practice</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading flex items-center gap-2">
                <PenTool className="w-6 h-6 text-[#4a7c59]" /> Write Your Paragraph
              </h2>
            </div>

            {/* Prompt description */}
            <div className="bg-[#f0f7f3] border-l-4 border-[#4a7c59] p-4 rounded-r-xl mb-6">
              <p className="text-base sm:text-lg font-bold text-[#1e4620]">
                Prompt: "Write a 4-5 sentence paragraph about your own writing habits."
              </p>
              <p className="text-xs sm:text-sm text-[#3b6d44] mt-1">
                You can describe when you write, what you like to write about, how it makes you feel, or how it helps your learning.
              </p>
            </div>

            {/* Sentence Starters */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a5568]">
                  Clickable Sentence Starters (Click to insert):
                </span>
                <span className="text-xs text-[#718096]">5 available</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SENTENCE_STARTERS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleInsertStarter(starter)}
                    className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl bg-[#faf8f5] hover:bg-[#e8f1f5] text-[#2c5282] border border-[#d6e2e9] hover:border-[#3b82a6] transition-all flex items-center gap-1.5 shadow-2xs group"
                  >
                    <span className="text-[#3b82a6] font-bold group-hover:scale-110 transition-transform">+</span>
                    "{starter}"
                  </button>
                ))}
              </div>
            </div>

            {/* Writing Textarea */}
            <div className="relative mb-4">
              <label htmlFor="student-paragraph-input" className="sr-only">
                Your 4-5 sentence paragraph
              </label>
              <textarea
                id="student-paragraph-input"
                rows={6}
                value={paragraphText}
                onChange={(e) => setParagraphText(e.target.value)}
                placeholder="Type your paragraph here (or click any of the sentence starters above)...

For example:
I write every day because it helps me organize my thoughts. When I write in English, I feel more confident in class. Writing helps me remember new vocabulary words. My favorite thing to write about is my daily life and goals. In the future, I want to write essays and stories."
                className="w-full text-base sm:text-lg p-5 rounded-2xl border-2 border-[#e2ddd5] bg-[#fafaf8] focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-[#4a7c59]/20 focus:border-[#4a7c59] transition-all text-[#1a202c] leading-relaxed resize-y font-normal"
              />
            </div>

            {/* Live Counters & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#faf8f5] border border-[#e8e0d5]">
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                {/* Sentence Counter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#64748b] uppercase">Sentences:</span>
                  <span
                    className={`font-mono font-bold text-base px-2.5 py-0.5 rounded-lg border ${
                      sentenceCount >= 4 && sentenceCount <= 5
                        ? 'bg-[#edf5ef] text-[#2d6a4f] border-[#b7dfc3]'
                        : sentenceCount > 5
                        ? 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]'
                        : 'bg-white text-[#b45309] border-[#fde68a]'
                    }`}
                  >
                    {sentenceCount} / 4–5
                  </span>
                </div>

                {/* Word Counter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#64748b] uppercase">Words:</span>
                  <span className="font-mono font-bold text-base px-2.5 py-0.5 rounded-lg bg-white border border-[#e2e8f0] text-[#334155]">
                    {wordCount}
                  </span>
                </div>

                {/* Goal indicator pill */}
                {sentenceCount >= 4 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2d6a4f] bg-[#eaf4ed] px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Target Reached (4-5 Sentences)
                  </span>
                ) : (
                  <span className="text-xs text-[#92400e] bg-[#fef3c7] px-2.5 py-1 rounded-full font-medium">
                    Write at least {4 - sentenceCount} more {4 - sentenceCount === 1 ? 'sentence' : 'sentences'}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {paragraphText.trim() && (
                  <button
                    onClick={() => setParagraphText('')}
                    className="text-xs text-[#94a3b8] hover:text-[#dc2626] px-2 py-1.5 transition-colors font-medium"
                  >
                    Clear text
                  </button>
                )}

                <button
                  onClick={handleCopyParagraph}
                  disabled={!paragraphText.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-xs transition-all ${
                    hasCopiedParagraph
                      ? 'bg-[#2d6a4f] text-white'
                      : !paragraphText.trim()
                      ? 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                      : 'bg-[#3b82a6] hover:bg-[#2c6588] text-white active:scale-98'
                  }`}
                >
                  {hasCopiedParagraph ? (
                    <>
                      <Check className="w-4 h-4 text-white" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy My Paragraph
                    </>
                  )}
                </button>
              </div>
            </div>

            {hasCopiedParagraph && (
              <div className="mt-3 p-3 rounded-xl bg-[#eaf4ed] border border-[#b7dfc3] text-[#2d6a4f] text-xs sm:text-sm font-semibold flex items-center justify-between animate-fadeIn">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Paragraph copied! Now scroll down to Section 6 to paste it on Padlet.
                </span>
                <a
                  href="#section-6"
                  className="underline hover:text-[#1e4620] font-bold"
                >
                  Go to Section 6 &rarr;
                </a>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            SECTION 6 — PADLET
        ========================================================================= */}
        <section id="section-6" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9]">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#fbebe4] text-[#b2553b] text-xs font-bold uppercase tracking-wider">
                Section 6
              </span>
              <span className="text-xs text-[#718096] font-medium">Collaboration</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              {/* Padlet Stylized Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff5480] via-[#fd3f71] to-[#d62854] flex items-center justify-center shadow-md flex-shrink-0">
                <svg
                  className="w-10 h-10 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5S10 17.33 10 16.5V11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5.5zm0-9c0 .83-.67 1.5-1.5 1.5S10 8.33 10 7.5 10.67 6 11.5 6s1.5.67 1.5 1.5z" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading">
                  Share Your Paragraph on Padlet
                </h2>
                <p className="text-sm sm:text-base text-[#4a5568] mt-1">
                  Post your writing to the digital class bulletin board so classmates and the teacher can read it.
                </p>
              </div>
            </div>

            {/* Teacher URL input area with the exact requested placeholder */}
            <div className="bg-[#faf8f5] rounded-2xl p-5 border border-[#e8ded2] mb-8">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="padlet-url-input"
                  className="text-xs sm:text-sm font-bold text-[#1e3a4c] flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4 text-[#ff5480]" />
                  Padlet Board Link (Teacher / Class Link):
                </label>
                <span className="text-[11px] text-[#718096]">
                  Paste class board URL
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    id="padlet-url-input"
                    type="url"
                    value={padletUrl}
                    onChange={(e) => setPadletUrl(e.target.value)}
                    placeholder="[ضع رابط Padlet هنا]"
                    className="w-full text-sm sm:text-base px-4 py-3 rounded-xl border border-[#d6cfc5] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#ff5480] text-[#1a202c]"
                  />
                  {!padletUrl && (
                    <div className="text-[11px] text-[#94a3b8] mt-1 px-1">
                      Teacher: paste your class Padlet URL in the box above (e.g. <code>https://padlet.com/myclass/writing</code>)
                    </div>
                  )}
                </div>

                <button
                  onClick={handleOpenPadlet}
                  className="px-6 py-3 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-[#ff477e] to-[#f43f5e] hover:from-[#e11d48] hover:to-[#be123c] text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" /> Open Padlet Board
                </button>
              </div>
            </div>

            {/* 4 Steps Guide */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-[#1e3a4c] font-heading mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#3b82a6]" />
                Steps to Post Your Work:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="bg-[#fafaf9] rounded-2xl p-4 border border-[#e7e5e4] flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-[#1e3a4c] text-white font-bold text-xs flex items-center justify-center mb-2">
                      1
                    </div>
                    <h4 className="font-bold text-sm text-[#1e293b] mb-1">
                      Copy paragraph
                    </h4>
                    <p className="text-xs text-[#64748b]">
                      Click "Copy My Paragraph" in Section 5 above to copy your sentences.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#2d6a4f] font-semibold">
                    {paragraphText.trim() ? '✓ Ready in clipboard' : 'Type paragraph first'}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#fafaf9] rounded-2xl p-4 border border-[#e7e5e4] flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-[#3b82a6] text-white font-bold text-xs flex items-center justify-center mb-2">
                      2
                    </div>
                    <h4 className="font-bold text-sm text-[#1e293b] mb-1">
                      Open Padlet board
                    </h4>
                    <p className="text-xs text-[#64748b]">
                      Click the pink "Open Padlet Board" button above to view the wall.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#3b82a6] font-semibold">
                    Opens in new tab
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-[#fafaf9] rounded-2xl p-4 border border-[#e7e5e4] flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-[#ff5480] text-white font-bold text-xs flex items-center justify-center mb-2">
                      3
                    </div>
                    <h4 className="font-bold text-sm text-[#1e293b] mb-1">
                      Click the (+) button
                    </h4>
                    <p className="text-xs text-[#64748b]">
                      Look for the round (+) button in the bottom corner of Padlet.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#ff5480] font-semibold">
                    Creates a new sticky note
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-[#fafaf9] rounded-2xl p-4 border border-[#e7e5e4] flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-[#4a7c59] text-white font-bold text-xs flex items-center justify-center mb-2">
                      4
                    </div>
                    <h4 className="font-bold text-sm text-[#1e293b] mb-1">
                      Paste, add name & post
                    </h4>
                    <p className="text-xs text-[#64748b]">
                      Paste your text, type your full name in the subject, and hit Publish.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#f1f5f9] text-[11px] text-[#4a7c59] font-semibold">
                    Full points for sharing!
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Preview Card */}
            {paragraphText.trim() && (
              <div className="p-4 rounded-2xl bg-[#fffbfa] border border-[#fed7aa] mt-4">
                <span className="text-xs font-bold text-[#c2410c] uppercase tracking-wide block mb-2">
                  Preview of your Padlet Note:
                </span>
                <div className="bg-white rounded-xl p-4 border border-[#fed7aa] shadow-xs max-w-lg">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#fef3c7]">
                    <span className="font-bold text-sm text-[#1e293b]">
                      {studentName || 'Student Name'}
                    </span>
                    <span className="text-[10px] text-[#94a3b8]">Padlet Note</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#334155] leading-relaxed italic">
                    "{paragraphText}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            SECTION 7 — ASSESSMENT RUBRIC
        ========================================================================= */}
        <section id="section-7" className="scroll-mt-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#e8e2d9]">
            {/* Section Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-[#e8f1f5] text-[#2c6588] text-xs font-bold uppercase tracking-wider">
                Section 7
              </span>
              <span className="text-xs text-[#718096] font-medium">Grading & Evaluation</span>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <Award className="w-7 h-7 text-[#c86d51]" />
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1e3a4c] font-heading">
                How Your Work Will Be Assessed
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#4a5568] mb-6">
              Review this clear grading rubric. Every task connects directly to today's learning objectives (Total: 10 points).
            </p>

            {/* Rubric Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#e2ddd5] mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f5f1eb] text-[#1e3a4c] border-b border-[#e2ddd5]">
                    <th className="py-3.5 px-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                      Assessment Criteria
                    </th>
                    <th className="py-3.5 px-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-center">
                      Points
                    </th>
                    <th className="py-3.5 px-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider hidden sm:table-cell">
                      Description / Learning Evidence
                    </th>
                    <th className="py-3.5 px-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-center">
                      Self-Check
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9e0] text-sm text-[#334155]">
                  {/* Row 1: Main Idea */}
                  <tr className="hover:bg-[#faf9f6] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#1e293b]">
                      Main Idea
                      <div className="text-xs text-[#64748b] font-normal sm:hidden mt-0.5">
                        Identifies the central message in Section 4.
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-[#3b82a6]">
                      3 pts
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-[#475569] hidden sm:table-cell">
                      Correctly identified the main idea statement with 80%+ comprehension accuracy.
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() =>
                          setRubricChecks((prev) => ({
                            ...prev,
                            mainIdea: !prev.mainIdea,
                          }))
                        }
                        className="inline-flex items-center justify-center p-1 hover:scale-110 transition-transform"
                        title="Check if completed"
                      >
                        {rubricChecks.mainIdea ? (
                          <CheckCircle2 className="w-5 h-5 text-[#2d6a4f]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#cbd5e1]" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Row 2: Supporting Details */}
                  <tr className="hover:bg-[#faf9f6] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#1e293b]">
                      Supporting Details
                      <div className="text-xs text-[#64748b] font-normal sm:hidden mt-0.5">
                        Understands 3 supporting details from the article.
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-[#3b82a6]">
                      3 pts
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-[#475569] hidden sm:table-cell">
                      Reviewed and understood all 3 key supporting details in the visual organizer.
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() =>
                          setRubricChecks((prev) => ({
                            ...prev,
                            supportingDetails: !prev.supportingDetails,
                          }))
                        }
                        className="inline-flex items-center justify-center p-1 hover:scale-110 transition-transform"
                        title="Check if completed"
                      >
                        {rubricChecks.supportingDetails ? (
                          <CheckCircle2 className="w-5 h-5 text-[#2d6a4f]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#cbd5e1]" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Row 3: Paragraph Writing */}
                  <tr className="hover:bg-[#faf9f6] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#1e293b]">
                      Paragraph Writing
                      <div className="text-xs text-[#64748b] font-normal sm:hidden mt-0.5">
                        Writes 4–5 sentences about personal writing habits.
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-[#4a7c59]">
                      2 pts
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-[#475569] hidden sm:table-cell">
                      Wrote a coherent 4–5 sentence paragraph on personal habits using clear grammar and vocabulary.
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() =>
                          setRubricChecks((prev) => ({
                            ...prev,
                            paragraphLength: !prev.paragraphLength,
                          }))
                        }
                        className="inline-flex items-center justify-center p-1 hover:scale-110 transition-transform"
                        title="Check if completed"
                      >
                        {rubricChecks.paragraphLength ? (
                          <CheckCircle2 className="w-5 h-5 text-[#2d6a4f]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#cbd5e1]" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Row 4: Collaboration (Padlet) */}
                  <tr className="hover:bg-[#faf9f6] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#1e293b]">
                      Collaboration (Padlet)
                      <div className="text-xs text-[#64748b] font-normal sm:hidden mt-0.5">
                        Shared the paragraph on the class Padlet board.
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-[#ff5480]">
                      2 pts
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-[#475569] hidden sm:table-cell">
                      Successfully copied and posted paragraph to the collaborative class Padlet board.
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() =>
                          setRubricChecks((prev) => ({
                            ...prev,
                            padletShared: !prev.padletShared,
                          }))
                        }
                        className="inline-flex items-center justify-center p-1 hover:scale-110 transition-transform"
                        title="Check if completed"
                      >
                        {rubricChecks.padletShared ? (
                          <CheckCircle2 className="w-5 h-5 text-[#2d6a4f]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#cbd5e1]" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr className="bg-[#faf6f0] font-bold text-base text-[#1e3a4c]">
                    <td className="py-4 px-4 font-heading">Total Score</td>
                    <td className="py-4 px-4 text-center font-mono text-lg text-[#c86d51]">
                      10 points
                    </td>
                    <td className="py-4 px-4 text-xs sm:text-sm text-[#475569] hidden sm:table-cell">
                      Complete all 4 parts to earn full credit for today's lesson!
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-bold text-[#2d6a4f]">
                      {Object.values(rubricChecks).filter(Boolean).length} / 4 tasks
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Student Success Banner */}
            <div className="p-5 rounded-2xl bg-[#edf5ef] border border-[#cbe4d3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-[#2d6a4f] text-base mb-1">
                  Ready to submit your work?
                </h4>
                <p className="text-xs sm:text-sm text-[#4a5568]">
                  Make sure you have copied your paragraph, shared it on Padlet, and checked off your self-assessment checklist.
                </p>
              </div>
              <button
                onClick={scrollToTop}
                className="px-4 py-2.5 rounded-xl bg-white text-[#2d6a4f] border border-[#b7dfc3] hover:bg-[#fafaf8] font-bold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <ArrowUp className="w-4 h-4" /> Review from Top
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 p-3.5 rounded-full bg-[#1e3a4c] text-white shadow-lg hover:bg-[#2c5282] hover:scale-105 active:scale-95 transition-all z-40 border border-white/20"
          title="Back to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <footer className="mt-20 border-t border-[#e2ddd5] py-8 text-center text-xs text-[#718096]">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-medium text-[#4a5568] mb-1">
            "The Importance of Writing Every Day" • ESL Intermediate Reading & Writing
          </p>
          <p>
            Designed for interactive classroom engagement. No slides, no tabs — pure focused learning.
          </p>
        </div>
      </footer>
    </div>
  );
}
