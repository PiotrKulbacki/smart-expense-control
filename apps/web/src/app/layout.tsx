import { JetBrains_Mono, Outfit } from 'next/font/google';
import { cookies } from 'next/headers';
import { MeshBackground } from '@web/components/MeshBackground';
import { PostHogProvider } from '@web/features/analytics/components/PostHogProvider';
import { ToastProvider } from '@web/features/auth/components/ToastProvider';
import { CookieConsentProvider } from '@web/features/cookie-consent';
import { LocaleProvider } from '@web/features/i18n/LocaleProvider';
import { QueryProvider } from '@web/features/query/QueryProvider';
import { DEFAULT_LOCALE, isLocale } from '@shared/features/i18n';
import type { Metadata } from 'next';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lyamo',
  description: 'Financial management with AI-powered insights',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('sec_locale')?.value;
  const initialLocale = localeCookie && isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <html
      lang={initialLocale}
      className={`dark ${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {/* #region agent log */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var S='0a29fa',E='http://127.0.0.1:7528/ingest/e3c1f8a3-0097-405d-aadf-389a4a28577c';function send(h,m,d){fetch(E,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':S},body:JSON.stringify({sessionId:S,hypothesisId:h,location:'layout.tsx:early',message:m,data:d,timestamp:Date.now()})}).catch(function(){})}var nav=performance.getEntriesByType('navigation')[0];send('B','early-nav',{path:location.pathname,ttfb:nav?Math.round(nav.responseStart):null,domContentLoaded:nav?Math.round(nav.domContentLoadedEventEnd):null,cssLinks:document.querySelectorAll('link[rel=stylesheet]').length,scriptTags:document.scripts.length,heroInDom:!!document.querySelector('p.text-muted.mt-6.text-lg'),hasPolyfillChunk:!!document.querySelector('script[src*="polyfills"]')});new PerformanceObserver(function(list){list.getEntries().forEach(function(e){if(e.name==='first-contentful-paint')send('A','fcp',{fcp:Math.round(e.startTime)})})}).observe({type:'paint',buffered:true});new PerformanceObserver(function(list){var entries=list.getEntries();if(!entries.length)return;var e=entries[entries.length-1];var el=e.element;send('A','lcp',{lcp:Math.round(e.startTime),tag:el?el.tagName:null,cls:el&&el.className?String(el.className).slice(0,80):null,text:el&&el.textContent?String(el.textContent).slice(0,60):null,size:e.size||null})}).observe({type:'largest-contentful-paint',buffered:true});if(PerformanceObserver.supportedEntryTypes&&PerformanceObserver.supportedEntryTypes.indexOf('longtask')>=0){var lt=0,ltTotal=0;new PerformanceObserver(function(list){list.getEntries().forEach(function(e){lt++;ltTotal+=e.duration});send('A','longtasks',{count:lt,totalMs:Math.round(ltTotal)})}).observe({type:'longtask',buffered:true})}document.fonts&&document.fonts.ready.then(function(){send('D','fonts-ready',{status:document.fonts.status,readyMs:Math.round(performance.now())})});window.addEventListener('load',function(){var css=performance.getEntriesByType('resource').filter(function(r){return String(r.name).indexOf('.css')>=0});send('B','load-resources',{css:css.map(function(r){return{name:String(r.name).slice(-40),duration:Math.round(r.duration),transfer:r.transferSize||0,blocking:r.renderBlockingStatus||null}}),jsCount:performance.getEntriesByType('resource').filter(function(r){return String(r.name).indexOf('.js')>=0}).length})});}catch(e){}})();`,
          }}
        />
        {/* #endregion */}
        <MeshBackground />
        <LocaleProvider initialLocale={initialLocale}>
          <CookieConsentProvider>
            <QueryProvider>
              <PostHogProvider>
                {children}
                <ToastProvider />
              </PostHogProvider>
            </QueryProvider>
          </CookieConsentProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
