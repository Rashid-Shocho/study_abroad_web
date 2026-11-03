import type { MetadataRoute } from 'next';

/** Nothing public here: the landing page and sign-up are on the nextED portal (nexted.app). */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
