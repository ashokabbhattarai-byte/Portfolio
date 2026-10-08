export type DeviceType = 'Desktop' | 'Mobile' | 'Tablet';

export type ReferrerCategory =
  'search' | 'social' | 'ai' | 'direct' | 'internal' | 'referral';

export function parseUserAgent(ua?: string | null): {
  device: DeviceType;
  browser: string;
  os: string;
} {
  if (!ua || typeof ua !== 'string') {
    return { device: 'Desktop', browser: 'Other', os: 'Other' };
  }

  // Device detection
  let device: DeviceType = 'Desktop';
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    device = 'Tablet';
  } else if (
    /(mobile|iphone|ipod|blackberry|iemobile|opera mini|webos)/i.test(ua)
  ) {
    device = 'Mobile';
  }

  // OS detection
  let os = 'Other';
  if (/(iphone|ipad|ipod)/i.test(ua)) {
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/windows nt|windows/i.test(ua)) {
    os = 'Windows';
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS';
  } else if (/linux|x11/i.test(ua)) {
    os = 'Linux';
  }

  // Browser detection
  let browser = 'Other';
  if (/edg([ea]|ios)?\//i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\/|opera\//i.test(ua)) {
    browser = 'Opera';
  } else if (/samsungbrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  }

  return { device, browser, os };
}

export function categorizeReferrer(
  referer?: string | null,
  siteOrigin?: string,
): ReferrerCategory {
  if (!referer || referer === 'Direct / unknown' || referer.trim() === '') {
    return 'direct';
  }

  let host = '';
  try {
    const url = new URL(referer);
    host = url.hostname.toLowerCase();
  } catch {
    host = referer
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split('?')[0];
  }

  if (siteOrigin) {
    try {
      const siteHost = new URL(siteOrigin).hostname.toLowerCase();
      if (host === siteHost || host.endsWith(`.${siteHost}`)) {
        return 'internal';
      }
    } catch {
      // Ignore origin parse error
    }
  }

  const isDomain = (domains: string[]) =>
    domains.some((d) => host === d || host.endsWith(`.${d}`));

  // AI tools / agents
  if (
    isDomain([
      'chatgpt.com',
      'openai.com',
      'claude.ai',
      'anthropic.com',
      'perplexity.ai',
      'phind.com',
      'poe.com',
      'copilot.microsoft.com',
    ])
  ) {
    return 'ai';
  }

  // Search engines
  if (
    isDomain([
      'google.com',
      'google.co.uk',
      'google.ca',
      'google.com.au',
      'google.de',
      'google.fr',
      'google.co.jp',
      'google.com.np',
      'google.com.in',
      'bing.com',
      'duckduckgo.com',
      'yahoo.com',
      'ecosia.org',
      'baidu.com',
      'yandex.com',
      'yandex.ru',
      'startpage.com',
      'kagi.com',
      'qwant.com',
      'search.brave.com',
    ]) ||
    /\bgoogle\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(host)
  ) {
    return 'search';
  }

  // Social networks
  if (
    isDomain([
      't.co',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'lnkd.in',
      'github.com',
      'reddit.com',
      'news.ycombinator.com',
      'youtube.com',
      'youtu.be',
      'instagram.com',
      'facebook.com',
      'fb.com',
      'threads.net',
      'bsky.app',
      'mastodon.social',
    ])
  ) {
    return 'social';
  }

  return 'referral';
}

export function calculateDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const delta = ((current - previous) / previous) * 100;
  return Number(delta.toFixed(1));
}
