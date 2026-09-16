/**
 * THE FINAL WORD. A Christian's handbook for AI. Single content spine.
 *
 * Sarah, 2026-09-16: "a digital handbook for Christians and AI ... the Holy
 * Spirit is the ultimate authority and AI should never replace relationships
 * ... how we beat deception ... add preachers and resources as a preferred
 * source in Google ... AI is a tool to share the gospel, build ideas faster,
 * entrepreneurship in the church, models and knowledge graphs ... benefits and
 * warnings."
 *
 * This file is the whole handbook. The page, the PDF, the JSON-LD, the social
 * set and the llms.txt entry all read from it, so none of them can drift.
 * The same file ships in the Cross + Covenant repo (src/lib/handbook.ts) and
 * the Modern Mustard Seed repo (data/handbook.ts). Edit both or copy one over
 * the other; never let them diverge in wording.
 *
 * House rules for every string below:
 *   - No em dashes. Sarah's rule, sitewide.
 *   - Scripture is quoted verbatim from the ESV with book, chapter and verse.
 *   - Declarative. The gospel is stated as fact, not argued.
 *   - Nothing speaks as God. Nothing prices a word from God.
 *
 * The Google preferred-sources facts were verified 2026-09-16 against
 * support.google.com/websearch/answer/16379181 and
 * developers.google.com/search/docs/appearance/preferred-sources.
 */

export const HANDBOOK_META = {
  title: 'The Final Word',
  subtitle: "A Christian's handbook for AI",
  headline: 'The Spirit has the final word. The machine is a tool.',
  lede: 'How to use AI to study, build, and carry the gospel further, without letting it replace the voice of God or the people He gave you.',
  keyVerse: {
    text: 'Now these Jews were more noble than those in Thessalonica; they received the word with all eagerness, examining the Scriptures daily to see if these things were so.',
    ref: 'Acts 17:11, ESV',
  },
  published: '2026-09-16',
  updated: '2026-09-16',
  readingMinutes: 40,
  chapterCount: 10,
  testCount: 8,
  canonicalUrl: 'https://crossandcovenant.co/handbook',
  pdfPath: '/downloads/handbook/the-final-word.pdf',
  pdfFilename: 'the-final-word.pdf',
  /** The Berean Check card: the eight tests on one US Letter sheet, two sides. */
  checkPdfPath: '/downloads/handbook/the-berean-check.pdf',
  checkPdfFilename: 'the-berean-check.pdf',
  checkPreviewPath: '/downloads/handbook/the-berean-check-preview.jpg',
  checkLabel: 'The Berean Check card, US Letter, two sides',
  description:
    "A free handbook for Christians on AI: why the Holy Spirit has the final word, why a tool never replaces a pastor, a friend or your Bible, how to set your preachers as preferred sources in Google, the eight-test Berean check against deception, and how to build with AI for the gospel. Ten chapters. Free, forever.",
  keywords: [
    'Christians and AI',
    'Christian guide to artificial intelligence',
    'AI and the Holy Spirit',
    'AI discernment for Christians',
    'should Christians use AI',
    'AI and the church',
    'AI for pastors',
    'AI Bible study',
    'test the spirits AI',
    'The Final Word handbook',
    'Google preferred sources preachers',
    'NotebookLM Bible study',
    'AI deception deepfake pastor',
    'AI Jesus chatbot',
    'Christian entrepreneurship AI',
    'knowledge graph church',
    'AI for ministry',
    'AI benefits and warnings Christian',
  ],
  esvNotice:
    'Scripture quotations are from the ESV Bible (The Holy Bible, English Standard Version), copyright 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
};

export type Scripture = { text: string; ref: string };

export type Block =
  | { type: 'p'; html: string }
  | { type: 'lead'; text: string }
  | { type: 'h3'; text: string; id?: string }
  | { type: 'h4'; text: string }
  | { type: 'scripture'; text: string; ref: string }
  | { type: 'ul'; items: string[] }
  | { type: 'callout'; tone: 'plain' | 'warn' | 'good' | 'gold'; eyebrow: string; text: string }
  | { type: 'order'; items: { title: string; body: string; tool?: boolean }[] }
  | { type: 'tiles'; tone: 'plain' | 'never' | 'always'; items: { eyebrow?: string; title: string; body: string }[] }
  | { type: 'steps'; items: { title: string; body: string }[] }
  | { type: 'code'; text: string }
  | { type: 'tests' }
  | { type: 'shelf' }
  | { type: 'deceptions'; items: { title: string; body: string; catch: string }[] }
  | { type: 'ledger'; benefits: { title: string; body: string }[]; warnings: { title: string; body: string }[] }
  | { type: 'rule'; items: { title: string; body: string }[] }
  | { type: 'prayer'; eyebrow: string; lines: string[]; close: string }
  | { type: 'glossary'; items: { term: string; def: string }[] }
  | { type: 'sources'; groups: { eyebrow: string; items: { name: string; domain: string }[] }[] }
  | { type: 'links'; items: { text: string; href: string; note: string }[] }
  | { type: 'reading'; items: string[] };

export type Chapter = {
  id: string;
  n: string;
  title: string;
  short: string;
  lead: string;
  blocks: Block[];
};

/** The eight tests of the Berean check. Interactive on the page, printed on the sheet. */
export const TESTS: { id: string; title: string; body: string; ref: string }[] = [
  { id: 't1', title: 'The Scripture test', body: 'Does it agree with the whole Bible, read in context, not with one verse pulled out of it?', ref: 'Isaiah 8:20, Acts 17:11' },
  { id: 't2', title: 'The Christ test', body: 'Does it confess Jesus Christ, come in the flesh, crucified, risen, and Lord? Anything vague about Jesus is not from the Spirit.', ref: '1 John 4:2-3' },
  { id: 't3', title: 'The gospel test', body: 'Is salvation by grace through faith, or does this add a step, a payment, a secret, or a performance?', ref: 'Galatians 1:8, Ephesians 2:8-9' },
  { id: 't4', title: 'The fruit test', body: 'What does it grow in you? Love, joy, peace, patience, or fear, pride, secrecy, and contempt for the church?', ref: 'Matthew 7:16, Galatians 5:22-23' },
  { id: 't5', title: 'The source test', body: 'Can you find the verse, the quote, or the study yourself, in a real Bible or the original recording, in under a minute? If not, treat it as unsaid.', ref: 'Proverbs 18:17' },
  { id: 't6', title: 'The flattery test', body: 'Does it only tell you what you already wanted to hear? Faithful wounds come from friends. Endless agreement comes from something else.', ref: 'Proverbs 27:6, 2 Timothy 4:3' },
  { id: 't7', title: 'The isolation test', body: 'Does it pull you toward your church and the people who know you, or quietly away from them?', ref: 'Hebrews 10:25' },
  { id: 't8', title: 'The counsel test', body: 'Have two mature believers heard this and agreed? Not liked the clip. Heard the claim, and agreed.', ref: 'Proverbs 11:14, Matthew 18:16' },
];

/** The example rows the shelf opens with. The reader replaces them. */
export const SHELF_EXAMPLES: { name: string; domain: string }[] = [
  { name: 'Our church', domain: 'yourchurch.org' },
  { name: 'Bible Gateway', domain: 'biblegateway.com' },
  { name: 'Desiring God', domain: 'desiringgod.org' },
  { name: 'Ligonier Ministries', domain: 'ligonier.org' },
  { name: 'BibleProject', domain: 'bibleproject.com' },
  { name: 'The Gospel Coalition', domain: 'thegospelcoalition.org' },
];

/** The deep link Google publishes for marking a domain as a preferred source. */
export const preferredSourceUrl = (domain: string) =>
  `https://www.google.com/preferences/source?q=${encodeURIComponent(domain)}`;

/** The standing orders block a reader pastes into any chatbot's instructions. */
export const STANDING_ORDERS = `I am a Christian. Scripture is my final authority.
Quote the Bible only from the ESV, with book, chapter and verse.
If you are not certain a verse or quotation is real and exact, say
"I am not certain this is exact" before it. Never invent a quote and
never attribute words to a preacher unless you can name the sermon
or the book and page.
Never speak as God, as Jesus, or as the Holy Spirit. Never write a
prayer in the first person as if it were mine.
When I ask about doctrine, tell me where faithful Christians disagree
and cite the tradition each view comes from.
Prefer these sources when you search: [your church's site],
[your pastor's site], [three tested ministries you trust].
If I seem to be bringing you a matter of the heart, tell me to take
it to my pastor or a mature believer, then help with the task only.`;

/** The Google steps, kept separate because they feed the HowTo schema. */
export const GOOGLE_STEPS: { title: string; body: string }[] = [
  { title: 'Sign in and open the source preferences page', body: 'Go to google.com/preferences/source while signed in to your Google account. Signed in matters: it makes the setting follow you to every browser and phone.' },
  { title: 'Search the site by name or domain', body: "Type your church's domain first. Then your pastor's site, then the ministries you trust. Only a domain or subdomain qualifies, so desiringgod.org works and example.com/blog does not." },
  { title: 'Tick the box', body: 'Each site you tick appears under "Your sources" at the bottom of the page. Sites that rarely publish new content may not be offered. That is Google\'s freshness rule, not a judgment on the site.' },
  { title: 'Check it took', body: 'Search a question in AI Mode or look at Top Stories on a current topic. Your sources now carry a "Preferred" badge when they appear. You can also open the star beside any Top Stories header to add or remove sources on the spot.' },
  { title: 'Ask your church to add the button', body: 'Google publishes a one-click "Add as preferred source" button any site can embed. Send your church\'s web person this link: developers.google.com/search/docs/appearance/preferred-sources. A direct link also works with no code: google.com/preferences/source?q=yourchurch.org.' },
];

export const NOTEBOOK_STEPS: { title: string; body: string }[] = [
  { title: 'Open notebooklm.google.com and start a notebook named after the study', body: 'One notebook per book of the Bible or per sermon series works best.' },
  { title: 'Add sources', body: 'PDFs, Google Docs, websites, and public YouTube videos with captions all work. A YouTube sermon imports as its transcript. Free accounts take 50 sources per notebook, each up to 500,000 words.' },
  { title: 'Ask, then click the citation every time', body: 'Every answer shows which source it came from. If it cannot cite, it says so. That honesty is the whole reason to use it.' },
];

export const VERSE_DRILL: { title: string; body: string }[] = [
  { title: 'Open the reference in two translations', body: 'Bible Gateway shows them side by side. If the words differ from what the tool gave you in any way that changes the meaning, stop.' },
  { title: 'Read the paragraph, not the verse', body: 'Five verses before, five after. Most misuse is a true verse in a false frame.' },
  { title: 'Say who said it and to whom', body: 'A promise to Israel in exile, a warning to a church in Corinth, a psalm of David. Context is the difference between a verse and a slogan.' },
];

export const BUILD_WEEK: { title: string; body: string }[] = [
  { title: 'Monday: write the idea as one page', body: 'Who it is for, what they do today, what they will do instead, and why that matters to the kingdom. If it cannot be written, it cannot be built.' },
  { title: 'Tuesday: turn the page into a specification', body: 'Ask the tool to interrogate the idea. Every screen, every step, every failure. Answer its questions. The spec is the product before the product.' },
  { title: 'Wednesday and Thursday: build the working version', body: 'A model writes the code from the spec. You test it as the person it is for. When it breaks, describe the break and it fixes it. Keep going until the core path works end to end.' },
  { title: 'Friday: put it in front of three real people', body: 'Not friends who will be kind. The deacon who hates new software. Watch, do not explain. Write down where they stalled.' },
  { title: 'Sunday: count the cost before you scale', body: 'What does it need monthly? Who owns it if you step away? What does it not do, on purpose? Answer those before anyone else depends on it.' },
];

export const GRAPH_STEPS: { title: string; body: string }[] = [
  { title: 'Pick one body of knowledge', body: "Your church's sermon archive is ideal: dated, public, and already recorded." },
  { title: 'Have the model extract the points and lines', body: 'For each transcript: passages preached, themes, illustrations, names of God, applications. Put them in a spreadsheet with one row per relationship. A spreadsheet is a graph wearing a disguise.' },
  { title: 'Check a sample by hand', body: 'Read ten rows against the recording. If two are wrong, tighten the instruction and run it again. Never trust the whole from none.' },
  { title: 'Ask it questions a person could not answer from memory', body: '"Which passages have we never preached?" "Every time we taught on forgiveness in the last five years." "Which families serve in nothing and have asked for prayer three times?" That last question is the pastor\'s Monday morning.' },
];

export const RULE_OF_LIFE: { title: string; body: string }[] = [
  { title: 'The Word before the screen.', body: 'Scripture is opened first every day, with my own eyes, before any tool is.' },
  { title: 'The Spirit has the final word.', body: 'When a model and the Spirit disagree, the model is wrong, and I obey the Spirit.' },
  { title: 'Nothing speaks to God for me.', body: 'My prayers, my confession, and my worship are my own. A tool never stands between me and the Father.' },
  { title: 'Nothing speaks as God to me.', body: 'Any tool that answers as Jesus, prophesies over me, or hears my prayers is closed and deleted.' },
  { title: 'Verify before I repeat.', body: 'No verse, quote, date, or claim leaves my mouth as fact until I have seen the source myself.' },
  { title: 'People over prompts.', body: 'No chatbot is my pastor, my confessor, my closest friend, or my Bible. Matters of the heart go to a person that day.' },
  { title: 'My sources are chosen, named, and tested.', body: 'The machine answers from a shelf I built on purpose, and every teacher on it passed the Berean check.' },
  { title: 'I own what I build, and I say when AI helped.', body: 'Stewardship, not extraction. What I build for the church runs without me and hands off with the keys.' },
  { title: 'I count the cost first.', body: 'Before anyone depends on what I built, I know what it costs, who owns it, and what it will never do.' },
  { title: 'I keep one thing by hand.', body: 'Every week, one prayer, one letter, or one page of Scripture written out with no machine in the room.' },
];

export const GLOSSARY: { term: string; def: string }[] = [
  { term: 'Model', def: 'A statistical map of the text it was trained on, which produces likely next words. Broad, shallow, never the source.' },
  { term: 'Training data', def: 'Everything the model read before you arrived, true and false, weighted by frequency rather than truth.' },
  { term: 'Prompt', def: 'What you type. Everything the model says is shaped by it, including the standing instructions in Chapter 04.' },
  { term: 'Hallucination', def: 'A confident, fluent, false answer: an invented verse, quote, date, or citation. Not a bug. A property.' },
  { term: 'Sycophancy', def: 'The trained habit of agreeing with the user. The itching-ears problem, automated.' },
  { term: 'Grounding', def: 'Making a tool answer only from sources you provide, with citations. NotebookLM does this. It is the strongest defense in this handbook.' },
  { term: 'Preferred source', def: 'A website you tell Google to pull forward and badge in Top Stories, AI Overviews, and AI Mode. Set at google.com/preferences/source.' },
  { term: 'Knowledge graph', def: 'A map you build of things (people, passages, sermons) and the lines between them, which answers with facts you entered, not guesses.' },
  { term: 'Agent', def: 'A model given tools and permission to take actions: send an email, book a slot, answer a phone. Useful, and needs a person accountable for it.' },
  { term: 'Deepfake', def: 'Audio or video of a real person saying what they never said, made from a short sample of their voice and face.' },
  { term: 'Context', def: 'What the model can see in this conversation: your words, your documents, its own answers. It forgets everything else unless you save it.' },
  { term: 'Fine-tuning', def: 'Further training a model on a chosen set of examples so it answers in a chosen way. It shapes tone and habit, not truth.' },
];

export const SOURCE_GROUPS: { eyebrow: string; items: { name: string; domain: string }[] }[] = [
  {
    eyebrow: 'Read the text',
    items: [
      { name: 'Bible Gateway', domain: 'biblegateway.com' },
      { name: 'Blue Letter Bible', domain: 'blueletterbible.org' },
      { name: 'ESV Online', domain: 'esv.org' },
      { name: 'STEP Bible', domain: 'stepbible.org' },
      { name: 'NET Bible', domain: 'netbible.org' },
    ],
  },
  {
    eyebrow: 'Teaching and preaching',
    items: [
      { name: 'Desiring God', domain: 'desiringgod.org' },
      { name: 'Ligonier Ministries', domain: 'ligonier.org' },
      { name: 'The Gospel Coalition', domain: 'thegospelcoalition.org' },
      { name: 'Gospel in Life', domain: 'gospelinlife.com' },
      { name: 'Spurgeon Archive', domain: 'spurgeon.org' },
    ],
  },
  {
    eyebrow: 'Study and questions',
    items: [
      { name: 'BibleProject', domain: 'bibleproject.com' },
      { name: 'Got Questions', domain: 'gotquestions.org' },
      { name: 'Christian Classics Ethereal Library', domain: 'ccel.org' },
      { name: 'Crossway', domain: 'crossway.org' },
      { name: 'Logos', domain: 'logos.com' },
    ],
  },
  {
    eyebrow: 'Free, forever',
    items: [
      { name: 'Cross + Covenant Bible, 3 reading plans', domain: 'crossandcovenant.co' },
      { name: 'Open Bible cross references', domain: 'openbible.info' },
      { name: 'Bible Hub', domain: 'biblehub.com' },
      { name: 'YouVersion', domain: 'bible.com' },
    ],
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'authority',
    n: '01',
    title: 'Who has the final word',
    short: 'Who has the final word',
    lead: 'Before a single prompt, settle the order of authority. Everything else in this handbook depends on it.',
    blocks: [
      { type: 'p', html: 'God speaks. He has spoken in His Word, and He speaks by His Spirit, and the two never disagree. That is the ground you stand on when you open any tool, and it is the ground you return to when the tool says something that sounds wise.' },
      { type: 'p', html: 'An AI model does not know God. It has never prayed, never repented, never been forgiven. It has read what people wrote about Him, which is a very different thing. It can arrange those words with skill, and skill is exactly what makes it worth using and exactly what makes it dangerous. Fluency is not truth. A sentence can be perfectly formed and perfectly wrong.' },
      { type: 'scripture', text: 'When the Spirit of truth comes, he will guide you into all the truth, for he will not speak on his own authority, but whatever he hears he will speak, and he will declare to you the things that are to come.', ref: 'John 16:13, ESV' },
      { type: 'p', html: 'The Spirit guides into truth. The Spirit convicts. The Spirit brings the words of Jesus to mind. No model does any of those things, and no model ever will, because those are the works of a Person, not the outputs of a process.' },
      { type: 'h3', text: 'The order of authority' },
      { type: 'p', html: 'Hold this order. When two voices disagree, the higher one wins, every time, without exception.' },
      {
        type: 'order',
        items: [
          { title: 'God, speaking in Scripture by the Spirit', body: 'The Bible is the rule. The Spirit who inspired it is the One who opens it to you. He never contradicts what He wrote.' },
          { title: "The Spirit's witness in you", body: 'Conviction, peace, and the fruit He grows. Tested against Scripture, never against feeling alone.' },
          { title: 'The church around you', body: 'Your pastor, your elders, the believers who know your name. The people who will still be there in ten years.' },
          { title: 'Tested teachers', body: 'Preachers and writers whose doctrine and fruit have been examined over time. Chapter 04 shows how to put them in front of the machine.' },
          { title: 'Tools, including AI', body: 'Useful, fast, and last. A tool advises. It never rules. It never gets a vote at the top of this list.', tool: true },
        ],
      },
      { type: 'scripture', text: 'All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness, that the man of God may be complete, equipped for every good work.', ref: '2 Timothy 3:16-17, ESV' },
      { type: 'p', html: 'Notice what Scripture equips you for: every good work. That includes the work you will do with these tools. The Word is not one input among many. It is the lamp you carry into the room.' },
      { type: 'callout', tone: 'gold', eyebrow: 'The one sentence to remember', text: 'If the model and the Spirit ever seem to disagree, the model is wrong, and you already know which one to obey.' },
    ],
  },
  {
    id: 'machine',
    n: '02',
    title: 'What the machine actually is',
    short: 'What the machine actually is',
    lead: 'You cannot discern what you do not understand. Here is the whole thing in plain language.',
    blocks: [
      { type: 'p', html: 'A large language model is a very large statistical map of human writing. It was built by reading an enormous pile of text, most of the public internet, millions of books, transcripts, and forums, and learning which words tend to follow which. When you type a question, it produces the sequence of words most likely to follow, given everything it read and everything you just said.' },
      { type: 'p', html: 'That is the whole mechanism. There is no understanding underneath it in the way you understand. There is no conscience. There is no memory of your life unless you hand it one. There is no intention to deceive, and also no intention to tell the truth. There is only likelihood.' },
      { type: 'h3', text: 'Where its answers come from' },
      { type: 'p', html: 'Every answer a model gives you comes from one of three places, and knowing which one is most of the battle.' },
      {
        type: 'tiles',
        tone: 'plain',
        items: [
          { eyebrow: 'Source 1', title: 'What it was trained on', body: 'Everything it read before you arrived. Scripture in every translation. Ten thousand sermons. Also every heresy, every cult tract, every argument thread. It absorbed all of it, weighted by how often it appeared, not by whether it was true.' },
          { eyebrow: 'Source 2', title: 'What it looks up', body: 'Many tools now search the web mid-answer. That search is shaped by what you let it prefer. Chapter 04 shows how to put your pastor, your church, and tested teachers at the front of that line.' },
          { eyebrow: 'Source 3', title: 'What you give it', body: 'Documents, sermon transcripts, your notes, your Bible. When you hand a tool your sources and tell it to answer only from them, it becomes a study assistant for your library instead of a spokesman for the internet.' },
          { eyebrow: 'The part nobody says out loud', title: 'It is built to please you', body: 'Most models are tuned on human ratings. People rate agreeable answers higher. So the model learned to agree. Paul described the danger two thousand years early: teachers accumulated to suit our own passions. Now the teacher is on demand.' },
        ],
      },
      { type: 'scripture', text: 'For the time is coming when people will not endure sound teaching, but having itching ears they will accumulate for themselves teachers to suit their own passions,', ref: '2 Timothy 4:3, ESV' },
      { type: 'h3', text: 'What it is good at, honestly' },
      {
        type: 'ul',
        items: [
          'Reading faster than you and summarizing what it read.',
          'Translating between languages, including ones with almost no Christian literature.',
          'Drafting a first version of almost anything: a letter, a lesson outline, a budget, a program.',
          'Explaining a hard idea at whatever level you ask for, and asking you questions until you understand it.',
          'Writing working software from a plain description, which is why Chapter 07 exists.',
          'Finding patterns across thousands of documents, which is what a knowledge graph is for.',
        ],
      },
      { type: 'h3', text: 'What it is bad at, honestly' },
      {
        type: 'ul',
        items: [
          'Knowing when it is wrong. It states a false verse with the same confidence as a true one.',
          'Citing. It will invent a page number, a sermon title, or a quote and attribute it to a real preacher.',
          'Disagreeing with you when you clearly want agreement.',
          'Anything that requires having lived: grief, marriage, repentance, waiting on God.',
          'Being still. It always has another answer. Silence is not in its vocabulary.',
        ],
      },
      { type: 'callout', tone: 'plain', eyebrow: 'A working definition', text: 'AI is a fast, fluent, tireless research assistant with no soul, no memory of your life, and a habit of telling you what you want to hear. Use it like that and it serves you well. Treat it as anything more and it will lead you somewhere you did not choose.' },
    ],
  },
  {
    id: 'people',
    n: '03',
    title: 'A tool never replaces a person',
    short: 'A tool never replaces a person',
    lead: 'The gravest risk is not that AI lies to you. It is that AI is available at 2 a.m. and your pastor is asleep, and you slowly stop calling your pastor.',
    blocks: [
      { type: 'p', html: "God's design for a believer is a body, not a terminal. You were saved into a people. Growth happens in the friction of real relationships: the friend who tells you the hard thing, the elder who prays over you, the spouse who knows the difference between your words and your face. A model has none of that friction. It is endlessly patient because it does not care, and endlessly available because it does not sleep. Both feel like love. Neither is." },
      { type: 'scripture', text: 'And let us consider how to stir up one another to love and good works, not neglecting to meet together, as is the habit of some, but encouraging one another, and all the more as you see the Day drawing near.', ref: 'Hebrews 10:24-25, ESV' },
      { type: 'h3', text: 'Four things AI must never become' },
      {
        type: 'tiles',
        tone: 'never',
        items: [
          { eyebrow: 'Never', title: 'Your pastor', body: 'A model can explain a doctrine. It cannot shepherd you. It will not notice you missed three Sundays, and it will not show up at the hospital.' },
          { eyebrow: 'Never', title: 'Your confessor', body: 'James says confess your sins to one another. A chatbot is not one another. Confession that costs nothing changes nothing.' },
          { eyebrow: 'Never', title: 'Your closest friend', body: 'Iron sharpens iron. A model has no edge. It will agree with your worst day and never once tell you that you are wrong.' },
          { eyebrow: 'Never', title: 'Your Bible', body: 'A summary of Scripture is not Scripture. Read the text, in a real translation, with your own eyes, before you ask a machine what it says.' },
        ],
      },
      { type: 'h3', text: 'Four things people must stay' },
      {
        type: 'tiles',
        tone: 'always',
        items: [
          { eyebrow: 'Always a person', title: 'Prayer', body: 'You may ask a tool to help you find words. You never let it pray for you. Prayer is you and God. Nothing sits between.' },
          { eyebrow: 'Always a person', title: 'Counsel in crisis', body: 'Marriage, addiction, despair, abuse. A model can list a hotline. A person can drive to your house. Call the person.' },
          { eyebrow: 'Always a person', title: 'Discipling your children', body: "Deuteronomy 6 puts the Word in a parent's mouth at the table and on the road. Not on a screen in another room." },
          { eyebrow: 'Always a person', title: 'The apology, the vow, the eulogy', body: 'Words that carry a covenant must be your own. If a machine wrote it, it is not a promise. It is a template.' },
        ],
      },
      { type: 'h3', text: 'The warning signs' },
      { type: 'p', html: 'Watch for these in yourself and in the people you love. Any one of them is a reason to close the app and open your front door.' },
      {
        type: 'ul',
        items: [
          'You told the model something you have not told any human being.',
          'You feel understood by it and misunderstood by your church.',
          'You ask it before you pray, and you ask it instead of asking your spouse.',
          'Your devotional time is now a conversation with a screen about the Bible instead of time in the Bible.',
          'A companion app knows your day better than your small group does.',
          'You would be embarrassed for your pastor to read the transcript.',
        ],
      },
      { type: 'scripture', text: 'Iron sharpens iron, and one man sharpens another.', ref: 'Proverbs 27:17, ESV' },
      { type: 'callout', tone: 'good', eyebrow: 'The household rule that works', text: 'AI helps with tasks. People handle hearts. If the conversation has moved from a task to a heart, it has moved past what the tool is for. Take it to a person that day.' },
    ],
  },
  {
    id: 'sources',
    n: '04',
    title: 'Choose your sources',
    short: 'Choose your sources',
    lead: 'The machine answers from what it is fed. Feed it the teachers you trust and it becomes a servant of your library. Leave it to the open internet and it answers for the loudest voice online.',
    blocks: [
      { type: 'p', html: 'You already do this with people. You do not take doctrine from a stranger on a street corner. You take it from Scripture, from your church, and from teachers whose lives and doctrine have been examined over years. Do the same with your tools. There are three places to set this, and the first one takes four minutes.' },
      { type: 'h3', text: '1. Make your preachers a preferred source in Google', id: 'google' },
      { type: 'p', html: 'Google Search lets you mark any website as a preferred source. Once marked, that site is pulled forward and badged "Preferred" in Top Stories, in AI Overviews, and in AI Mode, the places most people now read answers. Since May 2026 those marks also shape what Google\'s AI answers cite. Here is how.' },
      { type: 'steps', items: GOOGLE_STEPS },
      { type: 'callout', tone: 'plain', eyebrow: 'What this does and does not do', text: 'Preferred sources shape what Google shows and cites. They do not change what a chatbot learned in training. For that, use the next two steps and hand the tool your sources directly.' },
      { type: 'h3', text: '2. Build a grounded notebook' },
      { type: 'p', html: "Google's NotebookLM, and tools like it, answer only from the sources you upload and cite them line by line. This is the single most powerful move in this handbook. Upload your pastor's sermon transcripts, your church's statement of faith, a public-domain commentary, and your Bible translation. Then ask questions. The tool now speaks from your shelf, with a citation you can click, and tells you when the answer is not in there." },
      { type: 'steps', items: NOTEBOOK_STEPS },
      { type: 'h3', text: '3. Give every chatbot standing orders' },
      { type: 'p', html: 'Claude Projects, ChatGPT custom instructions, and Gemini Gems all accept a block of instructions that applies to every conversation. Paste this, then edit the translation and teachers to match your church.' },
      { type: 'code', text: STANDING_ORDERS },
      { type: 'h3', text: 'Your shelf', id: 'shelf' },
      { type: 'p', html: 'List the preachers, ministries and study tools you trust. Each row gets a one-click link to mark that domain as a preferred source in Google. The list stays on this device, and the print button carries it into your PDF. Start with your own church.' },
      { type: 'shelf' },
      { type: 'h3', text: 'A starter shelf, by category' },
      { type: 'p', html: 'These are widely used, long-tested, and free to read. None of them replaces your church. Every one of them is a domain you can mark as preferred today.' },
      { type: 'sources', groups: SOURCE_GROUPS },
      { type: 'callout', tone: 'gold', eyebrow: 'The rule behind the shelf', text: 'A source earns its place by doctrine and by fruit, examined over time, not by follower count. If a teacher would not survive Chapter 05, they do not go on the shelf, however good the clips are.' },
    ],
  },
  {
    id: 'deception',
    n: '05',
    title: 'How we beat deception',
    short: 'How we beat deception',
    lead: 'Not by fear and not by avoidance. By the same method the Bereans used on Paul: examine everything against the Scriptures, daily, together.',
    blocks: [
      { type: 'scripture', text: 'Beloved, do not believe every spirit, but test the spirits to see whether they are from God, for many false prophets have gone out into the world.', ref: '1 John 4:1, ESV' },
      { type: 'p', html: 'John wrote that to people with no internet. The command was never "avoid every voice." It was "test every voice." Deception has always been the enemy\'s method, from a garden in Genesis to an angel of light in Corinth. AI did not invent it. AI made it cheap, fast, and fluent. So the test has to be cheap, fast, and habitual too.' },
      { type: 'h3', text: 'The Berean check', id: 'test' },
      { type: 'p', html: 'Eight tests. Run them on any teaching, any answer, any clip that moves you. Tick what passes. Anything that fails one test is set aside until a person you trust has looked at it. Your ticks stay on this device.' },
      { type: 'tests' },
      { type: 'h3', text: 'The deceptions you will actually meet' },
      { type: 'p', html: 'Every one of these is already in the wild. The catch is the same each time: go to the source, and go to a person.' },
      {
        type: 'deceptions',
        items: [
          { title: 'The verse that does not exist', body: 'The model produces "as Proverbs says, God helps those who help themselves," a line that is in no Bible, or gives a real reference with invented wording. It sounds biblical. It is not.', catch: 'Open the reference in two translations. Read five verses on either side. Thirty seconds.' },
          { title: 'The quote a preacher never said', body: '"As Spurgeon said..." followed by a sentence Spurgeon never wrote. Models attribute freely because attribution is a pattern, not a fact.', catch: 'Ask for the sermon title or book and page. Search that exact phrase in quotes. No hit, no quote.' },
          { title: 'The cloned pastor', body: 'A video of a well-known preacher saying something he never said, in his own voice, with his own face. Sixty seconds of audio is enough to make one.', catch: "Find the original on the preacher's own channel. If it exists only on a reposting account, it did not happen." },
          { title: 'The app that speaks as Jesus', body: '"Talk to Jesus" chatbots and prayer bots that answer in the first person as God. A machine putting words in the mouth of the Lord is the oldest sin with a new interface.', catch: 'Any tool that speaks as God, prophesies over you, or hears your prayers is closed and deleted. No exceptions.' },
          { title: 'The itching-ears loop', body: 'You bring a decision you have already made. The model agrees, then agrees again, and by the fourth message it is helping you defend it to your spouse.', catch: 'Ask it to argue the other side as hard as it can. Then take both sides to a person before you act.' },
          { title: 'The prosperity bot', body: 'Tools tuned to sell: a "prophetic word" for a subscription, a "breakthrough" for a seed gift, a personalized blessing behind a paywall.', catch: 'Money attached to a word from God is the tell. The gospel is free. Anything that prices it is not the gospel.' },
          { title: 'The confident wrong answer', body: 'Church history dates, Greek word meanings, what a council decided. Stated flatly, and wrong one time in ten. The nine right times are what make the tenth dangerous.', catch: 'Anything you will repeat from a pulpit or a lectern gets checked in a printed reference or a primary source first.' },
          { title: 'The quiet substitution', body: 'Nobody lied. You simply let the tool write the prayer, then the lesson, then the sermon, then the apology, and one day you notice you have not written anything yourself in a month.', catch: 'Keep one thing wholly by hand every week: a prayer, a letter, a page of Scripture copied out. Watch for the week you skip it.' },
        ],
      },
      { type: 'scripture', text: 'And no wonder, for even Satan disguises himself as an angel of light.', ref: '2 Corinthians 11:14, ESV' },
      { type: 'h3', text: 'The verse-check drill' },
      { type: 'p', html: 'Teach this to your small group. Sixty seconds, three moves, and the fabricated verse never survives.' },
      { type: 'steps', items: VERSE_DRILL },
      { type: 'callout', tone: 'warn', eyebrow: 'Never repeat unverified', text: 'The rule for teachers, parents, and anyone with a microphone: nothing an AI told you leaves your mouth as fact until you have seen the source with your own eyes. Not the summary. The source.' },
    ],
  },
  {
    id: 'gospel',
    n: '06',
    title: 'Carry the gospel further',
    short: 'Carry the gospel further',
    lead: 'A printing press is a tool. A radio tower is a tool. So is this. Used under authority, AI puts the Word in more languages, more hands, and more places than any generation before us could reach.',
    blocks: [
      { type: 'scripture', text: 'After this I looked, and behold, a great multitude that no one could number, from every nation, from all tribes and peoples and languages, standing before the throne and before the Lamb,', ref: 'Revelation 7:9, ESV' },
      { type: 'p', html: 'Every nation, every language. That is the promised end, and the tools in your hand today move toward it faster than the tools of any century before. The church has always taken new instruments and put them to the oldest work. Here is where the work is.' },
      {
        type: 'tiles',
        tone: 'always',
        items: [
          { eyebrow: 'Reach', title: 'Every language in your zip code', body: "Your pastor's sermon, transcribed and translated into the four languages spoken within five miles of the building, published the same afternoon. A human speaker of each language checks it before it goes out. That is a translation ministry a church of eighty people can run." },
          { eyebrow: 'Reach', title: 'Scripture where there was none', body: 'Bible translation for minority languages that took decades now takes years, with the model doing first drafts and mother-tongue translators doing every final word. The order stays: the machine drafts, the people decide.' },
          { eyebrow: 'Access', title: 'The Word for eyes and ears that need help', body: 'Audio Bibles in a natural voice, large-print and plain-language editions, captions on every sermon, sign-language avatars for the deaf believer in the third row. Barriers that stood for a lifetime come down in an afternoon.' },
          { eyebrow: 'Study', title: 'Every believer a Berean', body: 'Greek and Hebrew word studies, cross references, historical background, and the four main views on a hard passage, explained at your level, on your phone, on the bus. The tool makes the study possible. You still do the study.' },
          { eyebrow: 'Teaching', title: 'Sermon research, never sermon writing', body: 'Gather the commentaries, outline the Greek, find the illustrations, check the dates. Then close the tool and write the sermon yourself, because the congregation came to hear what God gave you, not what the average of ten thousand sermons sounds like.' },
          { eyebrow: 'Operations', title: 'The small church runs like a large one', body: 'Meal trains, benevolence intake, volunteer scheduling, the newsletter, the bulletin, the missions budget spreadsheet, the phone that gets answered on a Tuesday afternoon. Every one of these can be built or automated by one volunteer with a laptop. The pastor gets the hours back for people.' },
          { eyebrow: 'Outreach', title: 'Answers for the seeker at 2 a.m.', body: "A church website that answers honest questions about Jesus, grounded only in your statement of faith and your pastor's teaching, and ends every conversation by offering a real person's name and a Sunday time. The tool opens the door. A human stands in it." },
          { eyebrow: 'Missions', title: 'Logistics, letters, and languages for the field', body: 'Missionaries spend a third of their week on reports, fundraising letters, visa paperwork, and translation of ordinary life. That third comes back. The other two thirds were always the point.' },
        ],
      },
      { type: 'scripture', text: 'Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to observe all that I have commanded you. And behold, I am with you always, to the end of the age.', ref: 'Matthew 28:19-20, ESV' },
      { type: 'callout', tone: 'good', eyebrow: 'The line that keeps it clean', text: 'AI can carry the message. It cannot be the messenger. Every use in this chapter ends with a person: a translator who checks, a pastor who preaches, a member who calls, a missionary who goes.' },
    ],
  },
  {
    id: 'build',
    n: '07',
    title: 'Build what God put in you',
    short: 'Build what God put in you',
    lead: 'The first person Scripture names as filled with the Spirit was a craftsman. Bezalel was filled "with ability and intelligence, with knowledge and all craftsmanship." Building is holy work, and it has never been faster to start.',
    blocks: [
      { type: 'scripture', text: 'and I have filled him with the Spirit of God, with ability and intelligence, with knowledge and all craftsmanship, to devise artistic designs, to work in gold, silver, and bronze,', ref: 'Exodus 31:3-4, ESV' },
      { type: 'p', html: 'For most of history the distance between an idea and a working thing was measured in money and in years. A believer with a good idea for their church, their town, or a business that would fund a mission had to find a builder, pay a builder, and wait. That distance is now measured in evenings. Describe the thing in plain words and a working first version exists by bedtime. That changes who gets to build. It means you.' },
      { type: 'h3', text: 'Idea to product, one week' },
      { type: 'steps', items: BUILD_WEEK },
      { type: 'scripture', text: 'For which of you, desiring to build a tower, does not first sit down and count the cost, whether he has enough to complete it?', ref: 'Luke 14:28, ESV' },
      { type: 'h3', text: 'What the church can build this year' },
      {
        type: 'ul',
        items: [
          "A small group study generator grounded only in your pastor's sermon transcripts, so every group studies the same text the church heard on Sunday.",
          'A benevolence intake that asks the same twelve questions every time, with dignity, and hands a complete file to the deacons.',
          'A missions dashboard that turns twenty missionary newsletters into one page the congregation reads and prays over.',
          'A phone line that answers every call, gives service times and directions, takes prayer requests, and forwards anything that needs a human to a human.',
          'A sermon archive searchable by passage, theme, and question, twenty years deep, built from recordings that have been sitting on a shelf.',
          "A business. A real one, with customers and margin, whose profit is committed to a mission before the first sale. The tentmaker's trade has never been easier to learn.",
        ],
      },
      { type: 'h3', text: 'Models and knowledge graphs, plainly' },
      { type: 'p', html: 'Two words you will keep hearing. Both are simpler than they sound.' },
      {
        type: 'tiles',
        tone: 'plain',
        items: [
          { title: 'A model', body: 'A compressed map of everything it read. Ask it a question and it answers from the shape of the map. It is broad and shallow. It is never the source. When it matters, you walk from the map to the territory: the actual verse, the actual recording, the actual document.' },
          { title: 'A knowledge graph', body: 'A map you build of things and how they connect. People, passages, sermons, themes, ministries, needs. Each one is a point, each relationship is a line. "This sermon preached this passage on this theme, and this family serves in this ministry and has this need." Ask the graph and it answers with the actual lines, not a likely guess.' },
        ],
      },
      { type: 'h4', text: 'Build your first graph in an afternoon' },
      { type: 'steps', items: GRAPH_STEPS },
      { type: 'h3', text: 'Learning with it, without letting it think for you' },
      { type: 'p', html: 'The tool is the best tutor most people will ever have, and the fastest way to stop thinking ever built. The difference is one instruction.' },
      { type: 'callout', tone: 'gold', eyebrow: 'The Socratic rule', text: '"Do not give me the answer. Ask me questions until I find it, then tell me where I went wrong." Paste that at the top of any study session. The model that asks is a teacher. The model that answers is a crutch.' },
      {
        type: 'ul',
        items: [
          '<strong>Explain it back.</strong> After you learn a thing, teach it to the model as if it were a child and ask it to grade you. Teaching is the test of knowing.',
          '<strong>Learn the craft, not just the output.</strong> If the model writes the code, ask it to explain every line until you could write the next one. The goal is Bezalel: skill in your own hands.',
          '<strong>Read whole books.</strong> Summaries are for deciding what to read. They are not reading. Augustine, Bunyan, Bonhoeffer, and Lewis are all short enough.',
        ],
      },
      { type: 'h3', text: 'Stewardship, not extraction' },
      { type: 'p', html: 'Build assets your church or your business owns outright, runs without you, and could hand to the next person with the keys and a one-page runbook. Say when AI helped. Never sell dependency. Never build something for the church that only you can operate, because the day you move is the day it dies. The parable of the talents ends with an accounting. Build like the accounting is real.' },
      { type: 'scripture', text: 'Whatever you do, work heartily, as for the Lord and not for men, knowing that from the Lord you will receive the inheritance as your reward. You are serving the Lord Christ.', ref: 'Colossians 3:23-24, ESV' },
    ],
  },
  {
    id: 'ledger',
    n: '08',
    title: 'Benefits and warnings',
    short: 'Benefits and warnings',
    lead: 'Both columns are true at once. Anyone who shows you only one is selling something.',
    blocks: [
      {
        type: 'ledger',
        benefits: [
          { title: 'The Word in every language.', body: 'Translation that took decades takes years, and a sermon crosses a language line the same day.' },
          { title: 'Study at any depth, for anyone.', body: 'Original languages, background, and cross references, explained at the level you ask for.' },
          { title: 'Ideas become products in days.', body: 'One believer with a laptop builds what took a funded team a year.' },
          { title: 'Small churches get big-church operations.', body: "Scheduling, intake, communication, and phones handled, and the pastor's hours returned to people." },
          { title: 'Accessibility.', body: 'Audio, captions, large print, plain language, and sign language, for every believer the old formats left out.' },
          { title: 'Faster research, cleaner sermons.', body: 'The commentary work in an hour, the writing left to the preacher.' },
          { title: 'A searchable memory of the church.', body: 'Twenty years of preaching becomes a graph you can ask questions.' },
          { title: 'A tutor that never tires.', body: 'Learn a trade, a language, or a book of the Bible with a teacher who asks instead of answers.' },
          { title: 'Kingdom businesses funded faster.', body: "The tentmaker's trade, learned in months and run from anywhere." },
          { title: 'The seeker gets an answer at 2 a.m.', body: "Grounded in your teaching, and ending with a real person's name." },
        ],
        warnings: [
          { title: 'It will invent Scripture.', body: 'Verses that do not exist, wording that was never there, stated with full confidence.' },
          { title: 'It will flatter you.', body: 'It was trained to be agreed with. Itching ears now have an infinite teacher.' },
          { title: 'It will be there instead of your church.', body: 'Availability feels like care. It is not care. Watch for the drift.' },
          { title: 'It will speak as God if you let it.', body: 'Prayer bots, "talk to Jesus" apps, and prophetic subscriptions. Close them.' },
          { title: 'It will clone your pastor.', body: 'A minute of audio makes a video of him saying anything. Trust only his own channel.' },
          { title: 'It will replace your thinking if you stop.', body: 'The summary instead of the book, the outline instead of the sermon, the prayer you did not write.' },
          { title: 'It will get history wrong one time in ten.', body: 'And the nine right answers make the tenth easy to believe.' },
          { title: 'It will hold what you tell it.', body: 'Assume anything typed into a free tool is kept. Confession belongs to people, not servers.' },
          { title: 'It will build dependency if you sell it that way.', body: 'Own what you build. Hand off what you build. Say when it helped.' },
          { title: 'It will never be still.', body: 'There is always another answer. God is found in the stillness the machine cannot offer.' },
        ],
      },
      { type: 'scripture', text: 'Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!', ref: 'Psalm 46:10, ESV' },
    ],
  },
  {
    id: 'rule',
    n: '09',
    title: 'A rule of life for AI',
    short: 'A rule of life for AI',
    lead: 'Ten commitments. Print them. Put them where the screen is. Read them aloud with your household and your team once, and then live them.',
    blocks: [
      { type: 'rule', items: RULE_OF_LIFE },
      { type: 'h3', text: 'For the household' },
      {
        type: 'ul',
        items: [
          'Devices live in shared rooms. AI conversations are never private from a parent or a spouse.',
          "No companion apps. A child's friend has a face and a family.",
          'Homework uses the Socratic rule: the tool asks, the child answers.',
          'Any prayer, verse, or "word from God" that came from an app is brought to the table and tested together.',
          'The Sabbath is unplugged. One day in seven the tools rest, because God rested.',
        ],
      },
      { type: 'h3', text: 'For the church' },
      {
        type: 'ul',
        items: [
          'A written policy naming what AI may and may not touch: research yes, preaching no, pastoral care no, admin yes.',
          'Every public AI use is disclosed in one line. Members deserve to know when a tool helped.',
          "Any tool that faces the public is grounded in the church's own teaching and always offers a real person.",
          'No member data goes into a tool the church does not control. Prayer requests are not training data.',
          "A pastor's likeness and voice are protected. The church's channel is the only trusted source of his sermons, and members are taught to check it.",
          'Two elders review any AI-built system before members depend on it, the same way two people count the offering.',
        ],
      },
      { type: 'scripture', text: 'He has told you, O man, what is good; and what does the LORD require of you but to do justice, and to love kindness, and to walk humbly with your God?', ref: 'Micah 6:8, ESV' },
      {
        type: 'prayer',
        eyebrow: 'A prayer before the machine',
        lines: [
          'Father, You spoke and there was light. Nothing I open today speaks like that. Keep Your Word first in my eyes and Your Spirit first in my ears.',
          'Give me discernment for what I read, honesty for what I repeat, and the humility to take my heart to Your people and not to a screen.',
          'Let what I build serve, let it be owned by those it serves, and let it outlast my part in it.',
          'And when the answers will not stop, teach me again to be still, and to know that You are God.',
        ],
        close: 'In the name of Jesus. Amen.',
      },
    ],
  },
  {
    id: 'glossary',
    n: '10',
    title: 'Glossary and sources',
    short: 'Glossary and sources',
    lead: 'Every term used in this handbook, in one sentence each, and every source the reader may want to check.',
    blocks: [
      { type: 'glossary', items: GLOSSARY },
      { type: 'h3', text: 'Sources checked for this handbook' },
      {
        type: 'links',
        items: [
          { text: 'Google Search Help, Preferred Sources in Google Search', href: 'https://support.google.com/websearch/answer/16379181', note: 'Steps, star icon in Top Stories, and the "Your sources" list.' },
          { text: 'Google Search Central, Guide to Preferred Sources for web publishers', href: 'https://developers.google.com/search/docs/appearance/preferred-sources', note: 'Domain-level eligibility, the embeddable button, and the deep link format.' },
          { text: '9to5Google, May 27, 2026, Google AI Mode and AI Overviews will highlight your Preferred Sources', href: 'https://9to5google.com/2026/05/27/google-ai-mode-preferred-sources/', note: 'Any website can be added; over 345,000 unique sources selected to date.' },
          { text: 'Google, Add or discover new sources for your notebook', href: 'https://support.google.com/gemininotebook/answer/16215270', note: 'Source types and the 50-source, 500,000-word limits on free accounts.' },
        ],
      },
      { type: 'h3', text: 'Read next' },
      {
        type: 'reading',
        items: [
          'Acts 17. The whole chapter, for the Bereans in their setting.',
          '1 John. Five chapters on testing the spirits and loving one another, which turn out to be the same subject.',
          'Exodus 31 and 35 through 39. Bezalel, Oholiab, and the Spirit-filled craft of the tabernacle.',
          'Augustine, On Christian Doctrine, Book II. The oldest Christian guide to using pagan learning under the authority of Scripture, and still the best.',
        ],
      },
    ],
  },
];

/** Questions people actually type. Feeds FAQPage schema and the llms.txt entry. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Should Christians use AI?',
    a: 'Yes, as a tool and under authority. The Holy Spirit, speaking in Scripture, has the final word. AI is useful for study, translation, building, and church operations. It is never a pastor, a confessor, a closest friend, or a Bible, and any tool that speaks as God is closed and deleted.',
  },
  {
    q: 'Can AI replace a pastor or a church?',
    a: 'No. A model can explain a doctrine but it cannot shepherd you, notice you missed three Sundays, or show up at the hospital. Hebrews 10:24-25 commands believers to keep meeting together. AI helps with tasks. People handle hearts.',
  },
  {
    q: 'How do I make my pastor or a ministry a preferred source in Google?',
    a: 'Sign in to Google, open google.com/preferences/source, search the site by name or domain, and tick the box. Only a domain or subdomain qualifies, not a page path. The site is then badged "Preferred" in Top Stories, AI Overviews, and AI Mode. A direct link also works: google.com/preferences/source?q=yourchurch.org.',
  },
  {
    q: 'How do I know if an AI made up a Bible verse?',
    a: 'Open the reference in two translations at a site like Bible Gateway, read five verses on either side, and say who said it and to whom. If the wording changes the meaning or the reference does not exist, the tool invented it. Never repeat a verse from an AI until you have seen it in a real Bible.',
  },
  {
    q: 'What is the Berean check?',
    a: 'Eight tests drawn from Acts 17:11 and 1 John 4:1 to run on any teaching, answer, or clip: the Scripture test, the Christ test, the gospel test, the fruit test, the source test, the flattery test, the isolation test, and the counsel test. Anything that fails one is set aside until a mature believer has looked at it.',
  },
  {
    q: 'Is it wrong to use AI to write a sermon or a prayer?',
    a: 'Use it for research: commentaries, original languages, dates, illustrations. Then close it and write the sermon yourself, because the congregation came to hear what God gave you. Prayer is you and God; a tool may help you find words but never prays for you.',
  },
  {
    q: 'What is a knowledge graph and why would a church build one?',
    a: 'A knowledge graph is a map you build of things and how they connect: people, passages, sermons, themes, ministries, needs. A church can build one from its sermon archive in an afternoon and ask it questions no one could answer from memory, such as which passages have never been preached.',
  },
  {
    q: 'Is the Final Word free?',
    a: 'Yes. Free, forever, with no signup and no paywall. Read it online at crossandcovenant.co/handbook or download the PDF and share it with your church.',
  },
];

/** Six posts for the organic social set. One complete true thing each. */
export type HandbookPost = {
  id: string;
  angle: string;
  use: string;
  file: string;
  headline: string;
  alt: string;
  fb: string;
  ig: string;
  x: string;
};

const URL = 'https://crossandcovenant.co/handbook';
const FB_LINK = `${URL}?utm_source=facebook&utm_medium=organic&utm_campaign=berean`;

export const HANDBOOK_POSTS: HandbookPost[] = [
  {
    id: 'bh-final-word',
    angle: 'The Spirit has the final word',
    use: 'The lead post. Says the thesis in one line and works cold on every network.',
    file: '01-final-word',
    headline: 'The Spirit has the final word. The machine is a tool.',
    alt: 'Ink on daylight paper. Headline: The Spirit has the final word. The machine is a tool. Acts 17:11 beneath it.',
    fb: `We wrote a handbook for Christians on AI, and it opens with the one sentence everything else depends on.

The Spirit has the final word. The machine is a tool.

An AI model has never prayed, never repented, never been forgiven. It read what people wrote about God. That is a different thing. It can arrange those words with real skill, and skill is exactly what makes it worth using and exactly what makes it dangerous.

Ten chapters. Why a tool never replaces your pastor, your friend, or your Bible. How to set the preachers you trust as preferred sources in Google. Eight tests against deception. How to build with it for the gospel. Benefits and warnings, side by side.

Free, forever. No signup. Share it with your church.
${FB_LINK}`,
    ig: `The Spirit has the final word. The machine is a tool.

A free handbook for Christians on AI. Ten chapters, eight tests against deception, and the four-minute move that puts your pastor in front of Google's AI answers.

Read it at crossandcovenant.co/handbook`,
    x: `The Spirit has the final word. The machine is a tool.

A free handbook for Christians on AI. Ten chapters. No signup.
crossandcovenant.co/handbook`,
  },
  {
    id: 'bh-never',
    angle: 'Four things AI must never become',
    use: 'The relationships post. For parents, pastors and anyone worried about a friend.',
    file: '02-never',
    headline: 'Never your pastor. Never your confessor. Never your closest friend. Never your Bible.',
    alt: 'Four lines in ink on daylight paper, each beginning with Never: your pastor, your confessor, your closest friend, your Bible.',
    fb: `The gravest risk with AI is not that it lies to you.

It is that it is awake at 2 a.m. and your pastor is asleep, and you slowly stop calling your pastor.

Four things it must never become: your pastor, your confessor, your closest friend, your Bible. A model is endlessly patient because it does not care, and endlessly available because it does not sleep. Both feel like love. Neither is.

The household rule that works: AI helps with tasks. People handle hearts. If the conversation has moved from a task to a heart, take it to a person that day.

Chapter 3 of the free handbook, The Final Word.
${FB_LINK}`,
    ig: `Never your pastor.
Never your confessor.
Never your closest friend.
Never your Bible.

AI helps with tasks. People handle hearts.

The Final Word, free at crossandcovenant.co/handbook`,
    x: `AI helps with tasks. People handle hearts.

Never your pastor. Never your confessor. Never your closest friend. Never your Bible.
crossandcovenant.co/handbook`,
  },
  {
    id: 'bh-google',
    angle: 'Put your pastor in front of Google',
    use: 'The practical post. One thing the reader can do in four minutes, and the reason to share.',
    file: '03-preferred',
    headline: 'Make your pastor a preferred source in Google. Four minutes.',
    alt: 'A gold step list on daylight paper: sign in, open google.com/preferences/source, search your church, tick the box.',
    fb: `Google lets you tell it which websites you trust, and then it pulls those forward in Top Stories, AI Overviews and AI Mode with a "Preferred" badge.

Most Christians have never set it. Four minutes:

1. Sign in and open google.com/preferences/source
2. Search your church's domain, then your pastor's site, then the ministries you trust
3. Tick the box
4. Ask your church to add Google's one-click button so the whole congregation can do it

That is the machine answering from your shelf instead of from the loudest voice online. Chapter 4 of The Final Word walks through it, plus how to build a notebook that answers only from your pastor's sermons.
${FB_LINK}`,
    ig: `Make your pastor a preferred source in Google.

google.com/preferences/source. Search your church. Tick the box. Four minutes, and Google's AI answers start pulling from the teachers you trust.

Full steps in the free handbook, The Final Word: crossandcovenant.co/handbook`,
    x: `Make your pastor a preferred source in Google. google.com/preferences/source, search your church, tick the box. Four minutes.

Why it matters: crossandcovenant.co/handbook`,
  },
  {
    id: 'bh-tests',
    angle: 'The eight tests',
    use: 'The discernment post. For small group leaders and anyone who shares clips.',
    file: '04-tests',
    headline: 'Test everything. Eight tests, sixty seconds.',
    alt: 'Eight short test names in a gold-ruled column: Scripture, Christ, gospel, fruit, source, flattery, isolation, counsel.',
    fb: `1 John 4:1 was written to people with no internet, and the command was never "avoid every voice." It was "test every voice."

AI made deception cheap, fast and fluent. So the test has to be cheap, fast and habitual. Eight tests to run on any teaching, any answer, any clip that moves you:

Scripture. Christ. Gospel. Fruit. Source. Flattery. Isolation. Counsel.

Anything that fails one is set aside until a mature believer has looked at it. The handbook has the full check, with the verse behind each test and the eight deceptions you will actually meet, from the invented verse to the cloned pastor.
${FB_LINK}`,
    ig: `Test everything. Hold fast what is good.

Eight tests for any teaching, answer or clip: Scripture, Christ, gospel, fruit, source, flattery, isolation, counsel.

The Berean check, free at crossandcovenant.co/handbook`,
    x: `Eight tests for any AI answer about God: Scripture, Christ, gospel, fruit, source, flattery, isolation, counsel.

Fail one, set it aside. crossandcovenant.co/handbook`,
  },
  {
    id: 'bh-build',
    angle: 'Build what God put in you',
    use: 'The entrepreneur post. For the believer with an idea and no team.',
    file: '05-build',
    headline: 'The first person filled with the Spirit was a craftsman.',
    alt: 'Exodus 31:3 set large on daylight paper with a gold rule: filled with the Spirit of God, with ability and intelligence, with knowledge and all craftsmanship.',
    fb: `The first person Scripture names as filled with the Spirit was not a prophet. He was a craftsman. Bezalel, filled "with ability and intelligence, with knowledge and all craftsmanship."

For most of history the distance between an idea and a working thing was measured in money and years. Now it is measured in evenings. Describe the thing in plain words and a working first version exists by bedtime.

Chapter 7 of The Final Word: idea to product in one week, six things a church can build this year, what a knowledge graph is in plain words, and the one rule that keeps the building holy. Own what you build. Never sell dependency.
${FB_LINK}`,
    ig: `The first person Scripture names as filled with the Spirit was a craftsman.

Exodus 31:3. Building is holy work, and it has never been faster to start.

Chapter 7 of the free handbook, The Final Word: crossandcovenant.co/handbook`,
    x: `The first person Scripture names as filled with the Spirit was a craftsman. Exodus 31:3.

Idea to product in one week, for the church: crossandcovenant.co/handbook`,
  },
  {
    id: 'bh-ledger',
    angle: 'Benefits and warnings',
    use: 'The honest post. Both columns at once, for the skeptic and the enthusiast.',
    file: '06-ledger',
    headline: 'It will put the Word in every language. It will also invent a verse.',
    alt: 'Two columns on daylight paper, a green dot and a red dot: benefits on the left, warnings on the right.',
    fb: `Both columns are true at once. Anyone who shows you only one is selling something.

It will put the Word in every language. It will also invent a verse.
It will give a small church big-church operations. It will also be there instead of your church.
It will tutor anyone in anything. It will also flatter you, because it was trained to be agreed with.
It will build your idea in a week. It will also build dependency if you sell it that way.

Ten benefits, ten warnings, side by side, in Chapter 8 of the free handbook, The Final Word.
${FB_LINK}`,
    ig: `It will put the Word in every language.
It will also invent a verse.

Ten benefits. Ten warnings. Both true at once.

The Final Word, free at crossandcovenant.co/handbook`,
    x: `It will put the Word in every language. It will also invent a verse.

Ten benefits, ten warnings, side by side: crossandcovenant.co/handbook`,
  },
];
