import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, AudioLines, BookOpen, BrainCircuit, Check, ChevronRight,
  CircleUserRound, Flame, Headphones, Home, Languages, LockKeyhole, Menu, Mic,
  Pause, Play, RotateCcw, Settings2, Sparkles, Target, Trophy, Volume2, X, Zap,
} from 'lucide-react'
import { characterFamilies, lessons, placementQuestions, reviewCards, scenarios, stories } from './data'
import { getAiStatus, localTutorFeedback, requestTutorFeedback, type TutorFeedback } from './ai'
import { fieldLevels, getFieldLevel, getLevelStatus, requirementLabels } from './leveling'
import { dueCount, useProgress } from './progress'
import { generateStory, glossLine, storyThemes } from './reader'
import { speakChinese, useSpeechRecognition } from './speech'
import type { CharacterFamily, Lesson, Scenario, Story, View } from './types'

const navigation: Array<{ id: View; label: string; chinese: string; icon: typeof Home }> = [
  { id: 'today', label: 'Today', chinese: '今天', icon: Home },
  { id: 'learn', label: 'Course', chinese: '课程', icon: BookOpen },
  { id: 'speak', label: 'Speak', chinese: '开口', icon: Mic },
  { id: 'read', label: 'Stories', chinese: '故事', icon: Headphones },
  { id: 'characters', label: 'Characters', chinese: '汉字', icon: Languages },
  { id: 'review', label: 'Review', chinese: '复习', icon: BrainCircuit },
  { id: 'progress', label: 'Progress', chinese: '进度', icon: Trophy },
]

const cx = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ')
type TutorMessage = { role: 'client' | 'learner'; text: string; pinyin?: string; feedback?: TutorFeedback; pending?: boolean }

function LogoMark() {
  return <div className="brand-mark" aria-hidden="true"><span>中</span><i /></div>
}

function AudioButton({ text, label = 'Listen', subtle = false }: { text: string; label?: string; subtle?: boolean }) {
  return (
    <button className={cx('audio-button', subtle && 'subtle')} onClick={() => speakChinese(text)} aria-label={`Play ${text}`}>
      <Volume2 size={16} /> <span>{label}</span>
    </button>
  )
}

function ProgressRing({ value, size = 54 }: { value: number; size?: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  return <div className="progress-ring" style={{ '--progress': `${clamped * 3.6}deg`, '--size': `${size}px` } as React.CSSProperties}><span>{Math.round(clamped)}%</span></div>
}

function Placement({ onComplete }: { onComplete: (score: number) => void }) {
  const [step, setStep] = useState(-1)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [dailyGoal, setDailyGoal] = useState(30)

  if (step === -1) {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-art"><div className="giant-hanzi">说</div><div className="tone-line one" /><div className="tone-line two" /></div>
        <main className="onboarding-copy">
          <div className="brand-lockup"><LogoMark /><div><strong>MANDARIN FIELD</strong><span>中文训练场</span></div></div>
          <p className="kicker">MANDARIN FOR YOUR REAL LIFE</p>
          <h1>Stop studying Chinese.<br /><em>Start using it.</em></h1>
          <p className="onboarding-lead">Built from your HSK 3 baseline around your clients, your work, and the conversations you actually want to have.</p>
          <div className="method-strip">
            <span><b>01</b> Speak first</span><span><b>02</b> Read by pattern</span><span><b>03</b> Retrieve daily</span>
          </div>
          <button className="primary large" onClick={() => setStep(0)}>Find my starting point <ArrowRight size={19} /></button>
          <button className="text-button" onClick={() => onComplete(2)}>Skip diagnostic · start at HSK 3 bridge</button>
        </main>
      </div>
    )
  }

  if (step >= placementQuestions.length) {
    const level = Math.max(1, Math.min(5, score + 1))
    const labels = ['Foundation 1', 'Foundation 2', 'Working Mandarin 3', 'Independent 4', 'Advanced bridge 5']
    return (
      <div className="placement-page result-page">
        <div className="placement-card result-card">
          <div className="result-seal"><span>{level}</span><small>起点</small></div>
          <p className="kicker">YOUR STARTING POINT</p>
          <h1>{labels[level - 1]}</h1>
          <p>You already have an HSK 3 base. We’ll repair gaps without sending you back to lesson one, then bridge toward longer HSK 4-level listening, reading, and spontaneous client conversations.</p>
          <div className="goal-picker">
            <span>Daily training target</span>
            <div>{[15, 30, 45].map((goal) => <button className={dailyGoal === goal ? 'active' : ''} onClick={() => setDailyGoal(goal)} key={goal}>{goal}<small>min</small></button>)}</div>
          </div>
          <div className="result-plan"><span>YOUR FIRST WEEK · HSK 3→4 BRIDGE</span><b>Client check-ins</b><b>青 character family</b><b>3 guided conversations</b></div>
          <button className="primary large" onClick={() => onComplete(score)}>Build my daily plan <ArrowRight size={19} /></button>
        </div>
      </div>
    )
  }

  const question = placementQuestions[step]
  const answer = (index: number) => {
    if (selected !== null) return
    setSelected(index)
    if (index === question.correct) setScore((value) => value + 1)
    window.setTimeout(() => { setSelected(null); setStep((value) => value + 1) }, 600)
  }

  return (
    <div className="placement-page">
      <div className="placement-top"><div className="brand-lockup compact"><LogoMark /><strong>MANDARIN FIELD</strong></div><span>{step + 1} / {placementQuestions.length}</span></div>
      <div className="placement-track"><i style={{ width: `${((step + 1) / placementQuestions.length) * 100}%` }} /></div>
      <main className="placement-card">
        <p className="kicker">QUICK PLACEMENT · NO PRESSURE</p>
        <h2>{question.prompt}</h2>
        <div className="placement-answers">
          {question.answers.map((item, index) => (
            <button className={cx(selected === index && (index === question.correct ? 'correct' : 'wrong'))} onClick={() => answer(index)} key={item}>
              <span>{String.fromCharCode(65 + index)}</span>{item}{selected === index && <Check size={19} />}
            </button>
          ))}
        </div>
        <p className="placement-note">This checks recognition, grammar, and character awareness. It is not an HSK exam.</p>
      </main>
    </div>
  )
}

function Today({ navigate, progress, openLesson, openFamily }: {
  navigate: (view: View) => void
  progress: ReturnType<typeof useProgress>['progress']
  openLesson: (lesson: Lesson) => void
  openFamily: (family: CharacterFamily) => void
}) {
  const percent = (progress.minutesToday / progress.dailyGoal) * 100
  const levelStatus = getLevelStatus(progress)
  const nextLesson = lessons.find((item) => !progress.completedLessons.includes(item.id)) ?? lessons[0]
  const nextFamily = characterFamilies.find((item) => !progress.masteredFamilies.includes(item.id)) ?? characterFamilies[0]
  const [offlineReady, setOfflineReady] = useState(() => localStorage.getItem('mandarin-field-offline-ready') === 'true')
  useEffect(() => {
    const markReady = () => setOfflineReady(true)
    window.addEventListener('mandarin-field-offline-ready', markReady)
    return () => window.removeEventListener('mandarin-field-offline-ready', markReady)
  }, [])
  return (
    <div className="view today-view">
      <header className="page-header">
        <div><p className="eyebrow">FIELD LEVEL {progress.level} · {levelStatus.definition.hskReference}</p><h1>早上好，Kent。</h1><p>{levelStatus.definition.name}: {levelStatus.definition.promise}</p></div>
        <div className="header-stats"><span><Flame size={17} /> {progress.streak || 1} day streak</span><span><Zap size={17} /> {progress.xp} XP</span></div>
      </header>

      <section className="daily-hero">
        <div className="daily-hero-top">
          <div><p className="eyebrow light">TODAY’S FIELD SESSION</p><h2>Train the language.<br /><em>Use it with a client.</em></h2></div>
          <ProgressRing value={percent} size={76} />
        </div>
        <div className="session-flow">
          <button onClick={() => openLesson(nextLesson)}><span className="step-status ready"><Play size={15} /></span><div><small>{nextLesson.duration} MIN · NEXT</small><b>{nextLesson.title}</b><em>{nextLesson.phrases.length} practical phrases · {nextLesson.level}</em></div><ChevronRight /></button>
          <button onClick={() => openFamily(nextFamily)}><span className="step-status">{nextFamily.anchor}</span><div><small>06 MIN · PATTERN</small><b>Read the {nextFamily.anchor} family</b><em>{nextFamily.members.map((item) => item.char).join(' · ')}</em></div><ChevronRight /></button>
          <button onClick={() => navigate('speak')}><span className="step-status"><Mic size={16} /></span><div><small>10 MIN · SPEAK</small><b>The tired client</b><em>Guided role-play</em></div><ChevronRight /></button>
          <button onClick={() => navigate('review')}><span className="step-status"><BrainCircuit size={16} /></span><div><small>05 MIN · RETRIEVE</small><b>Due review</b><em>Recall, don’t reread</em></div><ChevronRight /></button>
        </div>
      </section>

      <section className="offline-pack-card">
        <div><span>{offlineReady ? 'TRAIN PACK · OFFLINE READY' : 'TRAIN PACK · BUNDLED FOR OFFLINE USE'}</span><h3>HSK 3–4 intensive library</h3><p>{offlineReady ? 'The complete library has been saved on this device for your journey.' : 'Open the production app online once and it will save the complete library on this device.'}</p></div>
        <div className="pack-counts"><span><b>{lessons.length}</b> lessons</span><span><b>{stories.length}</b> stories</span><span><b>{scenarios.length}</b> role-plays</span><span><b>{reviewCards.length}</b> reviews</span></div>
      </section>

      <div className="today-grid">
        <section className="paper-card mission-card">
          <div className="card-heading"><span className="round-icon"><Target size={19} /></span><div><p className="eyebrow">REAL-WORLD MISSION</p><h3>Use it before you forget it.</h3></div></div>
          <blockquote>“今天身体感觉怎么样？”</blockquote><p>Ask one client how their body feels today. Listen for one detail and follow up in Chinese.</p>
          <div className="mission-footer"><AudioButton text="今天身体感觉怎么样？" /><button className="secondary" onClick={() => progress.completedLessons.includes('client-check-in') || openLesson(lessons[0])}>Open phrase set</button></div>
        </section>
        <section className="paper-card compass-card">
          <p className="eyebrow">WEEKLY COMPASS</p><div className="compass-main"><span>12</span><div><b>useful chunks</b><small>of 30 this week</small></div></div>
          <div className="mini-bars"><span><i style={{ width: '72%' }} />Speaking</span><span><i style={{ width: '48%' }} />Listening</span><span><i style={{ width: '38%' }} />Reading</span></div>
          <button className="text-link" onClick={() => navigate('progress')}>See what is getting stronger <ArrowRight size={15} /></button>
        </section>
      </div>
      <button className="level-nudge" onClick={() => navigate('progress')}><div><span>LEVEL {progress.level} PROGRESS</span><b>{Math.round(levelStatus.evidenceRatio * 100)}% of practice evidence collected</b></div><i><em style={{ width: `${levelStatus.evidenceRatio * 100}%` }} /></i><p>{levelStatus.items.filter((item) => !item.complete).length} practice gates remaining · level check {levelStatus.checkPassed ? 'passed' : 'required'}</p><ArrowRight /></button>
    </div>
  )
}

function Course({ progress, openLesson }: { progress: ReturnType<typeof useProgress>['progress']; openLesson: (lesson: Lesson) => void }) {
  const [filter, setFilter] = useState<'All' | 'HSK 3' | 'HSK 4'>('All')
  const currentLevel = getFieldLevel(progress.level)
  const currentUnitIndex = Math.min(currentLevel.units.length - 1, Math.floor(progress.completedLessons.length / 2))
  const currentUnit = currentLevel.units[currentUnitIndex]
  const lessonBand = (lesson: Lesson) => lesson.level.includes('4') ? 'HSK 4' : 'HSK 3'
  const visibleLessons = filter === 'All' ? lessons : lessons.filter((lesson) => lessonBand(lesson) === filter)
  return (
    <div className="view">
      <header className="page-header"><div><p className="eyebrow">YOUR COURSE · PERSONALIZED</p><h1>Build usable Mandarin.</h1><p>Sequenced by what you need to say—not by disconnected vocabulary lists.</p></div><div className="level-chip">FIELD LEVEL <b>{progress.level}</b></div></header>
      <section className="path-banner"><div><span>FIELD LEVEL {progress.level} · {currentLevel.hskReference}</span><h2>{currentLevel.name}</h2><p>{currentLevel.promise}</p></div><div className="path-art">教<small>练</small></div></section>
      <div className="unit-track">{currentLevel.units.map((unit, index) => <div className={cx(index === currentUnitIndex && 'active', index < currentUnitIndex && 'complete', index > currentUnitIndex && 'upcoming')} key={unit.code}><span>{unit.code}</span><b>{unit.title}</b><small>{unit.chinese}</small><p>{unit.outcome}</p></div>)}</div>
      <div className="section-heading"><div><p className="eyebrow">CURRENT UNIT · {currentUnit.code}</p><h2>{currentUnit.title} · {currentUnit.chinese}</h2></div><span>{progress.completedLessons.length} / {lessons.length} core lessons</span></div>
      <div className="content-filter" aria-label="Filter course by level">{(['All', 'HSK 3', 'HSK 4'] as const).map((option) => <button className={filter === option ? 'active' : ''} onClick={() => setFilter(option)} key={option}>{option}{option !== 'All' && <small>{lessons.filter((lesson) => lessonBand(lesson) === option).length}</small>}</button>)}</div>
      <div className="lesson-list">
        {visibleLessons.map((lesson) => {
          const index = lessons.indexOf(lesson)
          const complete = progress.completedLessons.includes(lesson.id)
          return <button className="lesson-row" onClick={() => openLesson(lesson)} key={lesson.id}>
            <span className="lesson-number" style={{ background: complete ? '#285f55' : lesson.accent }}>{complete ? <Check /> : String(index + 1).padStart(2, '0')}</span>
            <div><small>{lesson.eyebrow} · {lesson.duration} MIN</small><h3>{lesson.title}</h3><p>{lesson.chineseTitle} · {lesson.outcome}</p></div>
            <span className={cx('lesson-state', complete && 'complete')}>{complete ? 'REVISIT' : 'START'} <ChevronRight size={18} /></span>
          </button>
        })}
      </div>
    </div>
  )
}

function LessonModal({ lesson, close, complete }: { lesson: Lesson; close: () => void; complete: () => void }) {
  const [index, setIndex] = useState(0)
  const [showPinyin, setShowPinyin] = useState(true)
  const phrase = lesson.phrases[index]
  const final = index === lesson.phrases.length - 1
  return (
    <div className="modal-backdrop"><div className="lesson-modal">
      <div className="modal-top"><button onClick={close}><X /></button><span>{lesson.eyebrow}</span><span>{index + 1} / {lesson.phrases.length}</span></div>
      <div className="lesson-progress"><i style={{ width: `${((index + 1) / lesson.phrases.length) * 100}%` }} /></div>
      <main className="phrase-stage">
        <div className="phrase-stage-heading"><p>{lesson.chineseTitle}</p><button onClick={() => setShowPinyin((value) => !value)}>{showPinyin ? 'Hide pinyin' : 'Show pinyin'}</button></div>
        <button className="giant-phrase" onClick={() => speakChinese(phrase.hanzi)}>{phrase.hanzi}<Volume2 size={22} /></button>
        <p className={cx('phrase-pinyin', !showPinyin && 'hidden')}>{phrase.pinyin}</p>
        <p className="phrase-english">{phrase.english}</p>
        {phrase.note && <div className="coach-note"><Sparkles size={17} /><p><b>Why it sounds natural</b>{phrase.note}</p></div>}
        <div className="retrieval-prompt"><span>RETRIEVE IT</span><p>Look away. Say the Chinese from the English, then listen once.</p><AudioButton text={phrase.hanzi} label="Hear native pace" /></div>
      </main>
      <footer className="modal-footer"><button className="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ArrowLeft /> Back</button><button className="primary" onClick={() => final ? (complete(), close()) : setIndex((value) => value + 1)}>{final ? 'Finish lesson' : 'Next phrase'} <ArrowRight /></button></footer>
    </div></div>
  )
}

function SpeakView({ progress, actions }: { progress: ReturnType<typeof useProgress>['progress']; actions: ReturnType<typeof useProgress>['actions'] }) {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const speech = useSpeechRecognition()
  const [typed, setTyped] = useState('')
  const [turn, setTurn] = useState(0)
  const [checking, setChecking] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ available: boolean; model: string }>({ available: false, model: '' })
  const [scenarioFilter, setScenarioFilter] = useState<'All' | 'Guided' | 'Open'>('All')
  const [showConversationPinyin, setShowConversationPinyin] = useState(true)
  const visibleScenarios = scenarioFilter === 'All' ? scenarios : scenarios.filter((item) => item.level === scenarioFilter)

  useEffect(() => {
    let active = true
    void getAiStatus().then((status) => active && setAiStatus(status))
    return () => { active = false }
  }, [])

  const startScenario = (item: Scenario) => {
    setScenario(item); setMessages([{ role: 'client', text: item.coachOpening.hanzi, pinyin: item.coachOpening.pinyin }]); setTurn(0); setTyped(''); speech.clear()
    window.setTimeout(() => speakChinese(item.coachOpening.hanzi), 250)
  }
  const send = async (raw?: string) => {
    if (!scenario || checking) return
    const text = (raw ?? speech.transcript ?? typed).trim()
    if (!text) return
    const replies = [
      { hanzi: '我昨晚只睡了六个小时。我们今天可以练轻一点吗？', pinyin: 'Wǒ zuówǎn zhǐ shuì le liù ge xiǎoshí. Wǒmen jīntiān kěyǐ liàn qīng yìdiǎn ma?' },
      { hanzi: '这样感觉好多了。这个动作要做几组？', pinyin: 'Zhèyàng gǎnjué hǎo duō le. Zhège dòngzuò yào zuò jǐ zǔ?' },
      { hanzi: '明白了。我会注意动作，不追求速度。', pinyin: 'Míngbai le. Wǒ huì zhùyì dòngzuò, bù zhuīqiú sùdù.' },
    ]
    const fallbackReply = replies[Math.min(turn, replies.length - 1)]
    const history = messages.map(({ role, text: messageText }) => ({ role, text: messageText }))
    setChecking(true)
    setTyped('')
    speech.clear()
    setMessages((current) => [...current, { role: 'learner', text, pending: true }])

    let feedback: TutorFeedback
    try {
      feedback = await requestTutorFeedback({ scenario, answer: text, history, level: progress.level })
      setAiStatus((current) => ({ ...current, available: true }))
    } catch {
      feedback = localTutorFeedback(scenario, text, fallbackReply.hanzi)
      setAiStatus({ available: false, model: '' })
    }

    setMessages((current) => current.map((message, index) => index === current.length - 1 && message.pending
      ? { ...message, pending: false, feedback }
      : message))

    if (feedback.source === 'ai' && feedback.verdict === 'needs_work') {
      actions.addStudy(1, 5)
      setChecking(false)
      return
    }

    const reply = feedback.nextReply || fallbackReply.hanzi
    setMessages((current) => [...current, { role: 'client', text: reply, pinyin: feedback.nextReplyPinyin || fallbackReply.pinyin }])
    setTurn((value) => value + 1)
    actions.addStudy(2, 12)
    setChecking(false)
    window.setTimeout(() => speakChinese(reply), 350)
  }

  if (scenario) {
    return (
      <div className="view speak-session">
        <header className="speak-top"><button onClick={() => setScenario(null)}><ArrowLeft /></button><div><small>ROLE-PLAY · {scenario.level}</small><h2>{scenario.chineseTitle}</h2></div><span className={cx('live-pill', aiStatus.available && 'ai-online')}><i /> {aiStatus.available ? 'AI TUTOR' : 'LOCAL MODE'}</span></header>
        <div className="scenario-context"><span>{scenario.setting}</span><p>Your goal: {scenario.description}</p><button className={showConversationPinyin ? 'active' : ''} onClick={() => setShowConversationPinyin((value) => !value)}>拼 Pinyin {showConversationPinyin ? 'ON' : 'OFF'}</button></div>
        <div className="conversation">
          {messages.map((message, index) => <div className={cx('message', message.role)} key={`${message.role}-${index}`}>
            <span>{message.role === 'client' ? '客户' : '你'}</span><div><p>{message.text}</p>{showConversationPinyin && message.pinyin && <small className="message-pinyin">{message.pinyin}</small>}{message.role === 'client' && <button onClick={() => speakChinese(message.text)}><Volume2 size={15} /></button>}</div>{message.pending && <small className="ai-checking"><Sparkles size={13} /> AI tutor is checking meaning, grammar, and naturalness…</small>}{message.feedback && <div className={cx('tutor-feedback', message.feedback.verdict)}><header><span>{message.feedback.verdict === 'correct' ? 'CORRECT' : message.feedback.verdict === 'understandable' ? 'UNDERSTANDABLE' : 'TRY ONE CORRECTION'}</span><em>{message.feedback.source === 'ai' ? 'AI FEEDBACK' : 'OFFLINE FALLBACK'}</em></header><p className="feedback-strength"><Check size={14} /> {message.feedback.strengths}</p><div className="feedback-answer"><small>NATURAL ANSWER</small><b>{message.feedback.correctedChinese}</b><span>{message.feedback.pinyin}</span><em>{message.feedback.english}</em><button onClick={() => speakChinese(message.feedback!.correctedChinese)}><Volume2 size={15} /> Listen</button></div><p className="feedback-explanation"><b>Why</b>{message.feedback.explanation}</p><p className="feedback-alternative"><b>Also natural</b>{message.feedback.nativeAlternative}</p>{message.feedback.verdict === 'needs_work' && <button className="retry-button" onClick={() => { setTyped(message.feedback!.correctedChinese); speakChinese(message.feedback!.correctedChinese) }}><RotateCcw size={15} /> Put the correction in the answer box and retry</button>}</div>}
          </div>)}
        </div>
        <div className="reply-coach"><span>USEFUL NEXT MOVES · TAP TO USE HANZI, OR TYPE THE PINYIN</span><div>{scenario.suggestedReplies.map((reply) => <button onClick={() => { setTyped(reply.hanzi); speakChinese(reply.hanzi) }} key={reply.hanzi}>{reply.hanzi}{showConversationPinyin && <small className="reply-pinyin">{reply.pinyin}</small>}<small>{reply.english}</small></button>)}</div></div>
        {turn >= 2 && <div className="scenario-complete"><div><Check size={18} /><p><b>You completed the conversational arc.</b><span>This counts toward your Level {progress.level} speaking evidence.</span></p></div><button className="primary" onClick={() => { actions.completeScenario(scenario.id); setScenario(null) }}>{progress.completedScenarios.includes(scenario.id) ? 'Practice recorded' : 'Complete role-play'} <ArrowRight /></button></div>}
        <div className="speech-composer">
          <textarea disabled={checking} value={speech.transcript || typed} onChange={(event) => setTyped(event.target.value)} placeholder={checking ? 'Checking your Mandarin…' : 'Speak, or type Chinese / pinyin…'} />
          {speech.supported ? <button disabled={checking} className={cx('mic-button', speech.listening && 'recording')} onClick={speech.listening ? speech.stop : speech.start}>{speech.listening ? <Pause /> : <Mic />}</button> : <span className="speech-fallback">Typing mode</span>}
          <button disabled={checking} className="send-button" onClick={() => void send(speech.transcript || typed)}>{checking ? <Sparkles /> : <ArrowRight />}</button>
        </div>
        <p className="privacy-note">Speech recognition is handled by your browser. When AI is ready, your reply and this scenario are sent securely for feedback; your API key stays on the server. Local feedback remains available offline.</p>
      </div>
    )
  }

  return (
    <div className="view">
      <header className="page-header"><div><p className="eyebrow">SPEAKING STUDIO</p><h1>Rehearse the real moment.</h1><p>Type or speak a reply. The AI tutor checks meaning, grammar, naturalness, and gives you a correction with pinyin.</p></div><span className={cx('speech-ready', aiStatus.available && 'ai-online')}><Sparkles /> {aiStatus.available ? 'AI FEEDBACK READY' : 'LOCAL FALLBACK READY'}</span></header>
      <section className="speak-hero"><div className="waveform"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><p>Today’s focus</p><h2>Ask. Listen. Adjust.</h2><span>Build the reflex to ask one clean question at a time.</span></section>
      <div className="section-heading compact-heading"><div><p className="eyebrow">{scenarios.length} REAL-WORLD SCENARIOS</p><h2>Choose the pressure you want to rehearse.</h2></div></div>
      <div className="content-filter" aria-label="Filter speaking scenarios">{(['All', 'Guided', 'Open'] as const).map((option) => <button className={scenarioFilter === option ? 'active' : ''} onClick={() => setScenarioFilter(option)} key={option}>{option}{option !== 'All' && <small>{scenarios.filter((item) => item.level === option).length}</small>}</button>)}</div>
      <div className="scenario-grid">{visibleScenarios.map((item) => { const index = scenarios.indexOf(item); return <button className="scenario-card" onClick={() => startScenario(item)} key={item.id}><span className="scenario-index">{String(index + 1).padStart(2, '0')}</span><div><small>{item.setting}</small><h3>{item.title}</h3><p>{item.chineseTitle}</p><em>{item.description}</em></div><span className="scenario-start"><Mic size={17} /> Start</span></button> })}</div>
      <section className="paper-card language-islands"><div><p className="eyebrow">YOUR LANGUAGE ISLANDS</p><h3>Fluent where it matters first.</h3><p>These are compact topics you can already talk about without translating every word.</p></div><div className="island-map"><span className="strong">Training<small>72%</small></span><span>Climbing<small>45%</small></span><span>Business<small>31%</small></span><span>Daily life<small>28%</small></span></div></section>
    </div>
  )
}

function StoriesView({ progress, availableStories, openStory, openGenerator }: { progress: ReturnType<typeof useProgress>['progress']; availableStories: Story[]; openStory: (story: Story) => void; openGenerator: () => void }) {
  const [filter, setFilter] = useState<'All' | 'HSK 3' | 'HSK 4'>('All')
  const storyBand = (story: Story) => story.level.includes('4') ? 'HSK 4' : 'HSK 3'
  const visibleStories = filter === 'All' ? availableStories : availableStories.filter((story) => storyBand(story) === filter)
  return <div className="view"><header className="page-header"><div><p className="eyebrow">GRADED INPUT</p><h1>Read what you can almost understand.</h1><p>Hover or tap any word for meaning. Keep pinyin beneath the characters whenever you want it.</p></div><button className="primary" onClick={openGenerator}><Sparkles /> Generate a story</button></header><div className="featured-story" onClick={() => openStory(availableStories[0])}><div><span>FEATURED · 5 MIN</span><h2>第一次<br />训练</h2><p>A client’s first session</p><button className="primary">Read & listen <ArrowRight /></button></div><div className="story-ink"><span>练</span><i>01</i></div></div><div className="section-heading"><div><p className="eyebrow">YOUR READING SHELF</p><h2>Built from language you are learning.</h2></div><span>{availableStories.length} STORIES · PINYIN ALWAYS AVAILABLE</span></div><div className="content-filter" aria-label="Filter stories by level">{(['All', 'HSK 3', 'HSK 4'] as const).map((option) => <button className={filter === option ? 'active' : ''} onClick={() => setFilter(option)} key={option}>{option}{option !== 'All' && <small>{availableStories.filter((story) => storyBand(story) === option).length}</small>}</button>)}</div><div className="story-grid">{visibleStories.map((story) => <button className="story-card" onClick={() => openStory(story)} key={story.id}><div className="story-cover"><span>{story.chineseTitle.slice(0, 2)}</span><i>{story.tags[0]}</i>{progress.completedStories.includes(story.id) && <b><Check /> READ</b>}</div><div><small>{story.level} · {story.minutes} MIN</small><h3>{story.title}</h3><p>{story.chineseTitle}</p><em>{story.description}</em></div></button>)}</div></div>
}

function StoryModal({ story, close, complete }: { story: Story; close: () => void; complete: () => void }) {
  const [pinyin, setPinyin] = useState(true)
  const [translation, setTranslation] = useState(false)
  const [answer, setAnswer] = useState<number | null>(null)
  const readAll = () => speakChinese(story.lines.map((line) => line.hanzi).join('。'), 0.78)
  return <div className="modal-backdrop"><div className="reader-modal"><header><button onClick={close}><X /></button><div><small>{story.level} · {story.minutes} MIN</small><h2>{story.chineseTitle}</h2><p>{story.title}</p></div><button className="audio-button" onClick={readAll}><Play /> Play story</button></header><div className="reader-controls"><button className={pinyin ? 'active' : ''} onClick={() => setPinyin((value) => !value)}>拼 Pinyin {pinyin ? 'ON' : 'OFF'}</button><button className={translation ? 'active' : ''} onClick={() => setTranslation((value) => !value)}>EN Translation</button><span>Hover or tap a word for meaning</span></div><main className="story-lines">{story.lines.map((line) => <article key={line.id}><span>{line.id.replace(/\D/g, '').padStart(2, '0')}</span><div><p className={cx('annotated-line', pinyin && 'show-pinyin')}>{glossLine(line.hanzi).map((token, index) => token.punctuation ? <span className="punctuation" key={`${token.text}-${index}`}>{token.text}</span> : <button className="gloss-word" onClick={() => speakChinese(token.text)} key={`${token.text}-${index}`}><ruby>{token.text}{pinyin && <rt>{token.fallback ? '' : token.pinyin}</rt>}</ruby><i><b>{token.text}</b><em>{token.fallback ? 'See full-line pinyin' : token.pinyin}</em><small>{token.meaning}</small></i></button>)}</p>{pinyin && <small className="line-pinyin-full">{line.pinyin}</small>}{translation && <small className="line-translation">{line.english}</small>}</div><button className="line-audio" onClick={() => speakChinese(line.hanzi)}><Volume2 /></button></article>)}</main><section className="comprehension"><p className="eyebrow">CHECK THE MEANING</p><h3>{story.question}</h3><div>{story.answers.map((item, index) => <button className={cx(answer === index && (index === story.correctAnswer ? 'correct' : 'wrong'))} onClick={() => setAnswer(index)} key={item}>{item}</button>)}</div>{answer === story.correctAnswer && <button className="primary" onClick={() => { complete(); close() }}>Complete story <Check /></button>}</section></div></div>
}

function StoryGenerator({ close, create }: { close: () => void; create: (theme: string, level: 'HSK 3' | 'HSK 3→4') => void }) {
  const [theme, setTheme] = useState('training')
  const [level, setLevel] = useState<'HSK 3' | 'HSK 3→4'>('HSK 3')
  return <div className="modal-backdrop"><div className="generator-modal"><header><button onClick={close}><X /></button><div><small>PERSONAL STORY LAB</small><h2>Generate something worth reading.</h2><p>New stories reuse your known language and limit unfamiliar words.</p></div><span className="generator-mark">文</span></header><main><p className="eyebrow">CHOOSE A WORLD</p><div className="theme-grid">{storyThemes.map((item) => <button className={theme === item.id ? 'active' : ''} onClick={() => setTheme(item.id)} key={item.id}><span>{item.chinese}</span><b>{item.label}</b></button>)}</div><p className="eyebrow">CHOOSE THE CHALLENGE</p><div className="level-options"><button className={level === 'HSK 3' ? 'active' : ''} onClick={() => setLevel('HSK 3')}><b>Comfortable</b><span>HSK 3 · roughly 95% familiar</span></button><button className={level === 'HSK 3→4' ? 'active' : ''} onClick={() => setLevel('HSK 3→4')}><b>Stretch</b><span>HSK 3→4 · controlled new language</span></button></div><div className="generator-settings"><span><Check /> Pinyin available</span><span><Check /> Hover definitions</span><span><Check /> Comprehension check</span><span><Check /> Chinese audio</span></div></main><footer><button className="secondary" onClick={close}>Cancel</button><button className="primary" onClick={() => create(theme, level)}><Sparkles /> Generate & read</button></footer></div></div>
}

function CharactersView({ progress, openFamily }: { progress: ReturnType<typeof useProgress>['progress']; openFamily: (family: CharacterFamily) => void }) {
  return <div className="view"><header className="page-header"><div><p className="eyebrow">THE CHARACTER ENGINE</p><h1>See the system, not the strokes.</h1><p>Attach written patterns to words you can say. Pinyin fades as recognition strengthens.</p></div><div className="character-stat"><b>{progress.masteredFamilies.length * 4 + 26}</b><span>characters<br />recognized</span></div></header><section className="character-method"><div><span>01</span><b>Anchor the sound</b><p>Start with a familiar spoken word.</p></div><i /><div><span>02</span><b>Read the components</b><p>One hints at sound; one narrows meaning.</p></div><i /><div><span>03</span><b>Meet it in a word</b><p>Characters live inside useful chunks.</p></div><i /><div><span>04</span><b>Retrieve it later</b><p>Pinyin disappears over time.</p></div></section><div className="section-heading"><div><p className="eyebrow">PHONETIC FAMILIES</p><h2>One pattern unlocks a neighborhood.</h2></div><span>{characterFamilies.length} families ready</span></div><div className="family-grid">{characterFamilies.map((family) => <button className="family-card" onClick={() => openFamily(family)} key={family.id}><div className="family-anchor"><span>{family.anchor}</span><small>{family.sound}</small></div><div><small>SOUND FAMILY</small><h3>{family.members.map((member) => member.char).join(' · ')}</h3><p>{family.hint}</p><em>{progress.masteredFamilies.includes(family.id) ? 'MASTERED · REVIEW' : 'LEARN FAMILY'} <ArrowRight /></em></div></button>)}</div><section className="pinyin-fade paper-card"><div><p className="eyebrow">PINYIN FADE</p><h3>Support should disappear.</h3><p>New phrases begin with pinyin. After two successful recalls it becomes tap-to-reveal; after four, characters stand alone.</p></div><div><span>今天身体感觉怎么样？</span><i>Jīntiān shēntǐ gǎnjué zěnmeyàng?</i><em>2 recalls until fade</em></div></section></div>
}

function FamilyModal({ family, close, master }: { family: CharacterFamily; close: () => void; master: () => void }) {
  const [selected, setSelected] = useState(0)
  const member = family.members[selected]
  return <div className="modal-backdrop"><div className="family-modal"><header><button onClick={close}><X /></button><div><small>PHONETIC FAMILY</small><h2>{family.anchor} · {family.sound}</h2></div><AudioButton text={member.word} /></header><div className="family-explainer"><div className="family-glyph">{member.char}<span className="component-tag">{member.component}</span></div><div><p className="eyebrow">READ THE BUILD</p><h3>{family.anchor} hints at <em>{family.sound}</em>.</h3><p><b>{member.component}</b> points toward the meaning: <strong>{member.meaning}</strong>.</p><div className="word-example"><span>{member.word}</span><div><b>{member.wordPinyin}</b><small>{member.wordMeaning}</small></div></div></div></div><div className="member-tabs">{family.members.map((item, index) => <button className={index === selected ? 'active' : ''} onClick={() => { setSelected(index); speakChinese(item.char) }} key={item.char}><span>{item.char}</span><small>{item.pinyin}</small></button>)}</div><div className="family-practice"><p>Tap each member. Say its sound before the audio. Notice what changes and what stays stable.</p><button className="primary" onClick={() => { master(); close() }}>Add family to memory <Check /></button></div></div></div>
}

function ReviewView({ progress, actions }: { progress: ReturnType<typeof useProgress>['progress']; actions: ReturnType<typeof useProgress>['actions'] }) {
  const due = useMemo(() => reviewCards.filter((card) => !progress.review[card.id] || progress.review[card.id].due <= new Date().toISOString().slice(0, 10)), [progress.review])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const card = due[index % Math.max(1, due.length)] ?? reviewCards[0]
  const grade = (quality: number) => { actions.reviewCard(card.id, quality); setRevealed(false); setIndex((value) => value + 1) }
  return <div className="view review-view"><header className="page-header"><div><p className="eyebrow">ACTIVE RECALL</p><h1>Make memory do the work.</h1><p>Recognition, listening, and production are scheduled separately around your weak points.</p></div><div className="due-badge"><b>{due.length}</b><span>due<br />today</span></div></header><div className="review-layout"><section className={cx('review-card', revealed && 'revealed')}><div className="review-card-top"><span>{card.type === 'listening' ? <AudioLines /> : <Languages />}{card.type.toUpperCase()}</span><small>{index + 1} / {Math.max(due.length, 1)}</small></div>{card.type === 'listening' ? <button className="listen-prompt" onClick={() => speakChinese(card.hanzi)}><Volume2 /><span>Play the phrase</span></button> : <><p className="review-prompt">Say this naturally in Mandarin:</p><h2>{card.english}</h2></>} {!revealed ? <button className="reveal-button" onClick={() => setRevealed(true)}>Reveal answer</button> : <div className="review-answer"><p>{card.hanzi}</p><span>{card.pinyin}</span><AudioButton text={card.hanzi} /><div className="grade-buttons"><button onClick={() => grade(1)}>Again<small>&lt; 1 min</small></button><button onClick={() => grade(3)}>Hard<small>1 day</small></button><button onClick={() => grade(4)}>Good<small>3 days</small></button><button onClick={() => grade(5)}>Easy<small>7 days</small></button></div></div>}</section><aside className="review-side"><p className="eyebrow">TODAY’S MIX</p><div><span><i style={{ width: '62%' }} />Listening <b>6</b></span><span><i style={{ width: '48%' }} />Speaking <b>8</b></span><span><i style={{ width: '36%' }} />Reading <b>4</b></span></div><blockquote>Rereading feels fluent. Retrieval builds fluency.</blockquote><small>The intervals lengthen only when you can recall, not simply recognize.</small></aside></div></div>
}

function LevelCheck({ level, close, record }: { level: number; close: () => void; record: (score: number) => void }) {
  const definition = getFieldLevel(level)
  const speech = useSpeechRecognition()
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [showReadingPinyin, setShowReadingPinyin] = useState(false)
  const [typed, setTyped] = useState('')
  const [speakingPassed, setSpeakingPassed] = useState(false)
  const tasks = [
    { label: 'LISTENING', title: 'What is the client telling you?', audio: '我昨晚没睡好，今天腿特别重。', answers: ['They slept well and feel ready.', 'They slept poorly and their legs feel heavy.', 'They have shoulder pain.'], correct: 1 },
    { label: 'READING', title: 'Why will the coach adjust the session?', reading: '客户昨晚没睡好，而且今天双腿很重。教练决定先热身，再根据情况调整训练。', pinyin: 'Kèhù zuówǎn méi shuì hǎo, érqiě jīntiān shuāngtuǐ hěn zhòng. Jiàoliàn juédìng xiān rèshēn, zài gēnjù qíngkuàng tiáozhěng xùnliàn.', answers: ['Because the client is under-recovered.', 'Because the client forgot the program.', 'Because the coach is late.'], correct: 0 },
    { label: 'CHARACTER PATTERN', title: 'In 情况, what clue does 忄 contribute?', reading: '情', pinyin: 'qíng', answers: ['A broad connection to feeling or the heart', 'A connection to water', 'The exact pronunciation'], correct: 0 },
  ]
  const answer = (index: number, correct: number) => {
    if (chosen !== null) return
    setChosen(index)
    if (index === correct) setScore((value) => value + 25)
    window.setTimeout(() => { setChosen(null); setStep((value) => value + 1) }, 550)
  }
  const assessSpeaking = () => {
    const response = (speech.transcript || typed).trim()
    const targets = ['睡', '热身', '调整', '感觉', '休息', '情况']
    const hits = targets.filter((target) => response.includes(target))
    const passed = response.length >= 8 && hits.length >= 2
    setSpeakingPassed(passed)
    if (passed) setScore((value) => value + 25)
    window.setTimeout(() => setStep(4), 700)
  }
  if (step === 4) {
    const passed = score >= 75
    return <div className="modal-backdrop"><div className="level-check result"><div className={cx('check-score', passed && 'passed')}><b>{score}</b><span>/ 100</span></div><p className="eyebrow">LEVEL {level} CHECK</p><h2>{passed ? 'Proof collected.' : 'Useful diagnosis—not a failure.'}</h2><p>{passed ? `You demonstrated the minimum integrated ability for ${definition.name}. Promotion still requires durable practice evidence.` : 'Repeat the weak strand after more practice. Your best score is kept, and pinyin remains available while you build reading independence.'}</p><div className="check-summary"><span><Check /> Listening</span><span><Check /> Reading</span><span><Check /> Character patterns</span><span className={speakingPassed ? '' : 'weak'}>{speakingPassed ? <Check /> : <RotateCcw />} Speaking</span></div><button className="primary large" onClick={() => { record(score); close() }}>Save level check <ArrowRight /></button></div></div>
  }
  if (step === 3) {
    return <div className="modal-backdrop"><div className="level-check"><header><button onClick={close}><X /></button><div><small>LEVEL {level} CHECK · 4 OF 4</small><h2>Speaking: respond as the coach</h2></div></header><main><p className="check-instruction">Your client says: “我昨晚没睡好，今天腿特别重。” Respond with a question and a sensible next step.</p><AudioButton text="我昨晚没睡好，今天腿特别重。" label="Hear the client" /><div className="check-speech"><textarea value={speech.transcript || typed} onChange={(event) => setTyped(event.target.value)} placeholder="Speak or type your Mandarin response…" />{speech.supported && <button className={cx(speech.listening && 'recording')} onClick={speech.listening ? speech.stop : speech.start}>{speech.listening ? <Pause /> : <Mic />}</button>}</div><p className="check-hint">A strong answer acknowledges the situation, asks one useful question, or proposes warming up and adjusting.</p></main><footer><button className="primary" disabled={!(speech.transcript || typed).trim()} onClick={assessSpeaking}>Assess response <ArrowRight /></button></footer></div></div>
  }
  const task = tasks[step]
  return <div className="modal-backdrop"><div className="level-check"><header><button onClick={close}><X /></button><div><small>LEVEL {level} CHECK · {step + 1} OF 4</small><h2>{task.label}: {task.title}</h2></div></header><main>{task.audio && <button className="check-listen" onClick={() => speakChinese(task.audio!)}><Volume2 /><span>Play once, then answer</span></button>}{task.reading && <div className="check-reading"><p>{task.reading}</p><button onClick={() => setShowReadingPinyin((value) => !value)}>{showReadingPinyin ? 'Hide pinyin' : 'Show pinyin'}</button>{showReadingPinyin && <span>{task.pinyin}</span>}</div>}<div className="check-answers">{task.answers.map((item, index) => <button className={cx(chosen === index && (index === task.correct ? 'correct' : 'wrong'))} onClick={() => answer(index, task.correct)} key={item}><span>{String.fromCharCode(65 + index)}</span>{item}</button>)}</div></main><footer><small>Pinyin remains available. The check measures what support you currently need.</small></footer></div></div>
}

function ProgressView({ progress, actions, openLevelCheck }: { progress: ReturnType<typeof useProgress>['progress']; actions: ReturnType<typeof useProgress>['actions']; openLevelCheck: () => void }) {
  const status = getLevelStatus(progress)
  const isFinalLevel = progress.level >= 6
  const nextLevel = getFieldLevel(Math.min(6, progress.level + 1))
  return <div className="view"><header className="page-header"><div><p className="eyebrow">YOUR FLUENCY ROADMAP</p><h1>A level means something you can do.</h1><p>Promotion requires durable practice across five strands plus an integrated proof—not XP, streaks, or time alone.</p></div><button className="icon-button"><Settings2 /></button></header><section className="progress-hero level-hero"><div><small>FIELD LEVEL</small><b>{progress.level}</b><span>{status.definition.name.toUpperCase()}<br />{status.definition.chineseName}</span></div><div><p>Your level proof</p><h2>{status.definition.proof}</h2><span><i style={{ width: `${status.evidenceRatio * 100}%` }} /></span><small>{Math.round(status.evidenceRatio * 100)}% of practice evidence · level check {status.checkPassed ? 'passed' : 'still required'}</small></div></section><section className="promotion-panel"><div className="promotion-heading"><div><p className="eyebrow">{isFinalLevel ? 'MASTERY STANDARD' : 'PROMOTION GATES'}</p><h2>{isFinalLevel ? 'Level 6 · ongoing proof' : `Level ${progress.level} → ${progress.level + 1}`}</h2><p>{isFinalLevel ? 'Keep every strand active and periodically re-verify the integrated proof.' : 'Complete every strand, then pass the integrated check with 75% or better.'}</p></div><div className="promotion-percent"><b>{Math.round(status.evidenceRatio * 100)}%</b><span>evidence</span></div></div><div className="gate-grid">{status.items.map((item) => { const label = requirementLabels[item.key]; return <article className={item.complete ? 'complete' : ''} key={item.key}><span>{item.complete ? <Check /> : label.chinese}</span><div><b>{label.label}</b><small>{item.current} / {item.required}</small><i><em style={{ width: `${item.ratio * 100}%` }} /></i></div></article> })}<article className={status.checkPassed ? 'complete' : ''}><span>{status.checkPassed ? <Check /> : '验'}</span><div><b>Integrated level check</b><small>{status.checkPassed ? `Passed · best ${status.bestScore}%` : status.bestScore ? `Best ${status.bestScore}% · need 75%` : 'Not attempted'}</small><button className="text-link" onClick={openLevelCheck}>{status.checkPassed ? 'Retake check' : 'Take level check'} <ArrowRight /></button></div></article></div>{status.ready && !isFinalLevel ? <button className="promote-button" onClick={actions.promoteLevel}><span><Trophy /></span><div><small>ALL EVIDENCE VERIFIED</small><b>Advance to Level {progress.level + 1} · {nextLevel.name}</b></div><ArrowRight /></button> : <div className="promotion-note"><Target /><p><b>{isFinalLevel && status.ready ? 'Mastery verified' : 'Next best action'}</b>{isFinalLevel && status.ready ? 'Maintain your range through real workshops, native media, and periodic reassessment.' : status.items.find((item) => !item.complete) ? `Complete more ${requirementLabels[status.items.find((item) => !item.complete)!.key].label.toLowerCase()}.` : 'Your practice evidence is ready. Take the integrated level check.'}</p></div>}</section><section className="roadmap-section"><div className="section-heading"><div><p className="eyebrow">THE FULL PATH</p><h2>From HSK 3 knowledge to professional fluency.</h2></div></div><div className="level-roadmap">{fieldLevels.filter((item) => item.level >= 3).map((item) => <article className={cx(item.level === progress.level && 'current', item.level < progress.level && 'passed', item.level > progress.level && 'future')} key={item.level}><div className="roadmap-number">{item.level < progress.level ? <Check /> : item.level}</div><div><small>{item.hskReference} · {item.chineseName}</small><h3>{item.name}</h3><p>{item.promise}</p><strong>PROOF: {item.proof}</strong></div>{item.level > progress.level && <LockKeyhole />}</article>)}</div></section><div className="progress-columns"><section className="paper-card settings-card"><p className="eyebrow">TRAINING DOSE</p><h3>{progress.dailyGoal} minutes a day</h3><div>{[15, 30, 45].map((goal) => <button className={progress.dailyGoal === goal ? 'active' : ''} onClick={() => actions.setDailyGoal(goal)} key={goal}>{goal} min</button>)}</div><p>Thirty minutes balances input, output, characters, and review without creating an unsustainable backlog.</p></section><section className="paper-card settings-card"><p className="eyebrow">LOCAL PROFILE</p><h3>Your evidence stays on this device.</h3><p>Reset only if you want to repeat placement and rebuild the progression record from zero.</p><button className="text-link danger" onClick={() => window.confirm('Reset all Mandarin Field progress?') && actions.reset()}><RotateCcw /> Reset local progress</button></section></div></div>
}

function App() {
  const { progress, actions } = useProgress()
  const [view, setView] = useState<View>('today')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [story, setStory] = useState<Story | null>(null)
  const [generatedStories, setGeneratedStories] = useState<Story[]>([])
  const [storyGenerator, setStoryGenerator] = useState(false)
  const [levelCheck, setLevelCheck] = useState(false)
  const [family, setFamily] = useState<CharacterFamily | null>(null)
  const due = dueCount(progress, reviewCards.map((card) => card.id))

  if (!progress.onboarded) return <Placement onComplete={actions.finishPlacement} />

  const renderView = () => {
    if (view === 'today') return <Today navigate={setView} progress={progress} openLesson={setLesson} openFamily={setFamily} />
    if (view === 'learn') return <Course progress={progress} openLesson={setLesson} />
    if (view === 'speak') return <SpeakView progress={progress} actions={actions} />
    if (view === 'read') return <StoriesView progress={progress} availableStories={[...generatedStories, ...stories]} openStory={setStory} openGenerator={() => setStoryGenerator(true)} />
    if (view === 'characters') return <CharactersView progress={progress} openFamily={setFamily} />
    if (view === 'review') return <ReviewView progress={progress} actions={actions} />
    return <ProgressView progress={progress} actions={actions} openLevelCheck={() => setLevelCheck(true)} />
  }

  return (
    <div className="app-shell">
      <aside className={cx('sidebar', mobileMenu && 'open')}>
        <div className="sidebar-brand"><LogoMark /><div><strong>MANDARIN<br />FIELD</strong><span>中文训练场</span></div><button className="mobile-close" onClick={() => setMobileMenu(false)}><X /></button></div>
        <nav>{navigation.map((item) => { const Icon = item.icon; return <button className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setMobileMenu(false) }} key={item.id}><Icon /><span>{item.label}<small>{item.chinese}</small></span>{item.id === 'review' && <em>{due}</em>}</button> })}</nav>
        <div className="sidebar-bottom"><div className="sidebar-goal"><div><span>DAILY FIELDWORK</span><b>{progress.minutesToday} / {progress.dailyGoal} min</b></div><i><em style={{ width: `${Math.min(100, progress.minutesToday / progress.dailyGoal * 100)}%` }} /></i></div><button className="profile-button"><span>K</span><div><b>Kent</b><small>Field level {progress.level}</small></div><CircleUserRound /></button></div>
      </aside>
      <div className="mobile-header"><button onClick={() => setMobileMenu(true)}><Menu /></button><div className="brand-lockup compact"><LogoMark /><strong>MANDARIN FIELD</strong></div><span>{progress.streak || 1}<Flame /></span></div>
      <main className="app-main">{renderView()}</main>
      <nav className="mobile-nav">{navigation.slice(0, 5).map((item) => { const Icon = item.icon; return <button className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)} key={item.id}><Icon /><span>{item.label}</span></button> })}</nav>
      {lesson && <LessonModal lesson={lesson} close={() => setLesson(null)} complete={() => actions.completeLesson(lesson.id, lesson.duration)} />}
      {story && <StoryModal story={story} close={() => setStory(null)} complete={() => actions.completeStory(story.id, story.minutes)} />}
      {storyGenerator && <StoryGenerator close={() => setStoryGenerator(false)} create={(theme, level) => { const next = generateStory(theme, level); setGeneratedStories((current) => [next, ...current]); setStoryGenerator(false); setStory(next) }} />}
      {levelCheck && <LevelCheck level={progress.level} close={() => setLevelCheck(false)} record={(score) => actions.recordLevelCheck(progress.level, score)} />}
      {family && <FamilyModal family={family} close={() => setFamily(null)} master={() => actions.masterFamily(family.id)} />}
    </div>
  )
}

export default App
