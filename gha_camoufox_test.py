#!/usr/bin/env python3
"""Camoufox vs Chromium A/B test for WAF/bot-blocked career pages.

Runs a fixed list of known-hard Swiss career pages (Nestlé, Swiss Life, Bayer,
Boehringer, Givaudan, Kuehne+Nagel, Roche, Straumann) through BOTH engines and
reports job-like anchors found per engine + whether the page looked blocked.

Pure measurement: writes camoufox_test_results.json, NO DB write, NO production
dependency. If Camoufox reliably beats Chromium on these domains, we promote it
to a fallback inside gha_scrape.py.

Engines:
  - Chromium via playwright.sync_api
  - Camoufox via camoufox.sync_api (stealth Firefox, anti-bot)
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

# --- job-anchor gate (same spirit as gha_scrape.py) ---
NONCITY = re.compile(r'frankfurt|berlin|m[üu]nchen|munich|hamburg|boston|new york|london|paris|'
    r'madrid|barcelona|wien|vienna|amsterdam|dublin|milano|singapore|pune|mumbai|warsaw', re.I)
KW = ['engineer','ingenieur','entwickl','developer','software','manager','lead','leiter','specialist',
'spezialist','scientist','consultant','analyst','techniker','technician','coordinator','architect',
'designer','sales','account','product','produkt','head of','director','associate','administrator',
'intern','praktik','werkstudent','apprentice','lehrstelle','trainee','mitarbeiter','support','devops',
'data','cloud','security','quality','regulatory','clinical','finance','controller','verkauf','einkauf']
STRONG = re.compile(r'(m/w|w/m|m/f|f/m|\(m|\(w|\d{2,3}\s?%|' + '|'.join(KW) + ')', re.I)
JUNK = ['read more','learn more','view all','open application','benefits','our team','about us',
'apply now','see all','offene stellen','all jobs','impressum','datenschutz','cookie','kontakt',
'login','newsletter','mehr erfahren','alle jobs']
HREF_JOB = re.compile(r'job|stelle|vacan|position|karriere|career|offen|recruit|apply|/o/|posting|'
    r'opening|hiring|join|lehrstelle|praktik|detail', re.I)
TITLE_HARD = re.compile(r'm/w|w/m|m/f|f/m|\(m|\(w|\d{2,3}\s?%', re.I)
BLOCK = re.compile(r'just a moment|checking your browser|cloudflare|access denied|enable javascript|'
    r'unusual traffic|are you a human|captcha|verify you are|bot detection|request blocked', re.I)


def good_title(t):
    tl = (t or '').lower().strip()
    if len(tl) < 8 or len(tl) > 150:
        return False
    if any(j in tl for j in JUNK):
        return False
    if NONCITY.search(tl):
        return False
    return STRONG.search(tl) is not None


def keep(text, href):
    if not good_title(text):
        return False
    return bool(HREF_JOB.search(href or '')) or bool(TITLE_HARD.search(text))


def harvest(page, url):
    """Navigate + extract job-like anchors. Returns (njobs, blocked, sample)."""
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3500)
    body = (page.content() or '')[:6000]
    blocked = bool(BLOCK.search(body))
    anchors = page.eval_on_selector_all('a', 'els => els.map(a => ({t:(a.textContent||"").trim(), h:a.href}))')
    out, seen = [], set()
    for a in anchors:
        t = re.sub(r'\s+', ' ', a['t']).strip()
        if keep(t, a['h']) and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t[:90])
    return len(out), blocked, out[:5]


def run_chromium(results):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        for name, url in TARGETS:
            pg = b.new_page(user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36')
            r = {'njobs': 0, 'blocked': None, 'status': '', 'sample': []}
            try:
                r['njobs'], r['blocked'], r['sample'] = harvest(pg, url)
                r['status'] = 'ok' if r['njobs'] else ('blocked' if r['blocked'] else 'no_jobs')
            except Exception as e:
                r['status'] = 'error'; r['error'] = str(e)[:120]
            try: pg.close()
            except Exception: pass
            results[name]['chromium'] = r
            print(f"[chromium] {name[:24]:24s} {r['status']:8s} jobs={r['njobs']} blocked={r['blocked']}", flush=True)
        b.close()


def run_camoufox(results):
    from camoufox.sync_api import Camoufox
    with Camoufox(headless=True, humanize=True, geoip=True) as b:
        for name, url in TARGETS:
            pg = b.new_page()
            r = {'njobs': 0, 'blocked': None, 'status': '', 'sample': []}
            try:
                r['njobs'], r['blocked'], r['sample'] = harvest(pg, url)
                r['status'] = 'ok' if r['njobs'] else ('blocked' if r['blocked'] else 'no_jobs')
            except Exception as e:
                r['status'] = 'error'; r['error'] = str(e)[:120]
            try: pg.close()
            except Exception: pass
            results[name]['camoufox'] = r
            print(f"[camoufox] {name[:24]:24s} {r['status']:8s} jobs={r['njobs']} blocked={r['blocked']}", flush=True)
        b.close()


def main():
    results = {name: {'url': url} for name, url in TARGETS}
    print("=== Chromium pass ===", flush=True)
    try:
        run_chromium(results)
    except Exception:
        print("CHROMIUM PASS FAILED\n" + traceback.format_exc(), flush=True)
    print("\n=== Camoufox pass ===", flush=True)
    try:
        run_camoufox(results)
    except Exception:
        print("CAMOUFOX PASS FAILED\n" + traceback.format_exc(), flush=True)

    json.dump(results, open('camoufox_test_results.json', 'w'), ensure_ascii=False, indent=1)

    # summary table
    print("\n=== SUMMARY (jobs found / blocked) ===")
    print(f"{'company':24s} {'chromium':>16s} {'camoufox':>16s}  winner")
    wins = {'chromium': 0, 'camoufox': 0, 'tie': 0}
    for name, url in TARGETS:
        ch = results[name].get('chromium', {}) or {}
        cf = results[name].get('camoufox', {}) or {}
        cj, fj = ch.get('njobs', 0), cf.get('njobs', 0)
        w = 'camoufox' if fj > cj else ('chromium' if cj > fj else 'tie')
        wins[w] += 1
        cs = f"{cj}j/{'B' if ch.get('blocked') else '-'}/{ch.get('status','?')[:5]}"
        fs = f"{fj}j/{'B' if cf.get('blocked') else '-'}/{cf.get('status','?')[:5]}"
        print(f"{name[:24]:24s} {cs:>16s} {fs:>16s}  {w}")
    print(f"\nwins: {wins}")
    print("EXIT_0")


if __name__ == '__main__':
    main()
