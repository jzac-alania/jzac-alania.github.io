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

    y = 86
    ar = 44
    avatar(d, cx, y + ar, ar)
    y += 2 * ar + 24

    y += eyebrow(d, cx, y)
    y += 16

    nf = font(SREG, 28)
    d.text((cx, y), "Jimy Alania", font=nf, fill=ALTO, anchor="mm")
    y += asc_desc(nf) + 14

    hf = font(SBLACK, 58)
    d.text((cx, y), "\u00bfNecesitas una app", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 2
    d.text((cx, y), "para tu negocio?", font=hf, fill=GOLD2, anchor="mm")
    y += asc_desc(hf) + 42

    d.rounded_rectangle([cx - 46, y, cx + 46, y + 4], radius=2, fill=GOLD)
    y += 44

    chips = ["Ventas e inventario", "Apps a medida", "Automatizaci\u00f3n", "Soporte directo"]
    gap = 24
    cw = (maxw - gap) // 2
    ph = 62
    left = cx - (cw * 2 + gap) // 2
    cf = font(SSEMI, 26)
    for i, c in enumerate(chips):
        bx = left + (i % 2) * (cw + gap)
        by = y + (i // 2) * (ph + gap)
        d.rounded_rectangle([bx, by, bx + cw - 1, by + ph - 1], radius=ph // 2,
                            fill=CARD, outline=CARD_EDGE, width=2)
        d.text((bx + cw // 2, by + ph // 2), c, font=cf, fill=GOLD, anchor="mm")
    y += 2 * ph + gap + 52

    y = cta(d, img, cx, y, maxw, 156, num_sz=56)

    y += 36

    lf = font(SSEMI, 24)
    loc = "Oxapampa \u00b7 Pasco \u00b7 Per\u00fa"
    lw = d.textlength(loc, font=lf)
    d.text((cx - 22, y), "\u25cf", font=font(SREG, 12), fill=GOLD, anchor="mm")
    d.text((cx, y), loc, font=lf, fill=ALTO, anchor="mm")
    d.text((cx + 22, y), "\u25cf", font=font(SREG, 12), fill=GOLD, anchor="mm")
    y += asc_desc(lf)

    d.text((cx, y + 26), "Jimy Alania \u00b7 Desarrollador de Software",
           font=font(SLIGHT, 20), fill=(120, 134, 160), anchor="mm")

    img.save(out, "PNG")
    print("OK cuadrado ->", out, "fin =", y + 44)


def draw_portrait(out):
    w, h = 1080, 1920
    pad = 80
    maxw = w - 2 * pad
    cx = w // 2
    img = base_bg(w, h)
    d = ImageDraw.Draw(img)

    y = 300

    y += eyebrow(d, cx, y, sz=23)
    y += 26

    ar = 52
    avatar(d, cx, y + ar, ar)
    y += 2 * ar + 26

    nf = font(SREG, 30)
    d.text((cx, y), "Jimy Alania", font=nf, fill=ALTO, anchor="mm")
    y += asc_desc(nf) + 30

    hf = font(SBLACK, 66)
    d.text((cx, y), "\u00bfNecesitas una app", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 4
    d.text((cx, y), "para tu negocio?", font=hf, fill=GOLD2, anchor="mm")
    y += asc_desc(hf) + 24

    sf = font(SLIGHT, 29)
    q = "Apps m\u00f3viles y web a medida. De la idea al lanzamiento."
    for line in wrap(d, q, sf, maxw):
        d.text((cx, y), line, font=sf, fill=MUTED, anchor="mm")
        y += asc_desc(sf)
    y += 96

    services = [
        ("Apps a medida", "M\u00f3viles y web para tu negocio."),
        ("Sistemas de gesti\u00f3n", "Ventas, inventario y control."),
        ("Automatizaci\u00f3n", "Procesos que trabajan solos."),
        ("Soporte directo", "Acompa\u00f1amiento en cada etapa."),
    ]
    gap = 30
    cardw = (maxw - gap) // 2
    cardh = 150
    left = cx - (cardw * 2 + gap) // 2
    for i, (t, de) in enumerate(services):
        bx = left + (i % 2) * (cardw + gap)
        by = y + (i // 2) * (cardh + gap)
        gc = grad_card((cardw, cardh), 22, (20, 34, 59), (14, 24, 43))
        img.paste(gc, (bx, by), gc)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([bx, by, bx + cardw - 1, by + cardh - 1], radius=22,
                            outline=CARD_EDGE, width=2)
        chip = 50
        d.rounded_rectangle([bx + 24, by + cardh // 2 - chip // 2, bx + 24 + chip, by + cardh // 2 + chip // 2],
                            radius=15, fill=GOLD2)
        d.text((bx + 24 + chip // 2, by + cardh // 2), "0%d" % (i + 1),
               font=font(SSEMI, 21), fill=INK, anchor="mm")
        tx = bx + 24 + chip + 20
        tf = font(SSEMI, 30)
        d.text((tx, by + 26), t, font=tf, fill=TEXT, anchor="la")
        dyy = by + 26 + asc_desc(tf) + 6
        df = font(SLIGHT, 24)
        for line in wrap(d, de, df, cardw - (tx - bx) - 22):
            d.text((tx, dyy), line, font=df, fill=MUTED, anchor="la")
            dyy += asc_desc(df)
    y += 2 * cardh + gap + 112

    y = cta(d, img, cx, y, maxw, 180, label_sz=20, num_sz=66, sub_sz=22)
    y += 56

    lf = font(SSEMI, 26)
    loc = "Oxapampa \u00b7 Pasco \u00b7 Per\u00fa"
    lw = d.textlength(loc, font=lf)
    d.text((cx - 24, y), "\u25cf", font=font(SREG, 13), fill=GOLD, anchor="mm")
    d.text((cx, y), loc, font=lf, fill=ALTO, anchor="mm")
    d.text((cx + 24, y), "\u25cf", font=font(SREG, 13), fill=GOLD, anchor="mm")
    y += asc_desc(lf) + 30

    d.text((cx, y), "Jimy Alania \u00b7 Desarrollador de Software",
           font=font(SLIGHT, 22), fill=(120, 134, 160), anchor="mm")

    img.save(out, "PNG")
    print("OK retrato ->", out, "fin =", y + 30)


if __name__ == "__main__":
    draw_square(r"C:\Users\Intel\Documents\opencode\portfolio\banner_whatsapp.png")
    draw_portrait(r"C:\Users\Intel\Documents\opencode\portfolio\banner_estado_whatsapp.png")