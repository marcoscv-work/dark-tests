#!/usr/bin/env python3
"""Builds the Dark Mode screenshot gallery.

    python3 build-gallery.py            -> index.html (relative paths, open locally or publish as-is)
    python3 build-gallery.py --embed X  -> X.html with the images embedded (single shareable file)
"""
import base64, html, json, os, sys, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
TEAMS = [
    ("bpm", "BPM", "LPD-105050"),
    ("content-management", "Content Management", "LPD-105038"),
    ("page-management", "Page Management", "LPD-105037"),
    ("commerce", "Commerce", "LPD-105042"),
    ("search", "Search", "LPD-104000"),
    ("site-management", "Site Management", "LPD-103839"),
]
embed = "--embed" in sys.argv
out_name = sys.argv[sys.argv.index("--embed") + 1] if embed else "index.html"

def src_for(team, rel):
    p = os.path.join(ROOT, team, rel)
    if embed:
        with open(p, "rb") as f:
            return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
    return f"{team}/{rel}"

def load(team):
    p = os.path.join(ROOT, team, "index.json")
    if not os.path.exists(p):
        return []
    items = json.load(open(p))
    out = []
    for r in items:
        rel = r.get("file") if "/" in (r.get("file") or "") else f"{r.get('dir')}/{r.get('file')}"
        if not r.get("ok") or "falló" in (r.get("note") or "") or not os.path.exists(os.path.join(ROOT, team, rel)):
            continue
        out.append({"rel": rel, "dir": r.get("dir") or rel.split("/")[0], "title": r.get("title", rel), "url": r.get("url", ""), "note": r.get("note", "").strip()})
    return out

sections, all_items = [], []
for key, label, ticket in TEAMS:
    items = load(key)
    if not items:
        continue
    groups = {}
    for it in items:
        groups.setdefault(it["dir"], []).append(it)
    sections.append((key, label, ticket, groups))
    for it in items:
        it["team"] = key
        it["team_label"] = label
        all_items.append(it)

def esc(s): return html.escape(s or "", quote=True)

cards, idx = [], 0
section_html = []
for key, label, ticket, groups in sections:
    n = sum(len(v) for v in groups.values())
    gh = []
    for dirname, items in groups.items():
        cs = []
        for it in items:
            cs.append(
                f'<figure class="shot" data-i="{idx}" data-team="{key}" tabindex="0" role="button" aria-label="Enlarge {esc(it["title"])}">'
                f'<img loading="lazy" src="{src_for(key, it["rel"])}" alt="{esc(it["title"])}">'
                f'<figcaption><span class="t">{esc(it["title"])}</span><span class="f">{esc(it["rel"])}</span></figcaption></figure>')
            it["src"] = src_for(key, it["rel"]); it["i"] = idx; idx += 1
        gh.append(f'<div class="group"><h3>{esc(dirname)} <span class="count">{len(items)}</span></h3><div class="grid">{"".join(cs)}</div></div>')
    section_html.append(
        f'<section class="team" id="{key}" data-team="{key}"><header class="team-h"><h2>{esc(label)}</h2>'
        f'<a class="ticket" href="https://liferay.atlassian.net/browse/{ticket}" target="_blank" rel="noopener">{ticket}</a><span class="count">{n} screenshots</span></header>{"".join(gh)}</section>')

data_json = json.dumps([{"i": it["i"], "team": it["team_label"], "title": it["title"], "rel": it["rel"], "url": it["url"], "src": it["src"]} for it in all_items], ensure_ascii=False)
nav = "".join(f'<a href="#{k}" data-team="{k}">{esc(l)} <span class="count">{sum(len(v) for v in g.values())}</span></a>' for k, l, t, g in sections)
today = datetime.date.today().isoformat()

page = f"""<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dark Mode Screens</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {{ --ground:#1b1b23; --surface:#272833; --surface-2:#393a4a; --line:#393a4a; --line-strong:#495057; --ink:#f7f8f9; --ink-2:#e7e7ed; --muted:#a7a9bc; --accent:#429aff; --accent-soft:#0e2a4d; --warn:#ffb570; color-scheme: dark; }}
:root[data-theme="light"] {{ --ground:#ffffff; --surface:#f7f8f9; --surface-2:#f1f2f5; --line:#e7e7ed; --line-strong:#cdced9; --ink:#272833; --ink-2:#495057; --muted:#6b6c7e; --accent:#006eff; --accent-soft:#e5f1ff; --warn:#b95000; color-scheme: light; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--ground); color:var(--ink); font:14px/1.5 "IBM Plex Sans",system-ui,sans-serif; }}
a {{ color:var(--accent); text-decoration:none; }} a:hover {{ text-decoration:underline; }}
:focus-visible {{ outline:2px solid var(--accent); outline-offset:2px; }}
.top {{ position:sticky; top:0; z-index:5; background:var(--ground); border-bottom:1px solid var(--line); padding:.8rem 1.4rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap; }}
.top h1 {{ font-size:1.05rem; margin:0; font-weight:600; letter-spacing:-.01em; }}
.top .meta {{ color:var(--muted); font-size:.8rem; }}
.nav {{ display:flex; gap:.35rem; flex-wrap:wrap; margin-left:auto; }}
.nav a, .chip {{ border:1px solid var(--line-strong); background:var(--surface); color:var(--ink); border-radius:999px; padding:.25rem .7rem; font-size:.8rem; cursor:pointer; font-family:inherit; }}
.nav a.active {{ background:var(--accent-soft); border-color:var(--accent); }}
.count {{ color:var(--muted); font-weight:400; font-size:.78rem; margin-left:.3rem; font-variant-numeric:tabular-nums; }}
.wrap {{ padding:1rem 1.4rem 4rem; }}
.hint {{ color:var(--muted); font-size:.85rem; margin:.4rem 0 1rem; max-width:80ch; }}
.team {{ margin-top:2rem; }}
.team-h {{ display:flex; align-items:baseline; gap:.8rem; border-bottom:1px solid var(--line); padding-bottom:.4rem; margin-bottom:.6rem; }}
.team-h h2 {{ margin:0; font-size:1.25rem; font-weight:600; }}
.ticket {{ font-family:"IBM Plex Mono",monospace; font-size:.8rem; }}
.group h3 {{ margin:1rem 0 .5rem; font-size:.85rem; font-weight:500; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(var(--thumb,220px),1fr)); gap:.8rem; }}
.shot {{ margin:0; background:var(--surface); border:1px solid var(--line); border-radius:6px; overflow:hidden; cursor:zoom-in; transition:border-color .12s, transform .12s; }}
.shot:hover, .shot:focus-visible {{ border-color:var(--accent); transform:translateY(-1px); }}
.shot img {{ display:block; width:100%; aspect-ratio:1440/1000; object-fit:cover; background:#111; }}
.shot figcaption {{ padding:.45rem .6rem; display:grid; gap:.1rem; }}
.shot .t {{ font-size:.82rem; font-weight:500; line-height:1.3; }}
.shot .f {{ font-family:"IBM Plex Mono",monospace; font-size:.68rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
.hidden {{ display:none !important; }}
/* visor */
.viewer {{ position:fixed; inset:0; z-index:20; background:rgba(10,10,14,.94); display:flex; flex-direction:column; }}
.viewer[hidden] {{ display:none; }}
.vbar {{ display:flex; gap:.8rem; align-items:center; padding:.6rem 1rem; color:#f7f8f9; font-size:.85rem; flex-wrap:wrap; }}
.vbar .title {{ font-weight:600; }} .vbar .path {{ font-family:"IBM Plex Mono",monospace; color:#a7a9bc; font-size:.75rem; }}
.vbar .sp {{ flex:1; }}
.vbar button, .vbar a.btn {{ background:#272833; color:#f7f8f9; border:1px solid #495057; border-radius:6px; padding:.3rem .7rem; font:inherit; cursor:pointer; }}
.vbody {{ flex:1; overflow:auto; display:flex; align-items:flex-start; justify-content:center; cursor:zoom-in; }}
.vbody img {{ max-width:100%; max-height:100%; object-fit:contain; margin:auto; display:block; }}
.viewer.zoomed .vbody {{ cursor:zoom-out; align-items:flex-start; justify-content:flex-start; }}
.viewer.zoomed .vbody img {{ max-width:none; max-height:none; width:1440px; margin:0; }}
.varrow {{ position:fixed; top:50%; transform:translateY(-50%); background:#272833cc; color:#fff; border:1px solid #495057; border-radius:50%; width:44px; height:44px; font-size:1.3rem; cursor:pointer; }}
.varrow.prev {{ left:.8rem; }} .varrow.next {{ right:.8rem; }}
@media (prefers-reduced-motion: reduce) {{ .shot {{ transition:none; }} }}
</style>
</head>
<body>
<div class="top">
  <div><h1>Dark Mode Screens</h1><div class="meta">{len(all_items)} screenshots · {today} · local master bundle with feature flag LPD-57922 enabled</div></div>
  <nav class="nav" id="nav"><a href="#" data-team="all" class="active">All <span class="count">{len(all_items)}</span></a>{nav}</nav>
  <button class="chip" id="size" type="button" title="Thumbnail size">Thumbnails: M</button>
  <button class="chip" id="theme" type="button">Light page</button>
</div>
<div class="wrap">
  <p class="hint">Every thumbnail is an administration screen captured with the dark colour scheme active. White blocks and low-contrast areas stand out at a glance. Click to enlarge, click again for actual size (1440 px), use the arrow keys to move between screens and Esc to close. Each screen links to the local URL used to reproduce it.</p>
  {"".join(section_html)}
</div>
<div class="viewer" id="viewer" hidden role="dialog" aria-modal="true" aria-label="Screenshot viewer">
  <div class="vbar"><span class="title" id="vtitle"></span><span class="path" id="vpath"></span><span class="sp"></span><span id="vcount"></span><a class="btn" id="vurl" href="#" target="_blank" rel="noopener">Open URL</a><button type="button" id="vzoom">1:1</button><button type="button" id="vclose">Close (Esc)</button></div>
  <div class="vbody" id="vbody"><img id="vimg" alt=""></div>
  <button class="varrow prev" id="vprev" type="button" aria-label="Previous">‹</button>
  <button class="varrow next" id="vnext" type="button" aria-label="Next">›</button>
</div>
<script>
const DATA = {data_json};
const viewer = document.getElementById('viewer'), vimg = document.getElementById('vimg');
let cur = -1, visible = DATA.map(d => d.i);
function show(i) {{
  const d = DATA[i]; if (!d) return; cur = i;
  vimg.src = d.src; vimg.alt = d.title;
  document.getElementById('vtitle').textContent = d.team + ' · ' + d.title;
  document.getElementById('vpath').textContent = d.rel;
  document.getElementById('vurl').href = d.url || '#';
  const pos = visible.indexOf(i);
  document.getElementById('vcount').textContent = (pos + 1) + ' / ' + visible.length;
  viewer.classList.remove('zoomed'); viewer.hidden = false; document.body.style.overflow = 'hidden';
}}
function close() {{ viewer.hidden = true; document.body.style.overflow = ''; }}
function step(n) {{ const pos = visible.indexOf(cur); show(visible[(pos + n + visible.length) % visible.length]); }}
document.querySelectorAll('.shot').forEach(el => {{
  el.addEventListener('click', () => show(+el.dataset.i));
  el.addEventListener('keydown', e => {{ if (e.key === 'Enter' || e.key === ' ') {{ e.preventDefault(); show(+el.dataset.i); }} }});
}});
document.getElementById('vclose').onclick = close;
document.getElementById('vprev').onclick = () => step(-1);
document.getElementById('vnext').onclick = () => step(1);
document.getElementById('vzoom').onclick = () => viewer.classList.toggle('zoomed');
document.getElementById('vbody').addEventListener('click', e => {{ if (e.target === vimg) viewer.classList.toggle('zoomed'); else close(); }});
document.addEventListener('keydown', e => {{
  if (viewer.hidden) return;
  if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'z') viewer.classList.toggle('zoomed');
}});
// team filter
document.getElementById('nav').addEventListener('click', e => {{
  const a = e.target.closest('a'); if (!a) return; e.preventDefault();
  const team = a.dataset.team;
  document.querySelectorAll('#nav a').forEach(x => x.classList.toggle('active', x === a));
  document.querySelectorAll('.team').forEach(s => s.classList.toggle('hidden', team !== 'all' && s.dataset.team !== team));
  visible = DATA.filter(d => team === 'all' || document.querySelector(`.shot[data-i="${{d.i}}"]`).dataset.team === team).map(d => d.i);
  if (team !== 'all') document.getElementById(team).scrollIntoView({{behavior: 'smooth', block: 'start'}}); else window.scrollTo({{top: 0, behavior: 'smooth'}});
}});
// thumbnail size
const sizes = [['S', '150px'], ['M', '220px'], ['L', '320px'], ['XL', '460px']]; let si = 1;
document.getElementById('size').onclick = function () {{ si = (si + 1) % sizes.length; document.documentElement.style.setProperty('--thumb', sizes[si][1]); this.textContent = 'Thumbnails: ' + sizes[si][0]; }};
// page theme (screenshots are unaffected)
document.getElementById('theme').onclick = function () {{ const r = document.documentElement; const dark = r.getAttribute('data-theme') !== 'light'; r.setAttribute('data-theme', dark ? 'light' : 'dark'); this.textContent = dark ? 'Dark page' : 'Light page'; }};
</script>
</body>
</html>"""
with open(os.path.join(ROOT, out_name), "w") as f:
    f.write(page)
print(f"{out_name}: {len(all_items)} screenshots, {len(sections)} teams, {os.path.getsize(os.path.join(ROOT, out_name))//1024} KB")
