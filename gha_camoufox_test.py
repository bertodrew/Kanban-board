#!/usr/bin/env python3
"""Camoufox vs Chromium A/B test with an SPA-aware extractor.

Runs a fixed list of known-hard Swiss career pages through BOTH engines with the
same extractor and reports job-like anchors found per engine + whether blocked.

SPA handling (option B): dismiss cookie banner, click search/load-more buttons,
scroll to trigger lazy-load, harvest anchors from the main doc AND all iframes,
score hrefs to prefer real job-detail links over category/nav links.

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

# --- job-anchor gate ---
NONCITY = re.compile(r'frankfurt|berlin|m[üu]nchen|munich|hamburg|boston|new york|london|paris|'
    r'madrid|barcelona|wien|vienna|amsterdam|dublin|milano|singapore|pune|mumbai|warsaw', re.I)
KW = ['engineer','ingenieur','entwickl','developer','software','manager','lead','leiter','specialist',
'spezialist','scientist','consultant','analyst','techniker','technician','coordinator','architect',
'designer','sales','account','product','produkt','head of','director','associate','administrator',
'intern','praktik','werkstudent','apprentice','lehrstelle','trainee','mitarbeiter','support','devops',
'data','cloud','security','quality','regulatory','clinical','finance','controller','verkauf','einkauf',
'operator','planner','buyer','nurse','pflege','accountant','payroll','servicetechniker','maintenance']
STRONG = re.compile(r'(m/w|w/m|m/f|f/m|\(m|\(w|\d{2,3}\s?%|' + '|'.join(KW) + ')', re.I)
# category/landing words that masquerade as jobs on SPA hubs -> reject
CATEGORY = re.compile(r'^(sales and marketing|interns and apprentices|trainee programmes?|engineering|'
    r'business strategy.*finance|human resources|supply chain|research.*development|manufacturing|'
    r'information technology|our teams?|life at|early careers?|students?|graduates?|professionals?|'
    r'application support|corporate functions?)$', re.I)
JUNK = ['read more','learn more','view all','open application','benefits','our team','about us',
'apply now','see all','offene stellen','all jobs','impressum','datenschutz','cookie','kontakt',
'login','newsletter','mehr erfahren','alle jobs','sign in','register','create account',
'can’t access','cannot access','forgot password','privacy','terms']
# a real job detail URL usually carries an id/slug segment
HREF_DETAIL = re.compile(r'/job[s]?/[^/]*\d|/job/|jobid=|/position/|/vacanc|/stelle/|/o/[a-z0-9\-]{6,}|'
    r'requisition|/apply/|gh_jid=|/postings?/|jobdetail|/careers?/[a-z0-9\-]{8,}\d', re.I)
HREF_JOBWORD = re.compile(r'job|stelle|vacan|position|karriere|career|recruit|apply|/o/|posting|opening|'
    r'lehrstelle|praktik', re.I)
TITLE_HARD = re.compile(r'm/w|w/m|m/f|f/m|\(m|\(w|\d{2,3}\s?%', re.I)
BLOCK = re.compile(r'just a moment|checking your browser|cloudflare|access denied|enable javascript|'
    r'unusual traffic|are you a human|captcha|verify you are|bot detection|request blocked', re.I)

COOKIE_BTN = re.compile(r'accept|akzeptieren|zustimmen|einverstanden|alle akzeptieren|got it|allow all|'
    r'agree|verstanden|ok', re.I)
LOAD_BTN = re.compile(r'search|suchen|jobs? suchen|show results?|load more|mehr laden|alle anzeigen|'
    r'view (all )?jobs?|see (all )?jobs?|more jobs?|weitere', re.I)


def good_title(t):
    tl = (t or '').lower().strip()
    if len(tl) < 8 or len(tl) > 150:
        return False
    if any(j in tl for j in JUNK):
        return False
    if NONCITY.search(tl):
        return False
    if CATEGORY.match(tl):           # reject bare category/landing labels
        return False
    return STRONG.search(tl) is not None


def keep(text, href):
    if not good_title(text):
        return False
    h = href or ''
    # strong keep: URL looks like a real job-detail page, or title has hard signal (%/(m/w/d)
    if HREF_DETAIL.search(h) or TITLE_HARD.search(text):
        return True
    # weak keep: job-ish URL AND title has >=2 words (cuts single-word nav)
    return bool(HREF_JOBWORD.search(h)) and len(text.split()) >= 2


def coax(page):
    """Nudge an SPA into rendering its job list: cookies, search/load buttons, scroll."""
    # cookie banners (best-effort, in main frame + any consent iframe)
    for fr in page.frames:
        try:
            for b in fr.query_selector_all('button, a'):
                t = (b.inner_text() or '').strip()
                if t and COOKIE_BTN.search(t) and len(t) < 30:
                    b.click(timeout=1500); page.wait_for_timeout(400); break
        except Exception:
            pass
    # click a search / load-more button if present
    try:
        for b in page.query_selector_all('button, a, input[type=submit]'):
            t = (b.inner_text() if b else '' or '').strip()
            if t and LOAD_BTN.search(t) and len(t) < 40:
                b.click(timeout=1500); page.wait_for_timeout(1500); break
    except Exception:
        pass
    # lazy-load: scroll to bottom several times
    for _ in range(6):
        try:
            page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        except Exception:
            pass
        page.wait_for_timeout(900)
    try:
        page.wait_for_load_state('networkidle', timeout=6000)
    except Exception:
        pass


def collect_anchors(page):
    """Anchors from the main document AND every iframe."""
    js = 'els => els.map(a => ({t:(a.textContent||"").trim(), h:a.href}))'
    out = []
    for fr in page.frames:
        try:
            out.extend(fr.eval_on_selector_all('a', js))
        except Exception:
            pass
    return out


def harvest(page, url):
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(2500)
    body = (page.content() or '')[:6000]
    blocked = bool(BLOCK.search(body))
    coax(page)
    anchors = collect_anchors(page)
    out, seen = [], set()
    for a in anchors:
        t = re.sub(r'\s+', ' ', a.get('t') or '').strip()
        if keep(t, a.get('h')) and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t[:90])
    return len(out), blocked, out[:6]


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
        r = {'njobs': 0, 'blocked': None, 'status': '', 'sample': []}
        try:
            r['njobs'], r['blocked'], r['sample'] = harvest(pg, url)
            r['status'] = 'ok' if r['njobs'] else ('blocked' if r['blocked'] else 'no_jobs')
        except Exception as e:
            r['status'] = 'error'; r['error'] = str(e)[:120]
        try: pg.close()
        except Exception: pass
        results[name][engine] = r
        print(f"[{engine}] {name[:22]:22s} {r['status']:8s} jobs={r['njobs']} blocked={r['blocked']}", flush=True)


def main():
    results = {name: {'url': url} for name, url in TARGETS}
    for engine in ('chromium', 'camoufox'):
        print(f"\n=== {engine} pass ===", flush=True)
        try:
            run_engine(engine, results)
        except Exception:
            print(f"{engine.upper()} PASS FAILED\n" + traceback.format_exc(), flush=True)
    json.dump(results, open('camoufox_test_results.json', 'w'), ensure_ascii=False, indent=1)

    print("\n=== SUMMARY (jobs / blocked) ===")
    print(f"{'company':22s} {'chromium':>16s} {'camoufox':>16s}  winner")
    wins = {'chromium': 0, 'camoufox': 0, 'tie': 0}
    for name, url in TARGETS:
        ch = results[name].get('chromium', {}) or {}
        cf = results[name].get('camoufox', {}) or {}
        cj, fj = ch.get('njobs', 0), cf.get('njobs', 0)
        w = 'camoufox' if fj > cj else ('chromium' if cj > fj else 'tie')
        wins[w] += 1
        cs = f"{cj}j/{'B' if ch.get('blocked') else '-'}/{ch.get('status','?')[:5]}"
        fs = f"{fj}j/{'B' if cf.get('blocked') else '-'}/{cf.get('status','?')[:5]}"
        print(f"{name[:22]:22s} {cs:>16s} {fs:>16s}  {w}")
    print(f"\nwins: {wins}")
    print("EXIT_0")


if __name__ == '__main__':
    main()
