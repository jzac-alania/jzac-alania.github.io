# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont

NAVY_TOP = (10, 16, 32)
NAVY_BOT = (13, 21, 38)
GOLD = (245, 197, 66)
GOLD2 = (255, 216, 107)
GOLD_D = (201, 155, 30)
INK = (32, 24, 0)
TEXT = (236, 240, 249)
MUTED = (150, 164, 190)
CARD = (17, 28, 49)
CARD_EDGE = (34, 51, 84)
GREEN = (37, 211, 102)
BROWN = (66, 47, 12)
ALTO = (205, 214, 232)

SBLACK = r"C:\Windows\Fonts\seguibl.ttf"
SSEMI = r"C:\Windows\Fonts\seguisb.ttf"
SLIGHT = r"C:\Windows\Fonts\segoeuil.ttf"
SREG = r"C:\Windows\Fonts\segoeui.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def asc_desc(f):
    a, d = f.getmetrics()
    return a + d


def wrap(draw, text, f, maxw):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= maxw:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def ots(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def radial(ov, cx, cy, rad, color, strength=34):
    d = ImageDraw.Draw(ov)
    for r in range(rad, 0, -2):
        a = int(strength * (1 - r / rad))
        if a > 0:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))


def spw(draw, text, f, tracking):
    return sum(draw.textlength(c, font=f) for c in text) + tracking * (len(text) - 1)


def draw_spaced(draw, cx, cy, text, f, fill, tracking):
    total = spw(draw, text, f, tracking)
    x = cx - total / 2
    for c in text:
        draw.text((x, cy), c, font=f, fill=fill, anchor="mm")
        x += draw.textlength(c, font=f) + tracking


def grad_card(size, radius, top, bot):
    card = Image.new("RGBA", size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cw, ch = size
    msk = Image.new("L", size, 0)
    ImageDraw.Draw(msk).rounded_rectangle([0, 0, cw - 1, ch - 1], radius=radius, fill=255)
    for i in range(ch):
        t = i / max(ch - 1, 1)
        cd.line([(0, i), (cw, i)], fill=(*lerp(top, bot, t), 255))
    card.putalpha(msk)
    return card


def base_bg(w, h):
    base = Image.new("RGB", (w, h), NAVY_TOP)
    d = ImageDraw.Draw(base)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=lerp(NAVY_TOP, NAVY_BOT, y / max(h - 1, 1)))
    ov = ots(w, h)
    radial(ov, int(w * 0.5), int(h * 0.07), int(w * 0.5), GOLD, 30)
    radial(ov, int(w * 0.5), int(h * 0.94), int(w * 0.55), (41, 98, 255), 20)
    return Image.alpha_composite(base.convert("RGBA"), ov).convert("RGB")


def avatar(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(15, 26, 45), outline=GOLD, width=4)
    for rr, col in ((int(r * 0.80), GOLD2), (int(r * 0.61), GOLD), (int(r * 0.42), GOLD_D)):
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col)
    d.text((cx, cy), "JZAC", font=font(SBLACK, int(r * 0.5)), fill=INK, anchor="mm")


def eyebrow(d, cx, y, text="DESARROLLADOR DE SOFTWARE", sz=21):
    f = font(SSEMI, sz)
    tw = spw(d, text, f, 5)
    pw = int(tw + 66)
    ph = 46
    d.rounded_rectangle([cx - pw // 2, y, cx + pw // 2, y + ph], radius=ph // 2,
                        fill=(18, 28, 48), outline=(47, 62, 97), width=2)
    draw_spaced(d, cx, y + ph // 2, text, f, GOLD, 5)
    return ph


def oferta_box(d, base, cx, y, w, hh):
    cx0 = cx - w // 2
    gc = grad_card((w, hh), 30, GOLD2, GOLD_D)
    base.paste(gc, (cx0, y), gc)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([cx0, y, cx0 + w - 1, y + hh - 1], radius=30, outline=(255, 227, 138), width=3)
    d.rounded_rectangle([cx0 + 12, y + 9, cx0 + w - 12, y + 13], radius=3, fill=(255, 235, 160))
    draw_spaced(d, cx, y + int(hh * 0.24), "OFERTA POR TIEMPO LIMITADO", font(SSEMI, 19), BROWN, 4)
    d.text((cx, y + int(hh * 0.60)), "S/200", font=font(SBLACK, 60), fill=INK, anchor="mm")
    sub = "instalaci\u00f3n incluida \u00b7 precio regular S/300"
    subf = font(SSEMI, 19)
    sw = d.textlength(sub, font=subf)
    d.rounded_rectangle([cx - sw / 2 - 16, y + int(hh * 0.81) - 14, cx + sw / 2 + 16, y + int(hh * 0.81) + 14],
                        radius=14, fill=BROWN)
    d.text((cx, y + int(hh * 0.81)), sub, font=subf, fill=GOLD2, anchor="mm")
    return y + hh


def cta(d, base, cx, y, w, hh, label_sz=17, num_sz=56, sub_sz=20):
    cx0 = cx - w // 2
    ov = ots(base.width, base.height)
    od = ImageDraw.Draw(ov)
    for off, a in ((6, 24), (12, 38), (18, 28)):
        od.rounded_rectangle([cx0 + 12, y + off, cx0 + w - 12, y + off + hh], radius=34,
                             fill=(0, 0, 0, a))
    base.paste(Image.alpha_composite(base.convert("RGBA"), ov), (0, 0))
    gc = grad_card((w, hh), 34, GOLD2, GOLD_D)
    base.paste(gc, (cx0, y), gc)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([cx0, y, cx0 + w - 1, y + hh - 1], radius=34, outline=(255, 227, 138), width=3)
    d.rounded_rectangle([cx0 + 14, y + 10, cx0 + w - 14, y + 15], radius=3, fill=(255, 235, 160))
    draw_spaced(d, cx, y + int(hh * 0.24), "HABLEMOS POR WHATSAPP", font(SSEMI, label_sz), BROWN, 4)
    d.text((cx, y + int(hh * 0.55)), "+51 929 068 219", font=font(SBLACK, num_sz), fill=INK, anchor="mm")
    sub = "WhatsApp \u00b7 respuesta directa"
    dwf = font(SSEMI, sub_sz)
    sw = d.textlength(sub, font=dwf)
    dotr = 6
    d.ellipse([cx - sw / 2 - dotr - 12, y + int(hh * 0.80) - dotr,
               cx - sw / 2 - 12, y + int(hh * 0.80) + dotr], fill=GREEN)
    d.text((cx + 4, y + int(hh * 0.80)), sub, font=dwf, fill=BROWN, anchor="mm")
    return y + hh


def draw_square(out):
    w = h = 1080
    pad = 70
    maxw = w - 2 * pad
    cx = w // 2
    img = base_bg(w, h)
    d = ImageDraw.Draw(img)

    y = 70
    ar = 42
    avatar(d, cx, y + ar, ar)
    y += 2 * ar + 20

    y += eyebrow(d, cx, y, "LANZAMIENTO", sz=22)
    y += 10

    nf = font(SREG, 26)
    d.text((cx, y), "Jimy Alania \u00b7 Desarrollador de Software", font=nf, fill=ALTO, anchor="mm")
    y += asc_desc(nf) + 10

    hf = font(SBLACK, 56)
    d.text((cx, y), "\u00bfNecesitas una app", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 2
    d.text((cx, y), "para tu negocio?", font=hf, fill=GOLD2, anchor="mm")
    y += asc_desc(hf) + 34

    y = oferta_box(d, img, cx, y, int(maxw * 0.94), 140)
    y += 40

    chips = ["Ventas e inventario", "Apps a medida", "Soporte directo", "Instalaci\u00f3n"]
    gap = 22
    cw = (maxw - gap) // 2
    ph = 56
    left = cx - (cw * 2 + gap) // 2
    cf = font(SSEMI, 25)
    for i, c in enumerate(chips):
        bx = left + (i % 2) * (cw + gap)
        by = y + (i // 2) * (ph + gap)
        d.rounded_rectangle([bx, by, bx + cw - 1, by + ph - 1], radius=ph // 2,
                            fill=CARD, outline=CARD_EDGE, width=2)
        d.text((bx + cw // 2, by + ph // 2), c, font=cf, fill=GOLD, anchor="mm")
    y += 2 * ph + gap + 44

    y = cta(d, img, cx, y, maxw, 134, num_sz=52)
    y += 30

    lf = font(SSEMI, 22)
    loc = "Oxapampa \u00b7 Pasco \u00b7 Per\u00fa"
    d.text((cx, y), loc, font=lf, fill=ALTO, anchor="mm")

    img.save(out, "PNG")
    print("OK oferta cuadrado ->", out, "fin =", y + 20)


def draw_portrait(out):
    w, h = 1080, 1920
    pad = 80
    maxw = w - 2 * pad
    cx = w // 2
    img = base_bg(w, h)
    d = ImageDraw.Draw(img)

    y = 300

    y += eyebrow(d, cx, y, "LANZAMIENTO", sz=23)
    y += 26

    ar = 52
    avatar(d, cx, y + ar, ar)
    y += 2 * ar + 26

    nf = font(SREG, 30)
    d.text((cx, y), "Jimy Alania \u00b7 Desarrollador de Software", font=nf, fill=ALTO, anchor="mm")
    y += asc_desc(nf) + 24

    hf = font(SBLACK, 66)
    d.text((cx, y), "\u00bfNecesitas una app", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 4
    d.text((cx, y), "para tu negocio?", font=hf, fill=GOLD2, anchor="mm")
    y += asc_desc(hf) + 40

    y = oferta_box(d, img, cx, y, int(maxw * 0.96), 190)
    y += 56

    chips = ["Ventas e inventario", "Apps a medida", "Automatizaci\u00f3n", "Soporte directo"]
    gap = 30
    cw = (maxw - gap) // 2
    ph = 74
    left = cx - (cw * 2 + gap) // 2
    cf = font(SSEMI, 30)
    for i, c in enumerate(chips):
        bx = left + (i % 2) * (cw + gap)
        by = y + (i // 2) * (ph + gap)
        d.rounded_rectangle([bx, by, bx + cw - 1, by + ph - 1], radius=ph // 2,
                            fill=CARD, outline=CARD_EDGE, width=2)
        d.text((bx + cw // 2, by + ph // 2), c, font=cf, fill=GOLD, anchor="mm")
    y += 2 * ph + gap + 80

    y = cta(d, img, cx, y, maxw, 180, label_sz=20, num_sz=66, sub_sz=22)
    y += 56

    lf = font(SSEMI, 26)
    loc = "Oxapampa \u00b7 Pasco \u00b7 Per\u00fa"
    d.text((cx, y), loc, font=lf, fill=ALTO, anchor="mm")

    d.text((cx, h - 70), "Jimy Alania \u00b7 Desarrollador de Software",
           font=font(SLIGHT, 22), fill=(120, 134, 160), anchor="mm")

    img.save(out, "PNG")
    print("OK oferta retrato ->", out, "fin =", y + 30)


if __name__ == "__main__":
    draw_square(r"C:\Users\Intel\Documents\opencode\portfolio\banner_oferta_grupos.png")
    draw_portrait(r"C:\Users\Intel\Documents\opencode\portfolio\banner_oferta_estado.png")