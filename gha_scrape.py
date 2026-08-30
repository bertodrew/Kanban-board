#!/usr/bin/env python3
# daily trigger bump 2026-08-30
"""JS/ATS job scraper for GitHub Actions — session-interception + Phenom + Camoufox.

Targets scraper_companies rows discovery_status='discovered' with last_status in
('zero_jobs','embed_no_swiss_jobs') and a career_url — the client-rendered / ATS pages the
static pipeline couldn't read. Reads the target list from Supabase REST (anon).

Strategy per page (this is the "browser session + JSON" architecture):
  1. Render with Chromium; intercept XHR/fetch JSON responses (the ATS job payloads).
  2. If the page is a Phenom People portal, call its refineSearch job API from inside the
     page (POST {host}/widgets, ddoKey=refineSearch, refNum=<tenant>) — cookies/anti-bot
     token are already set by the render, so it returns structured jobs.
  3. Harvest job records from captured JSON + Phenom results; Swiss-filter by real location.
  4. If Chromium was bot-blocked (Cloudflare/Akamai), retry the whole page with Camoufox.

Writes scrape_results.json = [{name, career_url, jobs:[{title, apply_url, location}]}].
The daily Cowork task pulls this, QCs via gha_qc.py, and upserts via the Supabase MCP.
(No SUPABASE_SERVICE_KEY here — the daily task is the single DB writer.)

Env: WAVE_START, WAVE_END (default 0..1000), SUPABASE_URL, SUPABASE_ANON, ENGINE (auto|chromium|camoufox)
"""
import os, re, json, ssl, urllib.request
from urllib.parse import urlparse

SB = os.environ.get('SUPABASE_URL', 'https://znidaissxdmhfevimweo.supabase.co').rstrip('/')
ANON = os.environ.get('SUPABASE_ANON',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaWRhaXNzeGRtaGZldmltd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTAxMDQsImV4cCI6MjA4NTY4NjEwNH0.TYqyHYo3lbFfY-U-GbMCiA1pBvXZQK1-umJyFr9Z8dY')
START = int(os.environ.get('WAVE_START', '0')); END = int(os.environ.get('WAVE_END', '1000'))
ENGINE = os.environ.get('ENGINE', 'auto')
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

SWISS = re.compile(r'switzerland|schweiz|suisse|svizzera|\bCH\b|basel|z[üu]rich|zurich|geneva|gen[èe]ve|'
    r'bern|lausanne|zug|lucerne|luzern|winterthur|st\.?\s?gallen|lugano|biel|bienne|thun|fribourg|'
    r'sch[a]?ffhausen|allschwil|kaiseraugst|rotkreuz|reinach|bubendorf|villeret|vernier|neuch[aâ]tel|'
    r'sion|aarau|olten|baar|wollerau|opfikon|glattbrugg|kloten|d[üu]bendorf|wallisellen|zofingen', re.I)
NONCITY = re.compile(r'germany|deutschland|frankfurt|berlin|m[üu]nchen|munich|hamburg|stuttgart|k[öo]ln|'
    r'bielefeld|austria|\bwien\b|vienna|france|paris|\buk\b|united kingdom|london|spain|madrid|barcelona|'
    r'italy|milano|milan|poland|warsaw|netherlands|amsterdam|belgium|brussels|ireland|dublin|portugal|'
    r'lisbon|\busa\b|united states|boston|new york|\bindia\b|pune|mumbai|bangalore|singapore|china|shanghai|'
    r'japan|tokyo|dubai|thailand|brazil|mexico|canada|toronto', re.I)

TITLE_KEYS = ('title', 'name', 'jobtitle', 'postingtitle', 'job_title', 'positiontitle')
LOC_KEYS = ('citystatecountry', 'location', 'city', 'cities', 'state', 'country', 'primarylocation',
            'locationstext', 'joblocation', 'locations', 'address', 'region', 'worklocation')
URL_KEYS = ('applyurl', 'apply_url', 'url', 'ml_job_url', 'joburl', 'canonicalurl', 'externalpath', 'href')
REQID = re.compile(r'(^|_)(req|jobid|job_id|jobseqno|positionid|posid|slug|externalpath|autoreqid|'
    r'ml_job|jobnumber|ats_job)', re.I)
LOC_SIGNAL = ('citystatecountry', 'location', 'city', 'cities', 'country', 'primarylocation',
              'locationstext', 'joblocation', 'state', 'region', 'worklocation', 'locations')
BLOCK = re.compile(r'just a moment|checking your browser|cloudflare|access denied|enable javascript|'
    r'unusual traffic|are you a human|captcha|verify you are|bot detection|request blocked|akamai', re.I)
LOAD_BTN = re.compile(r'search|suchen|show results?|load more|mehr laden|alle anzeigen|view (all )?jobs?|'
    r'see (all )?jobs?|more jobs?|weitere|find jobs', re.I)
COOKIE_BTN = re.compile(r'accept|akzeptieren|zustimmen|einverstanden|alle akzeptieren|got it|allow all|'
    r'agree|verstanden', re.I)

PHENOM_JS = """async (refNum) => {
  const post = async (body) => {
    try {
      const r = await fetch('/widgets', {method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify(body)});
      if (!r.ok) return null;
      const d = await r.json();
      const find = (o,dep)=>{ if(dep>6||!o||typeof o!=='object') return null;
        if(Array.isArray(o)&&o.length&&o[0]&&(o[0].title||o[0].jobTitle)) return o;
        for(const k in o){ const f=find(o[k],dep+1); if(f) return f; } return null; };
      return find(d,0);
    } catch(e){ return null; }
  };
  const out = [];
  const base = {lang:"en_global", deviceType:"desktop", country:"global", ddoKey:"refineSearch",
                siteType:"external", keywords:"", refNum:refNum, locale:"en_global",
                pageName:"search-results", size:100, jobs:true};
  const facetVariants = [
    {location:"Switzerland", facets:{locationHierarchy1:["Switzerland"]}},
    {location:"Switzerland"},
    {facets:{country:["Switzerland"]}},
    {},
  ];
  for (const fv of facetVariants) {
    let got = 0;
    for (let from = 0; from < 400; from += 100) {
      const arr = await post(Object.assign({from}, base, fv));
      if (!arr || !arr.length) break;
      out.push(...arr); got += arr.length;
      if (arr.length < 100) break;
    }
    if (got) break;
  }
  const seen = new Set(); const res = [];
  for (const j of out) {
    const t = j.title || j.jobTitle || '';
    if (!t || seen.has(t)) continue; seen.add(t);
    res.push({title: t, loc: j.cityStateCountry || j.location || j.city ||
      (j.locations && j.locations[0]) || j.country || '',
      url: j.applyUrl || j.ml_job_url || j.jobUrl || j.canonicalUrl || ''});
  }
  return res;
}"""


def _val(d, keys):
    for k in d:
        if k.lower() in keys:
            v = d[k]
            if isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, list) and v and isinstance(v[0], str):
                return ", ".join(v[:3])
            if isinstance(v, dict):
                for kk in ('name', 'label', 'city', 'displayName'):
                    if isinstance(v.get(kk), str):
                        return v[kk]
    return ''


def is_job(d):
    tkey = next((k for k in d if k.lower() in TITLE_KEYS and isinstance(d[k], str) and d[k].strip()), None)
    if not tkey:
        return None
    title = d[tkey].strip()
    if not (8 <= len(title) <= 150):
        return None
    if not (any(k.lower() in LOC_SIGNAL for k in d) or any(REQID.search(k) for k in d)):
        return None
    return {'title': title[:120], 'loc': _val(d, LOC_KEYS), 'url': _val(d, URL_KEYS)}


def walk(obj, out, depth=0):
    if depth > 9:
        return
    if isinstance(obj, list):
        for it in obj:
            walk(it, out, depth + 1)
    elif isinstance(obj, dict):
        rec = is_job(obj)
        if rec:
            out.append(rec)
        for v in obj.values():
            if isinstance(v, (list, dict)):
                walk(v, out, depth + 1)


def coax(page):
    for fr in page.frames:
        try:
            for b in fr.query_selector_all('button, a'):
                t = (b.inner_text() or '').strip()
                if t and COOKIE_BTN.search(t) and len(t) < 30:
                    b.click(timeout=1200); page.wait_for_timeout(400); break
        except Exception:
            pass
    try:
        for b in page.query_selector_all('button, a, input[type=submit]'):
            t = (b.inner_text() or '').strip()
            if t and LOAD_BTN.search(t) and len(t) < 40:
                b.click(timeout=1200); page.wait_for_timeout(1500); break
    except Exception:
        pass
    for _ in range(3):
        try: page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        except Exception: pass
        page.wait_for_timeout(800)
    try: page.wait_for_load_state('networkidle', timeout=5000)
    except Exception: pass


def swiss_ok(loc):
    if not loc:
        return True                      # no location in list payload -> keep, QC decides
    if NONCITY.search(loc):
        return False
    return bool(SWISS.search(loc))


def harvest(page, url):
    captured, cap_urls, all_xhr = [], [], []

    def on_resp(resp):
        try:
            if 'json' not in (resp.headers or {}).get('content-type', '').lower():
                return
            if len(all_xhr) < 60:
                all_xhr.append(resp.url[:120])
            if not re.search(r'job|search|cxs|apply|positions|vacan|career|posting|widgets', resp.url, re.I):
                return
            captured.append(resp.json()); cap_urls.append(resp.url)
        except Exception:
            pass

    page.on('response', on_resp)
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(2500)
    blocked = bool(BLOCK.search((page.content() or '')[:6000]))
    coax(page)
    page.wait_for_timeout(1200)

    recs = []
    # Phenom refineSearch (tenant from config XHR)
    tenant = ''
    for u in all_xhr:
        m = re.search(r'phenompeople\.com/api/([A-Z0-9]+)/', u)
        if m:
            tenant = m.group(1); break
    if tenant:
        try:
            for r in (page.evaluate(PHENOM_JS, tenant) or []):
                if r.get('title'):
                    recs.append(r)
        except Exception:
            pass
    # generic interception harvest
    for body in captured[:60]:
        walk(body, recs)

    seen, jobs = set(), []
    for r in recs:
        t = r['title']
        if t.lower() in seen or not swiss_ok(r.get('loc', '')):
            continue
        seen.add(t.lower())
        jobs.append({'title': t, 'apply_url': r.get('url') or url,
                     'location': r.get('loc', '') or 'Switzerland'})
    return jobs, blocked


def scrape_chromium(targets, results):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        for c in targets:
            pg = b.new_page(user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36')
            try:
                jobs, blocked = harvest(pg, c['career_url'])
            except Exception as e:
                jobs, blocked = [], False
                results[c['id']]['error'] = str(e)[:100]
            results[c['id']].update(jobs=jobs, blocked=blocked)
            try: pg.close()
            except Exception: pass
            print(f"[chr] {c['name'][:28]:28s} jobs={len(jobs)} blocked={blocked}", flush=True)
        b.close()


def scrape_camoufox(targets, results):
    from camoufox.sync_api import Camoufox
    with Camoufox(headless=True, humanize=True, geoip=True) as b:
        for c in targets:
            pg = b.new_page()
            try:
                jobs, blocked = harvest(pg, c['career_url'])
            except Exception as e:
                jobs, blocked = [], False
                results[c['id']]['error'] = str(e)[:100]
            results[c['id']].update(jobs=jobs, blocked=blocked)
            try: pg.close()
            except Exception: pass
            print(f"[cam] {c['name'][:28]:28s} jobs={len(jobs)} blocked={blocked}", flush=True)
        b.close()


# Known JS/ATS-hard companies (mostly Phenom) proven to need the browser-session extractor.
# Seeded explicitly because their scraper_companies.last_status is 'checked' (not in the
# zero_jobs target filter), yet the static pipeline can't read them.
SEED = [
    {'id': 'seed-roche', 'name': 'Roche', 'career_url': 'https://careers.roche.com/global/en'},
    {'id': 'seed-givaudan', 'name': 'Givaudan', 'career_url': 'https://careers.givaudan.com/global/en'},
    {'id': 'seed-straumann', 'name': 'Straumann Group', 'career_url': 'https://careers.straumann.com'},
    {'id': 'seed-kuehne', 'name': 'Kuehne + Nagel', 'career_url': 'https://jobs.kuehne-nagel.com/global/en'},
    {'id': 'seed-bayer', 'name': 'Bayer', 'career_url': 'https://talent.bayer.com'},
    # WAF/anti-bot targets — plain Chromium is usually blocked here; the auto-engine
    # Camoufox retry pass (see main()) is the fallback for these.
    {'id': 'seed-nestle', 'name': 'Nestlé', 'career_url': 'https://www.nestle.com/jobs/search-jobs'},
    {'id': 'seed-swisslife', 'name': 'Swiss Life', 'career_url': 'https://www.swisslife.com/en/about-us/jobs.html'},
    {'id': 'seed-boehringer', 'name': 'Boehringer Ingelheim', 'career_url': 'https://careers.boehringer-ingelheim.com'},
    {'id': 'seed-neurimmune', 'name': 'Neurimmune', 'career_url': 'https://www.neurimmune.com/company/careers'},
]


def load_targets():
    q = ("select=id,name,career_url&discovery_status=eq.discovered"
         "&last_status=in.(zero_jobs,embed_no_swiss_jobs)&career_url=not.is.null&order=name.asc")
    req = urllib.request.Request(f"{SB}/rest/v1/scraper_companies?{q}",
        headers={'apikey': ANON, 'Authorization': 'Bearer ' + ANON})
    db = json.load(urllib.request.urlopen(req, timeout=30, context=CTX))
    seen = {t['career_url'] for t in SEED}
    return SEED + [t for t in db if t['career_url'] not in seen]


def main():
    targets = load_targets()[START:END]
    results = {c['id']: {'id': c['id'], 'name': c['name'], 'career_url': c['career_url'],
                         'jobs': [], 'blocked': False} for c in targets}

    if ENGINE in ('auto', 'chromium'):
        scrape_chromium(targets, results)
    # Camoufox pass: retry the blocked ones (auto) or everything (camoufox)
    if ENGINE == 'camoufox':
        retry = targets
    else:
        retry = [c for c in targets if results[c['id']].get('blocked') or not results[c['id']]['jobs']]
    if ENGINE in ('auto', 'camoufox') and retry:
        print(f"\n== Camoufox retry: {len(retry)} pages ==", flush=True)
        cam_results = {c['id']: dict(results[c['id']]) for c in retry}
        try:
            scrape_camoufox(retry, cam_results)
            for cid, r in cam_results.items():
                if len(r.get('jobs', [])) > len(results[cid]['jobs']):
                    results[cid] = r     # keep the better engine's result
        except Exception as e:
            print("CAMOUFOX PASS FAILED:", str(e)[:150], flush=True)

    out = [{'name': r['name'], 'career_url': r['career_url'], 'jobs': r['jobs']}
           for r in results.values()]
    json.dump(out, open('scrape_results.json', 'w'), ensure_ascii=False, indent=1)
    total = sum(len(r['jobs']) for r in out)
    print(f"\nWAVE {START}-{END}: pages={len(out)} jobs={total}", flush=True)


if __name__ == '__main__':
    main()
# daily sweep trigger 2026-08-26T00:29:03Z

# daily sweep trigger: 2026-08-27T07:09:53Z
# trigger bump 2026-08-29
