"""Replace bold text only; keep images, table lines, backgrounds and page geometry.

Uses PyMuPDF text-only redactions with transparent fill. Raster image lettering
is not editable text and is deliberately left intact.
"""
import json
import re
import sys
from collections import Counter
import pymupdf as fitz

fitz.TOOLS.set_small_glyph_heights(True)
source, target, bookman = sys.argv[1:4]
document = fitz.open(source)
changed = 0
for page in document:
    replacements = []
    strokes = [fitz.Rect(span['bbox']) for span in page.get_texttrace() if span['type'] == 1]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                box = fitz.Rect(span['bbox'])
                simulated = any(rect.contains((box.tl + box.br) / 2) for rect in strokes)
                if not (simulated or span['flags'] & 16 or re.search(r'bold|black|heavy|demi|semibold', span['font'], re.I)):
                    continue
                if not span['text'].strip():
                    continue
                replacements.append((span, line['dir']))
    if not replacements:
        continue
    original_characters = Counter(char for char in page.get_text() if not char.isspace())
    # Shrink redaction edges to avoid touching adjacent normal-weight glyphs.
    for span, direction in replacements:
        rect = fitz.Rect(span['bbox'])
        rect.x0 += 0.05
        rect.x1 -= 0.05
        rect.y0 += 0.05
        rect.y1 -= 0.05
        page.add_redact_annot(rect, fill=False, cross_out=False)
    page.apply_redactions(images=0, graphics=0, text=0)
    for span, direction in replacements:
        name = span['font'].lower()
        italic = bool(span['flags'] & 2)
        if 'bookman' in name:
            font = fitz.Font(fontfile=bookman)
            fontname = 'SIPANDARegular'
            page.insert_font(fontname=fontname, fontfile=bookman)
        else:
            serif = bool(span['flags'] & 4) or 'times' in name
            mono = bool(span['flags'] & 8) or 'courier' in name
            fontname = ('coit' if italic else 'cour') if mono else ('tiit' if italic else 'tiro') if serif else ('heit' if italic else 'helv')
            font = fitz.Font(fontname)
        if any(not font.has_glyph(ord(char)) for char in span['text'] if not char.isspace()):
            font = fitz.Font(fontfile=bookman)
            fontname = 'SIPANDARegular'
            page.insert_font(fontname=fontname, fontfile=bookman)
            if any(not font.has_glyph(ord(char)) for char in span['text'] if not char.isspace()):
                raise ValueError('Font normal tidak mendukung salah satu karakter teks. Unggah sumber DOCX agar karakter tetap utuh.')
        origin = fitz.Point(span['origin'])
        dx, dy = direction
        if abs(dy) < 0.001 and dx > 0:
            rotate = 0
            width = span['bbox'][2] - span['bbox'][0]
        elif abs(dx) < 0.001:
            rotate = 90 if dy < 0 else 270
            width = span['bbox'][3] - span['bbox'][1]
        elif dx < 0 and abs(dy) < 0.001:
            rotate = 180
            width = span['bbox'][2] - span['bbox'][0]
        else:
            raise ValueError('Teks bold miring diagonal tidak dapat dinormalisasi dengan aman. Unggah sumber DOCX.')
        natural = font.text_length(span['text'], fontsize=span['size'])
        ratio = width / natural if natural else 1
        matrix = fitz.Matrix(ratio, 1) if rotate in (0, 180) else fitz.Matrix(1, ratio)
        page.insert_text(origin, span['text'], fontsize=span['size'], fontname=fontname,
                         color=fitz.sRGB_to_pdf(span['color']), rotate=rotate,
                         morph=(origin, matrix), render_mode=0, overlay=True)
        changed += 1
    remaining = [span for block in page.get_text('dict')['blocks'] for line in block.get('lines', []) for span in line['spans']]
    if any(span['flags'] & 16 for span in remaining):
        raise ValueError('Sebagian teks bold belum berhasil dinormalisasi. Gunakan sumber DOCX.')
    if original_characters != Counter(char for char in page.get_text() if not char.isspace()):
        raise ValueError('Teks PDF saling bertumpuk sehingga normalisasi berisiko mengubah isi. Gunakan sumber DOCX.')
if changed:
    document.save(target, garbage=4, deflate=True)
else:
    # Exact copy avoids rewriting already compliant pages/files.
    import shutil
    shutil.copyfile(source, target)
document.close()
print(json.dumps({'normalizedBoldSpans': changed}))
