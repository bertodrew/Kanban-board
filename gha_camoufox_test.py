#!/usr/bin/env python3
"""A/B test: JSON-interception extractor, Chromium vs Camoufox.

Instead of scraping <a> anchors (which these ATS SPAs don't use for jobs), we
render the page to establish a real session, coax it to fire its XHR/fetch, and
harvest the JSON job lists the page itself downloads. Camoufox is used as a
conditional fallback for domains whose anti-bot walls a plain Chromium session.

Pure measurement: writes camoufox_test_results.json, NO DB write.
"""
import re, json, traceback

TARGETS = [
    ("Bayer",                "https://talent.bayer.com"),
    ("Boehringer Ingelheim", "https://careers.boehringer-ingelheim.com"),
    ("Givaudan",             "https://jobs.givaudan.com/search/"),
    ("Kuehne + Nagel",       "https://jobs.kuehne-nagel.com/global/en"),
    ("Nestlé",               "https://www.nestle.com/jobs/search-jobs"),
    ("Roche",                "https://careers.roche.com/global/en"),
    ("Straumann Group",      "https://careers.straumann.com"),
    ("Swiss Life",           "https://www.swisslife.com/en/about-us/jobs.html"),
]

SWISS = re.compile(r'switzerland|schweiz|suisse|svizzera|\bCH\b|basel|z[üu]rich|zurich|geneva|gen[èe]ve|'
    r'bern|lausanne|zug|lucerne|luzern|winterthur|st\.?\s?gallen|lugano|biel|thun|fribourg|'
    r'sch[a]?ffhausen|allschwil|kaiseraugst|rotkreuz|reinach|bubendorf', re.I)
NONCITY = re.compile(r'frankfurt|berlin|m[üu]nchen|munich|hamburg|boston|new york|london|paris|madrid|'
    r'barcelona|wien|vienna|amsterdam|dublin|milano|singapore|pune|mumbai|warsaw|dubai|shanghai|tokyo', re.I)
TITLE_KEYS = ('title', 'name', 'jobtitle', 'postingtitle', 'job_title', 'positiontitle')
LOC_KEYS = ('location', 'city', 'cities', 'state', 'country', 'primarylocation', 'locationstext',
            'locationsText', 'joblocation', 'location_name', 'address', 'region')
URL_KEYS = ('applyurl', 'apply_url', 'url', 'ml_job_url', 'canonicalurl', 'joburl', 'externalpath',
            'apppath', 'joburl', 'href', 'link')
BLOCK = re.compile(r'just a moment|checking your browser|cloudflare|access denied|enable javascript|'
    r'unusual traffic|are you a human|captcha|verify you are|bot detection|request blocked|akamai', re.I)
LOAD_BTN = re.compile(r'search|suchen|show results?|load more|mehr laden|alle anzeigen|view (all )?jobs?|'
    r'see (all )?jobs?|more jobs?|weitere|find jobs', re.I)
COOKIE_BTN = re.compile(r'accept|akzeptieren|zustimmen|einverstanden|alle akzeptieren|got it|allow all|'
    r'agree|verstanden', re.I)


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


REQID = re.compile(r'(^|_)(req|jobid|job_id|jobseqno|positionid|posid|slug|externalpath|autoreqid|'
    r'ml_job|jobnumber|joburl|applyurl|ats_job)', re.I)
LOC_SIGNAL = ('location', 'city', 'cities', 'country', 'primarylocation', 'locationstext',
              'locationlatlong', 'joblocation', 'state', 'region', 'worklocation')


def is_job(d):
    """A job record has a title AND a strong job signal (location or requisition id)."""
    keys = list(d.keys())
    tkey = next((k for k in keys if k.lower() in TITLE_KEYS and isinstance(d[k], str) and d[k].strip()), None)
    if not tkey:
        return None
    title = d[tkey].strip()
    if not (8 <= len(title) <= 150):
        return None
    loc_sig = any(k.lower() in LOC_SIGNAL for k in keys)
    id_sig = any(REQID.search(k) for k in keys)
    if not (loc_sig or id_sig):
        return None
    return {'title': title[:120], 'loc': _val(d, LOC_KEYS), 'url': _val(d, URL_KEYS)}


def walk(obj, out, depth=0):
    """Recursively find dicts that look like job records; collect (title, loc, url)."""
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
                b.click(timeout=1200); page.wait_for_timeout(1800); break
    except Exception:
        pass
    for _ in range(4):
        try: page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        except Exception: pass
        page.wait_for_timeout(900)
    try: page.wait_for_load_state('networkidle', timeout=6000)
    except Exception: pass


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
  const base = {lang:"en_global", deviceType:"desktop", country:"global", ddoKey:"refineSearch",
                siteType:"external", keywords:"", refNum:refNum, locale:"en_global",
                pageName:"search-results", size:100, from:0, jobs:true};
  const variants = [
    Object.assign({}, base, {location:"Switzerland", facets:{locationHierarchy1:["Switzerland"]}}),
    Object.assign({}, base, {location:"Switzerland"}),
    Object.assign({}, base, {facets:{country:["Switzerland"]}}),
    Object.assign({}, base, {location:"Switzerland", pageName:"search-results-page"}),
  ];
  let all = [];
  for (const v of variants) { const arr = await post(v); if (arr && arr.length) { all = arr; break; } }
  return all.map(j => ({title: j.title || j.jobTitle || '',
    loc: j.cityStateCountry || j.location || j.city || (j.locations&&j.locations[0]) || j.country || '',
    url: j.applyUrl || j.ml_job_url || j.jobUrl || j.canonicalUrl || ''}));
}"""


PHENOM_DEBUG_JS = """async (T) => {
  const attempts = [
    ['q tenantId', '/api/apply/v2/jobs?tenantId='+T+'&location=Switzerland&limit=5', {}],
    ['hdr tenantid', '/api/apply/v2/jobs?location=Switzerland&limit=5', {'tenantid': T}],
    ['hdr X-PH', '/api/apply/v2/jobs?location=Switzerland&limit=5', {'X-PH-Tenant-Id': T}],
    ['q ph_id', '/api/apply/v2/jobs?ph_id='+T+'&location=Switzerland&limit=5', {}],
  ];
  const res = [];
  for (const [lbl, p, hdr] of attempts) {
    try {
      const r = await fetch(p, {headers: Object.assign({'Accept':'application/json'}, hdr)});
      let info = lbl + ' status=' + r.status;
      try {
        const d = await r.json();
        info += ' errMsg=' + JSON.stringify(d.errorMsg);
        const data = d.data || {};
        const jobs = data.jobs || data.positions || data.jobList || data.results;
        if (Array.isArray(jobs)) { info += ' JOBS=' + jobs.length;
          if (jobs[0]) info += ' fields=' + JSON.stringify(Object.keys(jobs[0]).slice(0,12))
                            + ' t=' + JSON.stringify(jobs[0].title||jobs[0].name||''); }
        else info += ' data.keys=' + JSON.stringify(Object.keys(data).slice(0,10));
      } catch(e){ info += ' (not json)'; }
      res.push(info);
    } catch(e) { res.push(lbl + ' ERR'); }
  }
  return res;
}"""


def phenom_api(page, tenant):
    if not tenant:
        return []
    try:
        recs = page.evaluate(PHENOM_JS, tenant) or []
        return [{'title': r['title'], 'loc': r.get('loc', ''), 'url': r.get('url', '')}
                for r in recs if r.get('title')]
    except Exception:
        return []


def harvest(page, url):
    captured = []
    cap_urls = []

    all_xhr = []
    post_bodies = []

    def on_req(req):
        try:
            if req.method == 'POST' and re.search(r'/widgets|graphql|search|jobs', req.url, re.I):
                pd = req.post_data
                if pd and re.search(r'job|search|location|query', pd, re.I) and len(post_bodies) < 12:
                    post_bodies.append({'url': req.url[:70], 'body': pd[:600]})
        except Exception:
            pass

    def on_resp(resp):
        try:
            ct = (resp.headers or {}).get('content-type', '')
            if 'json' not in ct.lower():
                return
            rurl = resp.url
            if len(all_xhr) < 60:
                all_xhr.append(rurl[:110])
            if not re.search(r'job|search|cxs|apply|positions|vacan|career|posting', rurl, re.I):
                return
            body = resp.json()
            captured.append(body); cap_urls.append(rurl)
        except Exception:
            pass

    page.on('request', on_req)
    page.on('response', on_resp)
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(2500)
    content = (page.content() or '')[:6000]
    blocked = bool(BLOCK.search(content))
    coax(page)
    page.wait_for_timeout(1500)

    # DEBUG: record the shape of every captured JSON — arrays of dicts and their keys
    schemas = []
    def schema(o, path, urlref):
        if isinstance(o, list) and o and isinstance(o[0], dict):
            schemas.append({'url': urlref[:80], 'path': path, 'n': len(o),
                            'keys': list(o[0].keys())[:25]})
        elif isinstance(o, dict):
            for k, v in list(o.items())[:40]:
                if isinstance(v, (list, dict)):
                    schema(v, f"{path}.{k}", urlref)
    for i, body in enumerate(captured[:60]):
        schema(body, '$', cap_urls[i] if i < len(cap_urls) else '?')

    # Phenom People: derive tenant (refNum) from captured config XHR or POST bodies, then
    # call the refineSearch job API from inside the page (session cookies + anti-bot token set).
    tenant = ''
    for u in all_xhr:
        m = re.search(r'phenompeople\.com/api/([A-Z0-9]+)/', u)
        if m: tenant = m.group(1); break
    if not tenant:
        for pb in post_bodies:
            m = re.search(r'"refNum"\s*:\s*"([A-Z0-9]+)"', pb.get('body', ''))
            if m: tenant = m.group(1); break
    phenom_recs = phenom_api(page, tenant)

    recs = list(phenom_recs)
    for body in captured[:60]:
        walk(body, recs)
    # dedup + Swiss filter
    seen, jobs = set(), []
    for r in recs:
        t = r['title']
        if t.lower() in seen:
            continue
        loc = r.get('loc', '')
        if NONCITY.search(loc):
            continue
        # keep if location is Swiss OR (no location captured — many APIs omit it in list view)
        if loc and not SWISS.search(loc):
            continue
        seen.add(t.lower())
        jobs.append({'title': t, 'loc': loc[:40]})
    # extract Phenom tenant from config XHR (content-ir.phenompeople.com/api/{TENANT}/)
    tenant = ''
    for u in all_xhr:
        m = re.search(r'phenompeople\.com/api/([A-Z0-9]+)/', u)
        if m:
            tenant = m.group(1); break
    try:
        probe = {'tenant': tenant, 'r': page.evaluate(PHENOM_DEBUG_JS, tenant) if tenant else 'no-tenant'}
    except Exception as e:
        probe = ['eval-err: ' + str(e)[:60]]
    dbg = {'xhr_urls': [u for u in all_xhr if re.search(r'/api/|/widgets|search|jobs|cxs|phenom', u, re.I)][:20],
           'phenom_probe': probe, 'post_bodies': post_bodies}
    return len(jobs), blocked, len(captured), jobs[:6], schemas[:12], dbg


def run_engine(engine, results):
    if engine == 'chromium':
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
            _loop(b, engine, results, ua='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36')
            b.close()
    else:
        from camoufox.sync_api import Camoufox
        with Camoufox(headless=True, humanize=True, geoip=True) as b:
            _loop(b, engine, results, ua=None)
            b.close()


def _loop(b, engine, results, ua):
    for name, url in TARGETS:
        pg = b.new_page(user_agent=ua) if ua else b.new_page()
        r = {'njobs': 0, 'blocked': None, 'xhr': 0, 'status': '', 'sample': [], 'schemas': [], 'dbg': {}}
        try:
            r['njobs'], r['blocked'], r['xhr'], r['sample'], r['schemas'], r['dbg'] = harvest(pg, url)
            r['status'] = 'ok' if r['njobs'] else ('blocked' if r['blocked'] else 'no_jobs')
        except Exception as e:
            r['status'] = 'error'; r['error'] = str(e)[:120]
        try: pg.close()
        except Exception: pass
        results[name][engine] = r
        print(f"[{engine}] {name[:22]:22s} {r['status']:8s} jobs={r['njobs']} xhr={r.get('xhr',0)} blocked={r['blocked']}", flush=True)


def main():
    results = {name: {'url': url} for name, url in TARGETS}
    for engine in ('chromium', 'camoufox'):
        print(f"\n=== {engine} pass ===", flush=True)
        try:
            run_engine(engine, results)
        except Exception:
            print(f"{engine.upper()} PASS FAILED\n" + traceback.format_exc(), flush=True)
    json.dump(results, open('camoufox_test_results.json', 'w'), ensure_ascii=False, indent=1)

    print("\n=== SUMMARY (jobs / xhr / blocked) ===")
    print(f"{'company':22s} {'chromium':>18s} {'camoufox':>18s}  winner")
    wins = {'chromium': 0, 'camoufox': 0, 'tie': 0}
    for name, url in TARGETS:
        ch = results[name].get('chromium', {}) or {}
        cf = results[name].get('camoufox', {}) or {}
        cj, fj = ch.get('njobs', 0), cf.get('njobs', 0)
        w = 'camoufox' if fj > cj else ('chromium' if cj > fj else 'tie')
        wins[w] += 1
        cs = f"{cj}j/x{ch.get('xhr',0)}/{'B' if ch.get('blocked') else '-'}"
        fs = f"{fj}j/x{cf.get('xhr',0)}/{'B' if cf.get('blocked') else '-'}"
        print(f"{name[:22]:22s} {cs:>18s} {fs:>18s}  {w}")
    print(f"\nwins: {wins}")
    print("EXIT_0")


if __name__ == '__main__':
    main()
