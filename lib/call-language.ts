/**
 * WHAT LANGUAGE THIS CALL HAPPENS IN.
 *
 * Mr. Mustard's brain and his voice are both multilingual already. The ear is
 * not: Deepgram is configured per call with one language, and if that language
 * is wrong the caller's audio arrives as noise no matter how good the prompt is.
 * So language is decided once, here, at the moment a call is placed.
 *
 * ⚠️ ENGLISH RETURNS UNDEFINED, ON PURPOSE. The English phone stack (nova-3,
 * keyterm prompting, numerals) is the thing we spent days tuning to get emails
 * and phone numbers read back correctly. It is not re-declared here and it is
 * never overridden here, so an English caller in August 2026 gets byte for byte
 * the call they got before this file existed. Multilingual support cannot
 * regress it because multilingual support never touches it.
 *
 * The alternative, flipping the assistant's transcriber to Deepgram's "multi",
 * would have put every English call on a different model to buy Spanish. This
 * buys Spanish for Spanish callers and charges English callers nothing.
 */

export type CallLanguage = {
  code: string;
  label: string;
  flag: string;
  /** Deepgram language code. Absent for English (see the warning above). */
  dg?: string;
  /** Azure neural voice for the browser demo, which has no phone identity to protect. */
  voice?: string;
  /** Opener for the browser demo: they came to us. */
  demoFirst?: string;
  /**
   * Opener for an outbound callback: we are calling them because they asked.
   *
   * ⚠️ EVERY ONE OF THESE DISCLOSES THAT HE IS AN AI, in the second sentence,
   * exactly as the English opener does. That disclosure is the reason the first
   * message is scripted at all. A translation that drops it is not a
   * translation of this opener, it is a different opener.
   */
  callbackFirst?: (name: string) => string;
};

export const CALL_LANGUAGES: CallLanguage[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  {
    code: 'es',
    label: 'Español',
    flag: '🇲🇽',
    dg: 'es',
    voice: 'es-US-AlonsoNeural',
    demoFirst:
      '¡Hola! Soy Mr. Mustard, de Modern Mustard Seed. Pregúnteme lo que quiera, o reserve una llamada con Sarah. ¿En qué le puedo ayudar hoy?',
    callbackFirst: (n) =>
      `${n ? `Hola ${n}, ` : 'Hola, '}soy Mr. Mustard, de Modern Mustard Seed. Soy el recepcionista con inteligencia artificial que usted acaba de pedir que le llamara, así que soy una IA, no una persona. Sarah pensó que tenía más sentido que hablara conmigo en vez de leer un anuncio. ¿Tiene tres minutos para ponerme a prueba?`,
  },
  {
    code: 'fr',
    label: 'Français',
    flag: '🇫🇷',
    dg: 'fr',
    voice: 'fr-FR-HenriNeural',
    demoFirst:
      "Bonjour, je suis Mr. Mustard, de Modern Mustard Seed. Posez-moi vos questions ou réservez un appel avec Sarah. Comment puis-je vous aider?",
    callbackFirst: (n) =>
      `${n ? `Bonjour ${n}, ` : 'Bonjour, '}ici Mr. Mustard, de Modern Mustard Seed. Je suis le réceptionniste à intelligence artificielle que vous venez de demander, donc je suis une IA, pas un humain. Sarah s'est dit que vous parler directement valait mieux qu'un argumentaire écrit. Vous avez trois minutes pour me tester?`,
  },
  {
    code: 'de',
    label: 'Deutsch',
    flag: '🇩🇪',
    dg: 'de',
    voice: 'de-DE-ConradNeural',
    demoFirst:
      'Hallo, ich bin Mr. Mustard von Modern Mustard Seed. Fragen Sie mich alles oder buchen Sie einen Termin mit Sarah. Wie kann ich helfen?',
    callbackFirst: (n) =>
      `${n ? `Hallo ${n}, ` : 'Hallo, '}hier ist Mr. Mustard von Modern Mustard Seed. Ich bin die KI-Empfangskraft, um deren Rückruf Sie gerade gebeten haben, ich bin also eine KI und kein Mensch. Sarah fand, ein Gespräch mit mir sagt mehr als jeder Werbetext. Haben Sie drei Minuten, um mich auf die Probe zu stellen?`,
  },
  {
    code: 'pt',
    label: 'Português',
    flag: '🇧🇷',
    dg: 'pt',
    voice: 'pt-BR-AntonioNeural',
    demoFirst:
      'Olá, eu sou o Mr. Mustard, da Modern Mustard Seed. Pergunte o que quiser ou agende uma conversa com a Sarah. Como posso ajudar?',
    callbackFirst: (n) =>
      `${n ? `Olá ${n}, ` : 'Olá, '}aqui é o Mr. Mustard, da Modern Mustard Seed. Eu sou o recepcionista de inteligência artificial que você acabou de pedir para ligar, então sou uma IA, não uma pessoa. A Sarah achou que falar comigo faria mais sentido do que ler um anúncio. Tem três minutos para me testar?`,
  },
  {
    code: 'zh',
    label: '中文',
    flag: '🇨🇳',
    dg: 'zh',
    voice: 'zh-CN-YunxiNeural',
    demoFirst:
      '您好，我是 Modern Mustard Seed 的 Mr. Mustard。您可以问我任何问题，或预约与 Sarah 的通话。我能帮您做什么？',
    callbackFirst: (n) =>
      `您好${n ? n : ''}，我是 Modern Mustard Seed 的 Mr. Mustard。我就是您刚才请求回电的人工智能前台，所以我是 AI，不是真人。Sarah 觉得让您直接跟我聊，比读一份推销材料更说明问题。您有三分钟考考我吗？`,
  },
  {
    code: 'ru',
    label: 'Русский',
    flag: '🇷🇺',
    dg: 'ru',
    voice: 'ru-RU-DmitryNeural',
    demoFirst:
      'Здравствуйте! Я Mr. Mustard из Modern Mustard Seed. Спросите меня о чём угодно или запишитесь на звонок с Сарой. Чем могу помочь?',
    callbackFirst: (n) =>
      `Здравствуйте${n ? `, ${n}` : ''}! Это Mr. Mustard из Modern Mustard Seed. Я тот самый ИИ-администратор, которого вы попросили перезвонить, то есть я искусственный интеллект, а не человек. Сара решила, что разговор со мной скажет больше, чем рекламный текст. Найдётся три минуты, чтобы меня проверить?`,
  },
];

export const ENGLISH = CALL_LANGUAGES[0];

export function languageByCode(code: string | null | undefined): CallLanguage {
  if (!code) return ENGLISH;
  const base = code.trim().toLowerCase().split('-')[0];
  return CALL_LANGUAGES.find((l) => l.code === base) ?? ENGLISH;
}

/**
 * Read an Accept-Language header and pick the highest-weighted language we
 * actually speak.
 *
 * This is the only honest signal available for an outbound callback: the person
 * types a phone number and hangs up on the browser, so their browser's own
 * language preference is all we know about them. It is a good signal and a
 * cheap one, and when it is wrong the cost is bounded, because he mirrors
 * whatever language they answer in from his second sentence onward.
 *
 * Anything we do not speak falls back to English rather than guessing.
 */
export function pickLanguage(acceptLanguage: string | null | undefined): CallLanguage {
  if (!acceptLanguage) return ENGLISH;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim(), weight: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((e) => e.tag && e.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  for (const entry of ranked) {
    const match = languageByCode(entry.tag);
    if (match !== ENGLISH) return match;
    if (entry.tag.toLowerCase().split('-')[0] === 'en') return ENGLISH;
  }
  return ENGLISH;
}

/**
 * Browser demo overrides. The web widget has no phone identity to protect, so
 * it swaps in a native-sounding Azure voice for the language.
 */
export function webOverrides(l: CallLanguage): Record<string, unknown> | undefined {
  if (!l.voice || !l.dg) return undefined;
  return {
    firstMessage: l.demoFirst,
    voice: { provider: 'azure', voiceId: l.voice },
    transcriber: { provider: 'deepgram', model: 'nova-2', language: l.dg },
  };
}

/**
 * Phone overrides. Deliberately narrower than the web ones: the ear and the
 * opener change, HIS VOICE DOES NOT.
 *
 * eleven_turbo_v2_5 speaks all of these languages in Adam Spencer's voice, so
 * a Spanish caller gets the same man the English caller gets. Swapping to Azure
 * here would trade Mr. Mustard's identity, the face of the company on the
 * phone, for a marginally more native accent. Not worth it.
 *
 * Returns undefined for English, which is the whole safety property of this
 * module: no override object, no change to the tuned English stack.
 */
export function phoneOverrides(
  l: CallLanguage,
  name?: string | null
): Record<string, unknown> | undefined {
  if (!l.dg || !l.callbackFirst) return undefined;
  return {
    firstMessage: l.callbackFirst((name ?? '').trim()),
    transcriber: { provider: 'deepgram', model: 'nova-2', language: l.dg },
  };
}
