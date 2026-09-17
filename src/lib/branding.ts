/**
 * Site branding — the one place this league's own name lives.
 *
 * ⚠️ PLACEHOLDER VALUES. Everything below is a stand-in until the real league
 * name and logo arrive. Edit this file (and drop the logo at
 * `public/hero/logo.svg`) and the whole site follows — the browser tab, the
 * splash page, the drawer, and the link-preview images.
 *
 * Note these are only *fallbacks* for the chrome. Once a sync has run, the
 * header and drawer prefer the league's real name as it is set in Sleeper, so
 * most of the site self-brands from the league itself. These cover the splash
 * page, metadata, and the moments before any data has loaded.
 *
 * Kept free of Node-only imports on purpose: client components import it too.
 */

/** Full name, as it should read in a browser tab or a link preview. */
export const LEAGUE_NAME = 'Lads League';

/** Short form for tight spots — the logo's alt text, compact headers. */
export const LEAGUE_SHORT_NAME = 'Lads';

/** Uppercase wordmark burned into recap link-preview images. */
export const LEAGUE_WORDMARK = 'LADS LEAGUE';

/** One-liner used as the site description in metadata. */
export const LEAGUE_TAGLINE = 'Fantasy football league dashboard powered by the Sleeper API';

/**
 * Public hostname, shown in the corner of recap preview images and used to
 * resolve absolute og:image URLs. Override with SITE_URL in the environment.
 */
export const SITE_DOMAIN = 'lads-league.fly.dev';
