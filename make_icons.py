# Creates the Sargam launcher icons (green music note on dark). Run by the build workflow.
import os
from PIL import Image, ImageDraw

A = (34, 224, 122); B = (15, 184, 104); BG = (7, 9, 10)

def mask_for(W, frac):
    s = W * frac / 100.0; off = (W - 100 * s) / 2
    m = Image.new("L", (W, W), 0); d = ImageDraw.Draw(m)
    P = lambda x, y: (off + x * s, off + y * s)
    d.ellipse([P(22, 60), P(52, 84)], fill=255)
    d.rectangle([P(46, 18), P(54, 72)], fill=255)
    d.polygon([P(46, 18), P(80, 30), P(80, 46), P(46, 34)], fill=255)
    return m

def grad(w):
    im = Image.new("RGB", (w, w)); d = ImageDraw.Draw(im)
    for i in range(2 * w):
        t = i / (2 * w)
        c = tuple(int(A[k] + (B[k] - A[k]) * t) for k in range(3))
        d.line([(i, 0), (i - w, w)], fill=c, width=3)
    return im

def layer(W, frac):
    l = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    l.paste(grad(W), (0, 0), mask_for(W, frac))
    return l

def legacy(size, rnd):
    W = size * 4
    base = Image.new("RGBA", (W, W), BG + (255,)); base.alpha_composite(layer(W, 1.0))
    m = Image.new("L", (W, W), 0); d = ImageDraw.Draw(m)
    if rnd: d.ellipse([0, 0, W - 1, W - 1], fill=255)
    else: d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=255)
    o = Image.new("RGBA", (W, W), (0, 0, 0, 0)); o.paste(base, (0, 0), m)
    return o.resize((size, size), Image.LANCZOS)

def fore(size):
    return layer(size * 4, 0.72).resize((size, size), Image.LANCZOS)

sizes = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
for k, (l, f) in sizes.items():
    d = "icon/mipmap-" + k
    os.makedirs(d, exist_ok=True)
    legacy(l, False).save(d + "/ic_launcher.png")
    legacy(l, True).save(d + "/ic_launcher_round.png")
    fore(f).save(d + "/ic_launcher_foreground.png")
print("icons ready")
