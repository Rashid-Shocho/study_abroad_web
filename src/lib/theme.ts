// Light / Dark, shared by nexted.app, ielts.nexted.app and studyabroad.nexted.app:
// the choice is a cookie on the widest domain the browser accepts for this
// site (it refuses public suffixes like "app", so in production that is
// nexted.app; on localhost the cookie is shared across ports anyway). Found in
// the browser, not from COOKIE_DOMAIN, because static pages are built before
// that is known. Not httpOnly (the boot script reads it before the first
// paint); it holds only "day" or "night". Keep this file the same in all
// three projects (only LEGACY_KEY differs).

export type Theme = 'day' | 'night';

/** This site's own key from before the choice was shared (carried over once). */
const LEGACY_KEY = 'sa_theme';

/** Saves [t] for every nextED site. The boot script below carries the same steps in plain JS. */
function save(t: Theme) {
  const attrs = `; path=/; max-age=31536000; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  const host = location.hostname;
  const parts = host.split('.');
  if (parts.length > 1 && !/^[0-9.]+$/.test(host)) {
    // Shortest first: "nexted.app" before "ielts.nexted.app"; a probe cookie tells which the browser accepts.
    for (let i = parts.length - 2; i >= 0; i--) {
      const domain = parts.slice(i).join('.');
      document.cookie = `nx_probe=1; path=/; domain=${domain}`;
      if (document.cookie.includes('nx_probe=1')) {
        document.cookie = `nx_probe=; path=/; max-age=0; domain=${domain}`;
        document.cookie = `nx_theme=${t}${attrs}; domain=${domain}`;
        return;
      }
    }
  }
  document.cookie = `nx_theme=${t}${attrs}`;
}

/** Runs in <head> before the first paint: applies the saved choice (no flash). */
export const themeBootScript = `(function(){var d=document.documentElement,m=document.cookie.match(/(?:^|; )nx_theme=(day|night)(?:;|$)/),t=m&&m[1];if(!t){try{t=localStorage.getItem('${LEGACY_KEY}')}catch(e){}if(t==='day'||t==='night'){var a='; path=/; max-age=31536000; samesite=lax'+(location.protocol==='https:'?'; secure':''),h=location.hostname,p=h.split('.'),done=false;if(p.length>1&&!/^[0-9.]+$/.test(h)){for(var i=p.length-2;i>=0&&!done;i--){var c=p.slice(i).join('.');document.cookie='nx_probe=1; path=/; domain='+c;if(document.cookie.indexOf('nx_probe=1')>=0){document.cookie='nx_probe=; path=/; max-age=0; domain='+c;document.cookie='nx_theme='+t+a+'; domain='+c;done=true}}}if(!done)document.cookie='nx_theme='+t+a}}if(t==='day'||t==='night')d.setAttribute('data-theme',t)})();`;

/** Applies [t] here and saves it for all three sites. */
export function saveTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  save(t);
}
