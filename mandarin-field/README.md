# Mandarin Field · 中文训练场

A standalone personal Mandarin fluency app built for Kent's real work and life. The current baseline is HSK 3, with the main curriculum targeting the HSK 3→4 bridge and real client communication. It does not modify or share runtime code with NX Limit.

Live personal installation: <https://trainnolimit.com/mandarin/>

## Run it

```powershell
cd C:\Users\kentb\nolimit-training\mandarin-field
npm run dev
```

Open `http://127.0.0.1:4310`.

### Turn on AI answer feedback

The speaking studio can securely assess typed or spoken Mandarin with OpenAI. It returns a communicative verdict, corrected Simplified Chinese, tone-mark pinyin, English meaning, a focused explanation, one natural alternative, and the next client reply. Answers that need work pause the conversation and place the correction into the answer box for a deliberate retry.

Copy the example environment file and add your own server key:

```powershell
Copy-Item .env.example .env
# Open .env and replace the placeholder in OPENAI_API_KEY
npm run dev
```

Never name the key `VITE_OPENAI_API_KEY` or put it in browser code. The key is read only by the private Express endpoint. AI requests send the current scenario, up to eight recent practice messages, and the learner's answer; they do not send a name or account identity, and API response storage is disabled. If Wi-Fi drops or the endpoint is not configured, the same activity automatically uses its bundled local feedback and remains usable offline.

The default OpenAI model is `gpt-5.6-terra`; it can be changed through `OPENAI_MODEL`. Production uses the same server:

```powershell
npm run build
npm start
```

Production check:

```powershell
npm run build
```

Progress is stored locally in the browser under `mandarin-field-progress-v1`.

## Prepare for offline travel

The production build is an installable, offline-first web app. It includes 24 lessons, 21 graded stories, 15 role-plays, 28 character families, and 96 spaced-review cards in the application bundle. Conversation simulations can show or hide pinyin, and accept prepared replies typed in either characters or pinyin.

Each character-family member is taught as a sound clue plus a meaning component, then placed in a contextual sentence with highlighted vocabulary, tone-mark pinyin, English translation, and audio. All 112 family words have authored examples rather than placeholder sentences.

For a hosted copy on a phone or tablet:

1. Open the production URL while connected to the internet.
2. Complete or skip placement and wait for **TRAIN PACK · OFFLINE READY** on Today.
3. Add the app to the home screen if the browser offers it.
4. Turn on airplane mode and reopen the app once before leaving, to verify the device has retained it.

For a laptop without a hosted URL, install dependencies before leaving and run:

```powershell
cd C:\Users\kentb\nolimit-training\mandarin-field
npm run dev -- --host 127.0.0.1
```

The local server and all authored content work without an internet connection. Device speech synthesis normally remains available if a Chinese system voice is installed. Browser speech recognition may require a network, so every speaking activity also supports typed answers.

Run the automated checks:

```powershell
npm test
npm run test:e2e
```

The end-to-end suite runs the critical learning and promotion flows at desktop and mobile sizes.

## The learning system

The curriculum is organized around six linked loops:

1. **Place, don't label:** a short diagnostic chooses a starting point. HSK remains a reference rather than forcing every learner through the same path.
2. **Build language islands:** learn compact topics that matter now—client check-ins, coaching cues, pain/soreness, scheduling, climbing, HYROX, and business.
3. **Retrieve before reviewing:** prompts require listening, reading, or producing the answer before revealing it.
4. **Read characters by family:** attach writing to known spoken words, then use phonetic and semantic components to unlock related characters.
5. **Read and listen just above comfort:** stories recycle known chunks and introduce a small amount of new language in context.
6. **Rehearse, receive feedback, repeat:** role-plays turn lesson material into a usable conversational reflex.

The default 30-minute session is:

- 4 minutes: listening and sound discrimination
- 8 minutes: character family + word reading
- 8 minutes: high-value lesson chunks
- 7 minutes: client role-play
- 3 minutes: spaced retrieval
- one real-world client mission

## Levels that must be earned

Field Levels are capability milestones, not activity scores. XP, minutes, and streaks can encourage consistency, but they cannot unlock a promotion. Every level requires all five forms of evidence—lessons, read/listen stories, completed role-plays, character families, and successful spaced recalls—plus an integrated check passed at 75% or better.

| Level | Working target | Integrated proof |
| --- | --- | --- |
| 3 · Working Mandarin | Lead familiar client moments clearly | Run a three-minute client check-in without English |
| 4 · Connected Coach | Sustain and adapt a training conversation | Coach an eight-minute segment and answer follow-up questions |
| 5 · Independent Professional | Discuss nuanced professional topics | Lead a goal review, handle an objection, and summarize the plan |
| 6 · Fluent Operator | Work and socialize with range and personality | Lead a workshop and handle unscripted native-speaker questions |

The Today view identifies the next useful action, Course shows the current level's units and capstone, and Progress exposes every numerical gate, the integrated check, and the complete Level 3–6 roadmap. Level 6 becomes an ongoing mastery standard rather than looping into a nonexistent Level 7.

The current authored content fully supports earning both the Level 3→4 and Level 4→5 promotions. Levels 5–6 have their outcomes, units, cumulative gates, and proof standards defined, but require the additional curriculum listed under “Next content pass” before those higher promotions can be earned honestly.

## Character Engine principles

- Start from a word the learner can hear and say.
- Teach components in productive phonetic families, not as an isolated list of 214 dictionary radicals.
- Learn characters inside words and sentences, not as one-character English definitions.
- Track reading, sound, and production separately.
- Fade pinyin after successful retrieval instead of removing it on a calendar date.
- Prioritize recognition and pinyin typing; add handwriting where it serves a real need.
- Use confusing neighbors together only after one member is stable.

## Speaking and audio

- Chinese playback uses the device's `zh-CN` speech-synthesis voice.
- Speech input uses the browser's Mandarin speech-recognition capability when available; typing remains available everywhere.
- With `OPENAI_API_KEY` configured, the role-play coach uses the private server endpoint and structured AI feedback. The browser never receives the key.
- Without the connection, the deterministic local coach continues the role-play using the authored vocabulary, pinyin, translation, and model answers.
- The integration follows OpenAI's Responses API and Structured Outputs guidance: <https://developers.openai.com/api/docs/guides/structured-outputs>

## Research foundations

- China's Ministry of Education describes the 2021 international Chinese proficiency standard as a framework for teaching, curriculum, testing, and new learning platforms: <https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html>
- Karpicke & Roediger demonstrated that continued retrieval, rather than continued study alone, is critical for long-term retention: <https://doi.org/10.1126/science.1152408>
- Cepeda et al. found that durable retention depends on spacing and that the best interval grows with the desired retention period: <https://pubmed.ncbi.nlm.nih.gov/19076480/>
- Retrieval practice can outperform spoken imitation for foreign vocabulary without reducing pronunciation quality: <https://pubmed.ncbi.nlm.nih.gov/23681928/>
- Beginning non-native Chinese learners can use transparent semantic components while learning characters; orthography-to-pronunciation learning predicts word reading: <https://www.cambridge.org/core/journals/applied-psycholinguistics/article/abs/implicit-use-of-radicals-in-learning-characters-for-nonnative-learners-of-chinese/8A6A403C408E6DCF932ABA32E766C103>
- Experimental instruction in semantic components can help learners infer unfamiliar character meanings in sentence context: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5660119/>
- High-variability phonetic training has been studied specifically for adult learners' Mandarin tone production: <https://eric.ed.gov/?id=EJ1244483>
- A recent extensive-reading meta-analysis reports positive effects across reading, vocabulary, fluency, motivation, writing, and oral proficiency: <https://link.springer.com/article/10.1007/s10648-025-10068-6>
- Current Mandarin products validate useful individual pieces but not this exact integrated system: Mandarin Blueprint combines character sequencing, mnemonics, SRS, sentence practice, shadowing, and personalized “language islands”; Du Chinese specializes in graded read/listen stories; Pleco excels at dictionary lookup, OCR, reader tools, audio, and configurable flashcards; Chinese Zero to Hero provides structured HSK and grammar coverage.

## Current HSK 3–4 pack

- 24 four-phrase lessons covering everyday travel, food, directions, connected grammar, recovery, coaching cues, running, climbing, client relationships, business, and app guidance
- 15 graded stories with Chinese audio, optional full-line pinyin, word support, optional translation, and comprehension checks
- 15 guided/open role-plays spanning train travel, restaurants, directions, client conversations, HYROX, climbing, medical referral, scheduling, and Next Limit
- 16 productive character families containing 64 characters in useful words
- 96 review cards generated from the complete lesson library
- HSK 3 and HSK 4 filters for fast study-session planning

## Next content pass

The current release now contains a complete HSK 3–4 intensive pack. A future advanced-content pass should follow real usage data and add:

- 30 client scenarios at three guidance levels
- multi-speaker natural recordings for tone/listening variability
- 300 coaching chunks and 100 general-life chunks
- 75 high-yield character families
- weekly open speaking assessments
- coach-reviewed recordings for errors that speech recognition cannot reliably score
