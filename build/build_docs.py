#!/usr/bin/env python3
"""Render every project .md into a styled HTML page, and convert decks to PDF,
so portfolio links open readable documents instead of raw text."""
import os, re, shutil, subprocess, html
try:
    import markdown
except ImportError:
    markdown = None

ROOT = '/sessions/kind-fervent-sagan/mnt/Projects'
OUT  = os.path.join(ROOT, 'portfolio', 'docs')

CSS = """
:root{--ink:#0d1226;--navy:#131a35;--line:#26305c;--ice:#c9d6f5;--gold:#e8b33d;--slate:#8695bd;--white:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--ice);line-height:1.7;
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.bar{background:var(--navy);border-bottom:1px solid var(--line);padding:14px 0}
.bar .w{max-width:860px;margin:0 auto;padding:0 28px;display:flex;gap:18px;align-items:center}
.bar a{color:var(--gold);text-decoration:none;font-size:13.5px;font-weight:600}
.bar span{color:var(--slate);font-size:13.5px}
main{max-width:860px;margin:0 auto;padding:44px 28px 90px}
h1,h2,h3,h4{font-family:Cambria,Georgia,serif;color:var(--white);line-height:1.25;margin:1.9em 0 .6em}
h1{font-size:38px;margin-top:0;letter-spacing:-.5px}h2{font-size:27px}h3{font-size:20px}h4{font-size:17px}
p{margin:0 0 1.05em}
a{color:var(--gold)}
code{background:#1a2247;padding:2px 6px;border-radius:4px;font-size:13.5px;color:#ffd98a;
 font-family:"JetBrains Mono",Consolas,monospace}
pre{background:#111838;border:1px solid var(--line);border-radius:9px;padding:16px 18px;overflow-x:auto}
pre code{background:none;padding:0;color:var(--ice);font-size:13px;line-height:1.55}
table{border-collapse:collapse;width:100%;margin:1.3em 0;font-size:14.5px}
th,td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
th{background:var(--navy);color:var(--white);font-weight:700}
tr:nth-child(even) td{background:rgba(255,255,255,.02)}
blockquote{border-left:3px solid var(--gold);margin:1.3em 0;padding:2px 0 2px 18px;color:var(--slate)}
hr{border:0;border-top:1px solid var(--line);margin:2.4em 0}
ul,ol{padding-left:22px}li{margin:.32em 0}
strong{color:var(--white)}
"""

def render(md_path, rel_name, project):
    with open(md_path, encoding='utf-8') as f:
        text = f.read()
    if markdown:
        body = markdown.markdown(text, extensions=['tables','fenced_code','toc','sane_lists'])
    else:  # minimal fallback
        body = '<pre>' + html.escape(text) + '</pre>'
    title = rel_name.replace('.md','').replace('-',' ')
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} — {html.escape(project)}</title><style>{CSS}</style></head><body>
<div class="bar"><div class="w"><a href="../../index.html">← Portfolio</a><span>{html.escape(project)}</span></div></div>
<main>{body}</main></body></html>"""

def main():
    projects = {
        'CHOMP':      os.path.join(ROOT,'Pokemon','CHOMP'),
        'HoopaDex':   os.path.join(ROOT,'Pokemon','HoopaDex'),
        'Pokemon':    os.path.join(ROOT,'Pokemon'),
    }
    made = 0
    for proj, base in projects.items():
        docs_dir = os.path.join(base,'docs')
        srcs = []
        if os.path.isdir(docs_dir):
            for dirpath,_,files in os.walk(docs_dir):
                for fn in files:
                    if fn.endswith('.md'):
                        srcs.append(os.path.join(dirpath,fn))
        for fn in ('README.md','CHANGELOG.md','SECURITY.md'):
            p = os.path.join(base,fn)
            if os.path.isfile(p): srcs.append(p)
        if not srcs: continue
        odir = os.path.join(OUT, proj)
        os.makedirs(odir, exist_ok=True)
        for s in srcs:
            name = os.path.basename(s)
            with open(os.path.join(odir, name.replace('.md','.html')),'w',encoding='utf-8') as f:
                f.write(render(s, name, proj))
            made += 1
        # decks -> pdf so they open in a browser
        for dirpath,_,files in os.walk(base):
            for fn in files:
                if fn.endswith('.pptx'):
                    try:
                        subprocess.run(['python3','/sessions/kind-fervent-sagan/mnt/.claude/skills/pptx/scripts/office/soffice.py',
                                        '--headless','--convert-to','pdf','--outdir',odir,os.path.join(dirpath,fn)],
                                       capture_output=True, timeout=180)
                    except Exception: pass
    print(f'rendered {made} documents into portfolio/docs/')
    for r,_,f in os.walk(OUT):
        for x in sorted(f): print('  ', os.path.relpath(os.path.join(r,x), OUT))

main()
