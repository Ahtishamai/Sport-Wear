import { describe, expect, it } from 'vitest';
import {
  CHANNEL_LABEL,
  CHANNEL_ORDER,
  botCheck,
  classify,
  deviceOf,
  hostOf,
} from '@/lib/traffic';

const SELF = 'design-sportswear.com';
const from = (referrer: string | null, landing = '/collections/baseball-uniform') =>
  classify({ referrer, landing, self: SELF });

describe('reading a host out of a referrer', () => {
  it('drops the scheme, the path and the www', () => {
    expect(hostOf('https://www.google.com/search?q=jerseys')).toBe('google.com');
  });

  it('copes with a bare host', () => {
    expect(hostOf('chatgpt.com')).toBe('chatgpt.com');
  });

  it('gives nothing for nothing', () => {
    expect(hostOf('')).toBe('');
    expect(hostOf(null)).toBe('');
    expect(hostOf('not a url at all ://')).toBe('');
  });
});

describe('a click from an AI assistant', () => {
  it('knows ChatGPT by either of its hosts', () => {
    expect(from('https://chatgpt.com/')).toMatchObject({ channel: 'ai', source: 'chatgpt' });
    expect(from('https://chat.openai.com/c/abc')).toMatchObject({ channel: 'ai', source: 'chatgpt' });
  });

  it('knows Claude', () => {
    expect(from('https://claude.ai/chat/123')).toMatchObject({ channel: 'ai', source: 'claude' });
  });

  it('knows the rest of them', () => {
    expect(from('https://www.perplexity.ai/search/x')).toMatchObject({ source: 'perplexity' });
    expect(from('https://copilot.microsoft.com/')).toMatchObject({ source: 'copilot' });
    expect(from('https://gemini.google.com/app')).toMatchObject({ channel: 'ai', source: 'gemini' });
  });

  it('does not mistake Gemini for a Google search', () => {
    // gemini.google.com would otherwise match the google.* rule and be
    // filed as organic, hiding every click an AI sent.
    expect(from('https://gemini.google.com/app').channel).toBe('ai');
  });

  it('is not fooled by a host that merely contains the name', () => {
    expect(from('https://notchatgpt.com/').channel).toBe('referral');
    expect(from('https://chatgpt.com.evil.net/').channel).toBe('referral');
  });

  it('counts a subdomain of a known assistant', () => {
    expect(from('https://sub.claude.ai/x')).toMatchObject({ channel: 'ai', source: 'claude' });
  });
});

describe('a click from Google', () => {
  it('with nothing attached is organic', () => {
    expect(from('https://www.google.com/')).toMatchObject({ channel: 'organic', source: 'google' });
  });

  it('is organic from any country domain', () => {
    expect(from('https://www.google.co.uk/').channel).toBe('organic');
    expect(from('https://google.com.au/').channel).toBe('organic');
  });

  it('carrying a gclid is paid, however it looks', () => {
    // The case that makes ad spend look like free traffic.
    const paid = classify({
      referrer: 'https://www.google.com/',
      landing: '/collections/baseball-uniform?gclid=EAIaIQobCh',
      self: SELF,
    });
    expect(paid).toMatchObject({ channel: 'ads', source: 'google', medium: 'cpc' });
  });

  it('counts the newer Google Ads click ids too', () => {
    expect(classify({ landing: '/?gbraid=abc', self: SELF }).channel).toBe('ads');
    expect(classify({ landing: '/?wbraid=abc', self: SELF }).channel).toBe('ads');
  });

  it('counts a Microsoft Ads click', () => {
    expect(classify({ landing: '/?msclkid=abc', self: SELF })).toMatchObject({
      channel: 'ads',
      source: 'bing',
    });
  });
});

describe('campaign tags the shop put on its own links', () => {
  it('treat cpc as paid', () => {
    expect(
      classify({ landing: '/?utm_source=facebook&utm_medium=cpc&utm_campaign=spring', self: SELF })
    ).toMatchObject({ channel: 'ads', source: 'facebook', campaign: 'spring' });
  });

  it('treat a social medium as social', () => {
    expect(
      classify({ landing: '/?utm_source=instagram&utm_medium=social', self: SELF })
    ).toMatchObject({ channel: 'social', source: 'instagram' });
  });

  it('keep the campaign name for the report', () => {
    expect(classify({ landing: '/?utm_source=mailchimp&utm_campaign=fall-teams', self: SELF }).campaign)
      .toBe('fall-teams');
  });

  it('beat the referrer, because the shop knows what it tagged', () => {
    const tagged = classify({
      referrer: 'https://t.co/abc',
      landing: '/?utm_source=chatgpt&utm_medium=referral',
      self: SELF,
    });
    expect(tagged).toMatchObject({ channel: 'ai', source: 'chatgpt' });
  });
});

describe('the other buckets', () => {
  it('file a search engine that is not Google on its own', () => {
    expect(from('https://www.bing.com/search?q=x')).toMatchObject({ channel: 'search', source: 'bing' });
    expect(from('https://duckduckgo.com/')).toMatchObject({ channel: 'search', source: 'duckduckgo' });
  });

  it('file the social networks', () => {
    expect(from('https://www.facebook.com/')).toMatchObject({ channel: 'social', source: 'facebook' });
    expect(from('https://t.co/xyz')).toMatchObject({ channel: 'social', source: 'x' });
    expect(from('https://l.instagram.com/')).toMatchObject({ source: 'instagram' });
  });

  it('file anything else as a referral, named by its host', () => {
    expect(from('https://www.teamsnap.com/blog/post')).toMatchObject({
      channel: 'referral',
      source: 'teamsnap.com',
    });
  });

  it('call an empty referrer direct', () => {
    expect(from(null)).toMatchObject({ channel: 'direct', source: 'direct' });
    expect(from('')).toMatchObject({ channel: 'direct', source: 'direct' });
  });

  it('never count the shop linking to itself as an arrival', () => {
    // Otherwise every click between pages would show up as a referral
    // from the shop, and the busiest source would be the shop itself.
    expect(from('https://design-sportswear.com/collections')).toMatchObject({
      channel: 'direct',
      source: 'internal',
    });
    expect(from('https://www.design-sportswear.com/')).toMatchObject({ source: 'internal' });
  });
});

describe('telling the robots from the people', () => {
  it('names the assistant whose crawler it is', () => {
    expect(botCheck('Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)')).toEqual({
      isBot: true,
      crawler: 'ChatGPT',
    });
    expect(botCheck('Mozilla/5.0 (compatible; ClaudeBot/1.0)')).toEqual({
      isBot: true,
      crawler: 'Claude',
    });
    expect(botCheck('Mozilla/5.0 (compatible; PerplexityBot/1.0)').crawler).toBe('Perplexity');
  });

  it('spots an ordinary crawler without naming one', () => {
    expect(botCheck('Mozilla/5.0 (compatible; AhrefsBot/7.0)')).toEqual({ isBot: true, crawler: null });
    expect(botCheck('curl/8.4.0').isBot).toBe(true);
    expect(botCheck('HeadlessChrome/120.0').isBot).toBe(true);
  });

  it('lets a real browser through', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
    expect(botCheck(chrome)).toEqual({ isBot: false, crawler: null });
  });

  it('treats a missing user agent as a robot', () => {
    expect(botCheck('').isBot).toBe(true);
    expect(botCheck(null).isBot).toBe(true);
  });
});

describe('what they were holding', () => {
  it('tells a phone from a desktop', () => {
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148')).toBe('phone');
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0')).toBe('desktop');
  });

  it('tells a tablet from both', () => {
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Linux; Android 13; SM-X700) Safari/537.36')).toBe('tablet');
  });
});

describe('how the channels read on screen', () => {
  it('gives every channel a label', () => {
    for (const c of CHANNEL_ORDER) expect(CHANNEL_LABEL[c]).toBeTruthy();
  });

  it('lists every channel exactly once', () => {
    expect(new Set(CHANNEL_ORDER).size).toBe(CHANNEL_ORDER.length);
    expect(CHANNEL_ORDER).toHaveLength(Object.keys(CHANNEL_LABEL).length);
  });
});
