/**
 * Where a visitor came from, worked out from the referrer and the link they
 * arrived on.
 *
 * This is the whole reason the shop keeps its own figures rather than
 * reading Google's. Analytics buckets a click from a ChatGPT answer as
 * "Referral: chatgpt.com" and a click from a Claude answer as "Referral:
 * claude.ai", in among every forum and directory on the internet. The shop
 * wants to know how many people an AI sent it, and that is a question only a
 * list of the AI hosts can answer.
 *
 * Pure functions, no imports: everything here is decided from strings, so it
 * can be checked without a browser or a database.
 */

/** The eight buckets the dashboard reports on. */
export type Channel =
  /** Unpaid clicks from Google. */
  | 'organic'
  /** Paid clicks, from Google Ads or Microsoft Ads. */
  | 'ads'
  /** A person following a link inside an AI answer. */
  | 'ai'
  /** Unpaid clicks from a search engine that is not Google. */
  | 'search'
  | 'social'
  | 'referral'
  | 'direct';

export type Attribution = {
  channel: Channel;
  /** "google", "chatgpt", "facebook", or the bare hostname for a referral. */
  source: string;
  medium: string | null;
  campaign: string | null;
};

/**
 * The AI assistants, and the host each one sends people from.
 *
 * ChatGPT moved from chat.openai.com to chatgpt.com, and both still appear
 * in referrers, so both are listed. A host is matched on its own or as a
 * subdomain of itself, never as a substring: "notchatgpt.com" is not ChatGPT.
 */
const AI_HOSTS: Record<string, string> = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'openai.com': 'chatgpt',
  'claude.ai': 'claude',
  'anthropic.com': 'claude',
  'perplexity.ai': 'perplexity',
  'gemini.google.com': 'gemini',
  'bard.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
  'you.com': 'you.com',
  'poe.com': 'poe',
  'deepseek.com': 'deepseek',
  'chat.deepseek.com': 'deepseek',
  'grok.com': 'grok',
  'x.ai': 'grok',
  'mistral.ai': 'mistral',
  'chat.mistral.ai': 'mistral',
};

/** Search engines that are not Google. */
const SEARCH_HOSTS: Record<string, string> = {
  'bing.com': 'bing',
  'duckduckgo.com': 'duckduckgo',
  'search.yahoo.com': 'yahoo',
  'yahoo.com': 'yahoo',
  'ecosia.org': 'ecosia',
  'search.brave.com': 'brave',
  'brave.com': 'brave',
  'baidu.com': 'baidu',
  'yandex.com': 'yandex',
  'yandex.ru': 'yandex',
  'startpage.com': 'startpage',
  'qwant.com': 'qwant',
  'ask.com': 'ask',
  'aol.com': 'aol',
};

const SOCIAL_HOSTS: Record<string, string> = {
  'facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'l.facebook.com': 'facebook',
  'fb.com': 'facebook',
  'instagram.com': 'instagram',
  'l.instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'twitter.com': 'x',
  'x.com': 'x',
  't.co': 'x',
  'linkedin.com': 'linkedin',
  'lnkd.in': 'linkedin',
  'pinterest.com': 'pinterest',
  'pin.it': 'pinterest',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'reddit.com': 'reddit',
  'out.reddit.com': 'reddit',
  'snapchat.com': 'snapchat',
  'threads.net': 'threads',
  'threads.com': 'threads',
  'whatsapp.com': 'whatsapp',
  'nextdoor.com': 'nextdoor',
};

/*
 * The same names again, as sources rather than hosts. A utm_source tag
 * carries "chatgpt", not "chatgpt.com", so both spellings need a home.
 */
const AI_SOURCES = new Set(Object.values(AI_HOSTS));
const SOCIAL_SOURCES = new Set(Object.values(SOCIAL_HOSTS));
const SEARCH_SOURCES = new Set(Object.values(SEARCH_HOSTS));

/** A host, lower case, with any port and leading www. taken off. */
export function hostOf(url: string | null | undefined): string {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** True when host is exactly one of the names, or a subdomain of one. */
function match(host: string, table: Record<string, string>): string | null {
  if (!host) return null;
  if (table[host]) return table[host];
  for (const name of Object.keys(table)) {
    if (host.endsWith(`.${name}`)) return table[name];
  }
  return null;
}

/** google.com, google.co.uk, news.google.com — but not gemini.google.com. */
function isGoogleSearch(host: string): boolean {
  if (match(host, AI_HOSTS)) return false;
  return /(^|\.)google\.[a-z.]{2,8}$/.test(host);
}

/** Query values, lower case, from a landing URL or a bare query string. */
export function paramsOf(url: string | null | undefined): URLSearchParams {
  const raw = String(url ?? '').trim();
  if (!raw) return new URLSearchParams();
  const q = raw.indexOf('?');
  try {
    return new URLSearchParams(q >= 0 ? raw.slice(q) : raw.startsWith('utm') ? raw : '');
  } catch {
    return new URLSearchParams();
  }
}

const PAID_MEDIUMS = new Set([
  'cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search',
  'cpm', 'display', 'banner', 'retargeting', 'remarketing', 'paidsocial',
  'paid_social', 'paid-social',
]);

/**
 * Which bucket a visit belongs in.
 *
 * Decided in this order, because each step is more certain than the one
 * after it:
 *
 *  1. A click id. gclid only ever comes from Google Ads, so a visit
 *     carrying one is paid even when the referrer says google.com, which
 *     is exactly the case that makes paid traffic look organic.
 *  2. The campaign tags on the link, which the shop set itself.
 *  3. The referrer host.
 *  4. Nothing at all, which is direct.
 *
 * `self` is the shop's own host. A referrer from the shop itself is a
 * person moving between pages, not an arrival, and is reported as such so
 * internal clicks never inflate a channel.
 */
export function classify(visit: {
  referrer?: string | null;
  /** The address they landed on, campaign tags and all. */
  landing?: string | null;
  /** The shop's own hostname, so its own links are not counted as referrals. */
  self?: string | null;
}): Attribution {
  const params = paramsOf(visit.landing);
  const utmSource = (params.get('utm_source') ?? '').trim().toLowerCase();
  const utmMedium = (params.get('utm_medium') ?? '').trim().toLowerCase();
  const campaign = (params.get('utm_campaign') ?? '').trim() || null;
  const host = hostOf(visit.referrer);
  const own = hostOf(visit.self);

  // 1. A click id is proof of a paid click, whatever the referrer says.
  if (params.get('gclid') || params.get('gbraid') || params.get('wbraid')) {
    return { channel: 'ads', source: 'google', medium: 'cpc', campaign };
  }
  if (params.get('msclkid')) {
    return { channel: 'ads', source: 'bing', medium: 'cpc', campaign };
  }

  // 2. Tags the shop put on its own links.
  if (utmMedium && PAID_MEDIUMS.has(utmMedium)) {
    return { channel: 'ads', source: utmSource || match(host, SEARCH_HOSTS) || 'unknown', medium: utmMedium, campaign };
  }
  if (utmSource) {
    // A tag may name the host (chatgpt.com) or the source (chatgpt), and
    // both have to land in the same bucket.
    const source =
      AI_HOSTS[utmSource] ?? SOCIAL_HOSTS[utmSource] ?? SEARCH_HOSTS[utmSource] ?? utmSource;
    const channel: Channel =
      AI_SOURCES.has(source)
        ? 'ai'
        : utmMedium === 'organic'
          ? source === 'google'
            ? 'organic'
            : 'search'
          : utmMedium === 'social' || SOCIAL_SOURCES.has(source)
            ? 'social'
            : SEARCH_SOURCES.has(source)
              ? 'search'
              : source === 'google'
                ? 'organic'
                : 'referral';
    return { channel, source, medium: utmMedium || null, campaign };
  }

  // 3. Who linked to us.
  if (own && (host === own || host.endsWith(`.${own}`))) {
    return { channel: 'direct', source: 'internal', medium: 'internal', campaign };
  }
  const ai = match(host, AI_HOSTS);
  if (ai) return { channel: 'ai', source: ai, medium: 'referral', campaign };

  if (isGoogleSearch(host)) {
    return { channel: 'organic', source: 'google', medium: 'organic', campaign };
  }
  const search = match(host, SEARCH_HOSTS);
  if (search) return { channel: 'search', source: search, medium: 'organic', campaign };

  const social = match(host, SOCIAL_HOSTS);
  if (social) return { channel: 'social', source: social, medium: 'referral', campaign };

  if (host) return { channel: 'referral', source: host, medium: 'referral', campaign };

  // 4. Typed the address, used a bookmark, or came from an app that sends
  //    no referrer. All of it is direct, and some of it is really dark
  //    social, which no analytics tool can see either.
  return { channel: 'direct', source: 'direct', medium: null, campaign };
}

/**
 * The robots, told apart from the people.
 *
 * Two kinds matter and they are reported separately. An AI crawler reading
 * the shop is how its pages get into an assistant's answers at all, so it is
 * worth seeing; a scraper or an uptime checker is noise. Neither is a
 * visitor, and neither is counted as one.
 */
const AI_CRAWLERS: Record<string, string> = {
  gptbot: 'ChatGPT',
  'oai-searchbot': 'ChatGPT',
  'chatgpt-user': 'ChatGPT',
  claudebot: 'Claude',
  'claude-web': 'Claude',
  'claude-user': 'Claude',
  'anthropic-ai': 'Claude',
  perplexitybot: 'Perplexity',
  'perplexity-user': 'Perplexity',
  'google-extended': 'Gemini',
  bingbot: 'Bing',
  applebot: 'Apple',
  'meta-externalagent': 'Meta AI',
  bytespider: 'TikTok',
  'amazonbot': 'Amazon',
  'ccbot': 'Common Crawl',
  'cohere-ai': 'Cohere',
  'mistralai-user': 'Mistral',
};

const PLAIN_BOTS =
  /bot\b|crawler|spider|slurp|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptime|curl\/|wget|python-requests|axios\/|go-http-client|facebookexternalhit|preview|monitor/i;

export type BotCheck = {
  isBot: boolean;
  /** The assistant whose crawler this is, when it is one. */
  crawler: string | null;
};

export function botCheck(userAgent: string | null | undefined): BotCheck {
  const ua = String(userAgent ?? '').toLowerCase();
  if (!ua) return { isBot: true, crawler: null };
  for (const name of Object.keys(AI_CRAWLERS)) {
    if (ua.includes(name)) return { isBot: true, crawler: AI_CRAWLERS[name] };
  }
  if (PLAIN_BOTS.test(ua)) return { isBot: true, crawler: null };
  return { isBot: false, crawler: null };
}

/** Phone, tablet or desktop, from the user agent. */
export function deviceOf(userAgent: string | null | undefined): 'phone' | 'tablet' | 'desktop' {
  const ua = String(userAgent ?? '');
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry/i.test(ua)) return 'phone';
  return 'desktop';
}

/** How a channel is written on screen. */
export const CHANNEL_LABEL: Record<Channel, string> = {
  organic: 'Google organic',
  ads: 'Google Ads / paid',
  ai: 'AI assistants',
  search: 'Other search engines',
  social: 'Social media',
  referral: 'Referral',
  direct: 'Direct',
};

/** A tint per channel, so the same colour means the same thing everywhere. */
export const CHANNEL_COLOR: Record<Channel, string> = {
  organic: '#1F7A4D',
  ai: '#7A3FD4',
  ads: '#C2410C',
  social: '#1D5FD1',
  referral: '#8A7300',
  search: '#0E7490',
  direct: '#6B6D74',
};

/** The order they are listed in, loosely most valuable first. */
export const CHANNEL_ORDER: Channel[] = [
  'organic',
  'ai',
  'ads',
  'social',
  'referral',
  'search',
  'direct',
];
