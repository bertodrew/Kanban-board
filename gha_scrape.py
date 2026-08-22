#!/usr/bin/env python3
"""JS-page job scraper for GitHub Actions (renders with Playwright).

Targets scraper_companies rows discovery_status='discovered' with last_status in
('zero_jobs','embed_no_swiss_jobs') and a career_url — the client-rendered pages the static
pipeline couldn't read. Reads the target list from Supabase REST (anon).

Renders each page (Chromium), keeps only anchors that look like real job postings
(strict title gate + job-like href), Swiss-filters, dedups. Writes scrape_results.json.
If SUPABASE_SERVICE_KEY is set, upserts to job_postings; otherwise JSON only.

Env: WAVE_START, WAVE_END (default 0..1000 = all), SUPABASE_URL, SUPABASE_ANON, SUPABASE_SERVICE_KEY
"""
import os, re, json, ssl, hashlib, urllib.request, urllib.error
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

SB = os.environ.get('SUPABASE_URL', 'https://znidaissxdmhfevimweo.supabase.co').rstrip('/')
ANON = os.environ.get('SUPABASE_ANON',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaWRhaXNzeGRtaGZldmltd2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTAxMDQsImV4cCI6MjA4NTY4NjEwNH0.TYqyHYo3lbFfY-U-GbMCiA1pBvXZQK1-umJyFr9Z8dY')
SERVICE = os.environ.get('SUPABASE_SERVICE_KEY', '')
START = int(os.environ.get('WAVE_START', '0')); END = int(os.environ.get('WAVE_END', '1000'))
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

NONCITY = re.compile(r'frankfurt|berlin|m[üu]nchen|munich|hamburg|stuttgart|k[öo]ln|cologne|boston|'
    r'new york|london|paris|madrid|barcelona|wien|vienna|amsterdam|dublin|milano|lisbon|lisboa|'
    r'singapore|bangalore|pune|mumbai|warsaw|prague|bucharest', re.I)
KW = ['engineer','ingenieur','entwickl','developer','software','manager','managerin','lead','leiter',
'specialist','spezialist','scientist','consultant','berater','analyst','techniker','technician',
'coordinator','architect','designer','sales','account','projektleiter','product','produkt','head of',
'director','associate','administrator','intern','praktik','werkstudent','apprentice','lehrstelle',
'trainee','fachkraft','fachperson','mitarbeiter','sachbearbeiter','support','devops','data','cloud',
'security','quality','regulatory','clinical','finance','controller','verkauf','einkauf','pflege',
'nurse','payroll','accountant','backend','frontend','fullstack','full stack','full-stack','servicetechniker']
STRONG = re.compile(r'(m/w|w/m|m/f|f/m|\(m|\(w|\d{2,3}\s?%|' + '|'.join(KW) + ')', re.I)
JUNK = ['mehr erfahren','read more','learn more','view all','open application','general application',
'benefits','our team','about us','apply now','see all','offene stellen','all jobs','impressum',
'mehr','dein ','navigation','überspringen','datenschutz','cookie','kontakt','weiterlesen','anmelden',
'login','newsletter','jetzt bewerben','alle anzeigen','alle jobs']
HREF_JOB = re.compile(r'job|stelle|vacan|position|karriere|career|offen|recruit|apply|/o/|posting|'
    r'opening|hiring|join|lehrstelle|praktik|detail', re.I)
TITLE_HARD = re.compile(r'm/w|w/m|m/f|f/m|\(m|\(w|\d{2,3}\s?%', re.I)

def good_title(t):
    tl = (t or '').lower().strip()
    if len(tl) < 8 or len(tl) > 150: return False
    if any(j in tl for j in JUNK): return False
    if NONCITY.search(tl): return False
    return STRONG.search(tl) is not None

def keep(text, href):
    if not good_title(text): return False
    # require a job-like URL OR a hard job signal in the title (%/(m/w/d)) to cut product/blog noise
    return bool(HREF_JOB.search(href or '')) or bool(TITLE_HARD.search(text))

def load_targets():
    q = ("select=id,name,career_url&discovery_status=eq.discovered"
         "&last_status=in.(zero_jobs,embed_no_swiss_jobs)&career_url=not.is.null&order=name.asc")
    req = urllib.request.Request(f"{SB}/rest/v1/scraper_companies?{q}",
        headers={'apikey': ANON, 'Authorization': 'Bearer ' + ANON})
    return json.load(urllib.request.urlopen(req, timeout=30, context=CTX))

def extract(page, url):
    page.goto(url, wait_until='domcontentloaded', timeout=25000)
    page.wait_for_timeout(2500)  # let client-side job lists render
    anchors = page.eval_on_selector_all('a', 'els => els.map(a => ({t:(a.textContent||"").trim(), h:a.href}))')
    out = []; seen = set()
    for a in anchors:
        t = re.sub(r'\s+', ' ', a['t']).strip()
        if keep(t, a['h']) and t.lower() not in seen:
            seen.add(t.lower()); out.append({'title': t[:150], 'apply_url': a['h']})
    return out[:40]

def mm(c, t): return hashlib.md5(f"{c}-{t}-Switzerland-2026-08".encode()).hexdigest()

def upsert(records):
    body = json.dumps(records).encode()
    req = urllib.request.Request(f"{SB}/rest/v1/job_postings?on_conflict=title,company", data=body, method='POST',
        headers={'apikey': SERVICE, 'Authorization': 'Bearer ' + SERVICE,
                 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    return urllib.request.urlopen(req, timeout=90, context=CTX).getcode()

def main():
    targets = load_targets()[START:END]
    results = []; total = 0
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        for c in targets:
            pg = b.new_page(user_agent='Mozilla/5.0 Chrome/120 Safari/537.36')
            rec = {'id': c['id'], 'name': c['name'], 'career_url': c['career_url'], 'jobs': [], 'njobs': 0, 'status': ''}
            try:
                jobs = extract(pg, c['career_url'])
                rec['jobs'] = jobs; rec['njobs'] = len(jobs); rec['status'] = 'ok' if jobs else 'no_jobs'
            except Exception as e:
                rec['status'] = 'error'; rec['error'] = str(e)[:100]
            try: pg.close()
            except Exception: pass
            results.append(rec); total += rec['njobs']
            print(f"{c['name'][:30]:30s} {rec['status']:8s} jobs={rec['njobs']}", flush=True)
        b.close()
    json.dump(results, open('scrape_results.json', 'w'), ensure_ascii=False, indent=1)
    print(f"\nWAVE {START}-{END}: pages={len(results)} jobs={total}")
    if SERVICE and total:
        recs = []
        for r in results:
            host = urlparse(r['career_url']).netloc
            for j in r['jobs']:
                recs.append({'title': j['title'], 'company': r['name'], 'location': 'Switzerland',
                    'application_url': j.get('apply_url') or r['career_url'], 'source_url': r['career_url'],
                    'content_hash': mm(r['name'], j['title']), 'category': 'other',
                    'is_active': True, 'source': 'github-actions', 'source_name': host})
        try:
            print(f"UPSERT {len(recs)} -> HTTP {upsert(recs)}")
        except urllib.error.HTTPError as e:
            print("UPSERT ERROR", e.code, e.read().decode('utf-8', 'ignore')[:200])
    else:
        print("No SUPABASE_SERVICE_KEY -> scrape_results.json only (no DB write).")

if __name__ == '__main__':
    main()
# sweep trigger 2026-08-21T08:05:42Z

# trigger sweep 2026-08-22
