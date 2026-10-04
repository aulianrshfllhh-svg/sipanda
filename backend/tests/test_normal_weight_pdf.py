import pathlib
import subprocess
import sys
import tempfile
import pymupdf as fitz

root = pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='sipanda-bold-test-') as temporary:
    before = pathlib.Path(temporary) / 'before.pdf'
    after = pathlib.Path(temporary) / 'after.pdf'
    doc = fitz.open()
    page = doc.new_page(width=610, height=936)
    page.draw_rect((45, 140, 550, 210), color=(0, 0, 0), fill=(0.9, 0.95, 1))
    page.insert_text((57, 80), 'BAB I PENDAHULUAN', fontname='hebo', fontsize=12)
    page.insert_text((57, 110), 'NORMAL tetangga tetap utuh', fontname='helv', fontsize=12)
    page.insert_text((57, 170), 'ANGKA 123.456', fontname='hebo', fontsize=12)
    page.insert_text((57, 200), 'BOLD MIRING', fontname='hebi', fontsize=12)
    page.insert_text((57, 230), 'SIMULASI BOLD', fontname='helv', fontsize=12, render_mode=2, border_width=0.3)
    page = doc.new_page(width=936, height=610)
    page.insert_text((100, 300), 'VERTIKAL TABEL', fontname='hebo', fontsize=12, rotate=90)
    doc.save(before)
    result = subprocess.run([sys.executable, str(root / 'normal-weight-pdf.py'), str(before), str(after), str(root / 'assets/fonts/URWBookman-Light.ttf')], capture_output=True, text=True, check=True)
    out = fitz.open(stream=after.read_bytes(), filetype='pdf')
    assert len(out) == 2
    for original, changed in zip(doc, out):
        assert original.rect == changed.rect
        assert len(original.get_drawings()) == len(changed.get_drawings())
        assert sorted(original.get_text().split()) == sorted(changed.get_text().split()), (original.get_text(), changed.get_text())
        for block in changed.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    assert not span['flags'] & 16, span
        assert not any(span['type'] == 1 for span in changed.get_texttrace())
    print('PASS normal PDF text, simulated bold, rotated text, table graphics, and unchanged content')
