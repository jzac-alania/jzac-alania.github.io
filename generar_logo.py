# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont

GOLD = (245, 197, 66)
GOLD2 = (255, 216, 107)
GOLD_D = (201, 155, 30)
NAVY = (10, 16, 32)
WHITE = (255, 255, 255)

SBLACK = r"C:\Windows\Fonts\seguibl.ttf"
SSEMI = r"C:\Windows\Fonts\seguisb.ttf"
SLIGHT = r"C:\Windows\Fonts\segoeuil.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def spw(d, text, f, tracking):
    return sum(d.textlength(c, font=f) for c in text) + tracking * (len(text) - 1)


def draw_spaced(d, cx, cy, text, f, fill, tracking):
    total = spw(d, text, f, tracking)
    x = cx - total / 2
    for c in text:
        d.text((x, cy), c, font=f, fill=fill, anchor="mm")
        x += d.textlength(c, font=f) + tracking


def wordmark(color):
    base = Image.new("RGBA", (1200, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    f = font(SBLACK, 170)
    draw_spaced(d, 600, 155, "JZAC", f, color, 16)
    tf = font(SSEMI, 46)
    total = spw(d, "SOFTWARE QUE TRABAJA POR TU NEGOCIO", tf, 8)
    draw_spaced(d, 600, 232, "SOFTWARE QUE TRABAJA POR TU NEGOCIO", tf, color, 8)
    d.line([600 - total / 2, 196, 600 + total / 2, 196], fill=color, width=4)
    base.save(r"C:\Users\Intel\Documents\opencode\portfolio\logo_jzac.png")


def wordmark_blanco():
    base = Image.new("RGBA", (1200, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    f = font(SBLACK, 170)
    draw_spaced(d, 600, 155, "JZAC", f, WHITE, 16)
    tf = font(SSEMI, 46)
    total = spw(d, "SOFTWARE QUE TRABAJA POR TU NEGOCIO", tf, 8)
    draw_spaced(d, 600, 232, "SOFTWARE QUE TRABAJA POR TU NEGOCIO", tf, WHITE, 8)
    d.line([600 - total / 2, 196, 600 + total / 2, 196], fill=WHITE, width=4)
    base.save(r"C:\Users\Intel\Documents\opencode\portfolio\logo_jzac_blanco.png")


def avatar_cierto(size=1024):
    img = Image.new("RGB", (size, size), (9, 14, 27))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        col = tuple(int((9, 14, 27)[i] + ((13, 21, 38)[i] - (9, 14, 27)[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=col)
    c = size // 2
    r = int(size * 0.42)
    d.ellipse([c - r, c - r, c + r, c + r], fill=(15, 26, 45), outline=GOLD, width=int(size * 0.03))
    for rr, col in ((int(r * 0.80), GOLD2), (int(r * 0.62), GOLD), (int(r * 0.42), GOLD_D)):
        d.ellipse([c - rr, c - rr, c + rr, c + rr], fill=col)
    f = font(SBLACK, int(size * 0.21))
    draw_spaced(d, c, c, "JZAC", f, (32, 24, 0), 6)
    img.save(r"C:\Users\Intel\Documents\opencode\portfolio\avatar_jzac.png")


def app_icon(size=1024):
    img = Image.new("RGB", (size, size), (9, 14, 27))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        col = tuple(int((9, 14, 27)[i] + ((13, 21, 38)[i] - (9, 14, 27)[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=col)
    pad = int(size * 0.06)
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.18),
                        fill=(15, 26, 45), outline=GOLD, width=int(size * 0.02))
    f = font(SBLACK, int(size * 0.30))
    draw_spaced(d, size // 2, int(size * 0.40), "JZAC", f, GOLD2, 10)
    tf = font(SSEMI, int(size * 0.075))
    draw_spaced(d, size // 2, int(size * 0.60), "ERP", tf, GOLD, 8)
    img.save(r"C:\Users\Intel\Documents\opencode\portfolio\icono_jzac_erp.png")


if __name__ == "__main__":
    wordmark(GOLD)
    wordmark_blanco()
    avatar_cierto()
    app_icon()