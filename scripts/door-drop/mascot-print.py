"""
THE PRESS CUT OF MR. MUSTARD.

Chrome embeds a raster once per PAGE when it writes a PDF, and dedupes nothing.
The web asset, 440px with an alpha channel, costs about 366KB on every sheet: a
159 page press file of 58MB, which is over the storage ceiling and more than a
print shop wants handed to it. This makes the cut that goes on paper.

Two things happen here and both are deliberate:

  FLATTENED ONTO INK. Dropping the alpha channel drops the soft mask Chrome
  would otherwise embed beside every copy. It is lossless on the page only
  because the card he stands on is exactly #161616. Put this file on any other
  background and he arrives in a black box.

  RESIZED TO 288px. He prints 0.96in wide, so 288px is 300dpi, the floor for a
  raster on a press sheet. Going finer buys nothing a press can hold.

    python scripts/door-drop/mascot-print.py
"""
from PIL import Image
import os

INK = (0x16, 0x16, 0x16)
WIDTH = 288

root = os.path.join(os.path.dirname(__file__), '..', '..')
src_path = os.path.join(root, 'public', 'brand', 'mascot.png')
out_path = os.path.join(root, 'public', 'brand', 'mascot-print.png')

src = Image.open(src_path).convert('RGBA')
flat = Image.new('RGB', src.size, INK)
flat.paste(src, (0, 0), src)
out = flat.resize((WIDTH, round(src.height * WIDTH / src.width)), Image.LANCZOS)
out = out.quantize(colors=64, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
out.save(out_path, optimize=True)
print('%s %dx%d, %d bytes' % (out_path, out.width, out.height, os.path.getsize(out_path)))
