#!/usr/bin/env python3
"""Repair relative links in the rendered project documents under docs/<Project>/.

build_docs.py renders each project's Markdown into ONE flat folder. A source link such
as `docs/CHOMP-whitepaper.md` or `../CHANGELOG.md` then pointed at a file that was never
published, so 26 links on the live site returned 404 (found 2026-10-22).

Rule for each relative link, in order:
  1. The target was rendered into the same folder (X.md -> X.html, or the same file):
     link to the rendered copy.
  2. The project has a public repository: link to the file on GitHub.
  3. Otherwise leave it. tests/test-projects.js fails on any link left broken.

build_docs.py calls fix_html() on every page it renders. Run this file on its own to
repair pages already in docs/ without re-rendering them:  python build/doc_links.py
"""
import os, re, posixpath, glob, io

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))       # Projects/
OUT = os.path.join(HERE, '..', 'docs')

# Rendered folder -> (source folder under Projects/, public repository or None).
# The source folder is only used to resolve a link to its path inside the repository.
SOURCES = {
    'CHOMP':    ('Pokemon/CHOMP',    'https://github.com/willhoop/chomp'),
    'HoopaDex': ('Pokemon/HoopaDex', 'https://github.com/willhoop/hoopadex'),
    'Pokemon':  ('Pokemon',          None),
}

HREF_RE = re.compile(r'(\b(?:href|src)=")([^"]*)(")')
ABSOLUTE = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|//|#)', re.I)


def fix_link(url, out_dir, src_rel_dir, repo):
    """The repaired URL, or the original when no rule applies.

    url          the href as written in the source Markdown
    out_dir      the folder the rendered page lives in
    src_rel_dir  the source page's folder, relative to the repository root ('docs' or '')
    repo         the repository base URL, or None
    """
    if not url or ABSOLUTE.match(url) or url.startswith('/'):
        return url
    path, sep, frag = url.partition('#')
    frag = sep + frag
    base = posixpath.basename(path)
    if base.endswith('.md') and os.path.exists(os.path.join(out_dir, base[:-3] + '.html')):
        return base[:-3] + '.html' + frag
    if base and os.path.exists(os.path.join(out_dir, base)):
        return base + frag
    # a deck is published as the PDF that build_docs.py exports beside it
    if base.endswith('.pptx') and os.path.exists(os.path.join(out_dir, base[:-5] + '.pdf')):
        return base[:-5] + '.pdf' + frag
    if repo:
        target = posixpath.normpath(posixpath.join(src_rel_dir, path))
        if not target.startswith('..'):
            return f'{repo}/blob/main/{target}{frag}'
    return url


def fix_html(html, out_dir, src_rel_dir, repo):
    """Repair links inside <main> only. The page chrome above it (the "Portfolio" back
    link) is written by build_docs.py relative to the site, not to the source file."""
    head, sep, body = html.partition('<main>')
    if not sep:
        return html
    return head + sep + HREF_RE.sub(
        lambda m: m.group(1) + fix_link(m.group(2), out_dir, src_rel_dir, repo) + m.group(3), body)


def source_dir_of(project_root, page_name):
    """The folder (relative to the project root) holding the Markdown a page came from."""
    stem = page_name[:-5] + '.md'
    if os.path.exists(os.path.join(project_root, stem)):
        return ''
    hits = glob.glob(os.path.join(project_root, 'docs', '**', stem), recursive=True)
    if hits:
        return os.path.relpath(os.path.dirname(hits[0]), project_root).replace(os.sep, '/')
    return 'docs'


def repair_all():
    changed = 0
    for folder, (src, repo) in SOURCES.items():
        out_dir = os.path.join(OUT, folder)
        for page in sorted(glob.glob(os.path.join(out_dir, '*.html'))):
            name = os.path.basename(page)
            text = io.open(page, encoding='utf-8').read()
            new = fix_html(text, out_dir, source_dir_of(os.path.join(ROOT, src), name), repo)
            if new != text:
                io.open(page, 'w', encoding='utf-8', newline='').write(new)
                changed += 1
                print('fixed', folder + '/' + name)
    print(f'{changed} page(s) repaired')


if __name__ == '__main__':
    repair_all()
