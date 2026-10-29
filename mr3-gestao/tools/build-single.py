#!/usr/bin/env python3
"""Gera dist/index.html e dist/ficha.html em arquivo único (CSS, JS e ícone embutidos).
Uso: python3 tools/build-single.py   (a partir da pasta mr3-gestao)"""
import base64, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)

def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()

icon = 'data:image/svg+xml;base64,' + base64.b64encode(read('icons/icon.svg').encode()).decode()

def build(page):
    html = read(page)
    # CSS local -> <style>
    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">',
                  lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', html)
    # JS local -> <script> inline ("</script" escapado por segurança)
    html = re.sub(r'<script src="(js/[^"]+)"></script>',
                  lambda m: '<script>\n' + read(m.group(1)).replace('</script', '<\\/script') + '\n</script>', html)
    # Ícones e manifesto (arquivo único não leva a pasta icons/)
    html = html.replace('href="icons/icon.svg"', f'href="{icon}"')
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
    html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', '', html)
    assert 'src="js/' not in html and 'href="css/' not in html, page
    with open(os.path.join(DIST, page), 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'dist/{page}: {len(html) // 1024} KB')

for p in ('index.html', 'ficha.html'):
    build(p)
