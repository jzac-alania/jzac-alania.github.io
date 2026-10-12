# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw
from generar_banner_oferta import (font, lerp, asc_desc, ots, radial, spw,
                                        draw_spaced, grad_card, base_bg, avatar, eyebrow,
                                        GOLD, GOLD2, GOLD_D, INK, TEXT, MUTED, ALTO,
                                        BROWN, GREEN, SBLACK, SSEMI, SLIGHT, SREG)


def strikethrough(d, cx, cy, text, f, color, over):
    wd = d.textlength(text, font=f)
    d.text((cx, cy - 2), text, font=f, fill=color, anchor="mm")
    d.line([cx - wd / 2, cy + 4, cx + wd / 2, cy + 2 + over], fill=color, width=4)


def draw_portrait(out):
    w, h = 1080, 1920
    cx = w // 2
    pad = 90
    maxw = w - 2 * pad
    img = base_bg(w, h)
    d = ImageDraw.Draw(img)

    y = 360

    ar = 48
    avatar(d, cx, y + ar, ar)
    y += 2 * ar + 22

    y += eyebrow(d, cx, y, "LANZAMIENTO", sz=22)
    y += 46

    hf = font(SBLACK, 60)
    d.text((cx, y), "\u00bfNecesitas una app", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 4
    d.text((cx, y), "para tu negocio?", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 46

    pf = font(SBLACK, 180)
    d.text((cx, y + 8), "S/200", font=pf, fill=(9, 14, 27), anchor="mm")
    d.text((cx, y), "S/200", font=pf, fill=GOLD2, anchor="mm")
    y += asc_desc(pf)

    strikethrough(d, cx, y, "precio regular S/300", font(SSEMI, 28), MUTED, 3)
    y += 66

    tf = font(SSEMI, 30)
    tag = "Ventas \u00b7 Inventario \u00b7 Control \u00b7 Soporte"
    d.text((cx, y), tag, font=tf, fill=GOLD, anchor="mm")
    y += 90

    lw = 80
    d.rounded_rectangle([cx - lw, y, cx + lw, y + 4], radius=2, fill=GOLD)
    y += 120

    chh = 190
    cx0 = cx - maxw // 2
    ov = ots(w, h)
    od = ImageDraw.Draw(ov)
    for off, a in ((6, 24), (12, 38), (18, 28)):
        od.rounded_rectangle([cx0 + 12, y + off, cx0 + maxw - 12, y + off + chh], radius=34,
                             fill=(0, 0, 0, a))
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov), (0, 0))
    gc = grad_card((maxw, chh), 34, GOLD2, GOLD_D)
    img.paste(gc, (cx0, y), gc)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([cx0, y, cx0 + maxw - 1, y + chh - 1], radius=34, outline=(255, 227, 138), width=3)
    draw_spaced(d, cx, y + int(chh * 0.24), "ESCR\u00cdBEME POR WHATSAPP", font(SSEMI, 20), BROWN, 4)
    d.text((cx, y + int(chh * 0.54)), "929 068 219", font=font(SBLACK, 66), fill=INK, anchor="mm")
    sub = "Oxapampa \u00b7 Pasco"
    sw = d.textlength(sub, font=font(SSEMI, 21))
    dotr = 6
    d.ellipse([cx - sw / 2 - dotr - 12, y + int(chh * 0.80) - dotr,
               cx - sw / 2 - 12, y + int(chh * 0.80) + dotr], fill=GREEN)
    d.text((cx + 4, y + int(chh * 0.80)), sub, font=font(SSEMI, 21), fill=BROWN, anchor="mm")
    y += chh + 56

    lf = font(SSEMI, 24)
    d.text((cx, y), "Jimy Alania \u00b7 Desarrollador de Software", font=lf, fill=ALTO, anchor="mm")

    img.save(out, "PNG")
    print("OK simple retrato ->", out, "fin =", y + 30)


def draw_square(out):
    w = h = 1080
    cx = w // 2
    pad = 70
    maxw = w - 2 * pad
    img = base_bg(w, h)
    d = ImageDraw.Draw(img)

    y = 110

    ar = 46
    avatar(d, cx, y + ar, ar)
    y += 2 * ar + 18

    y += eyebrow(d, cx, y, "LANZAMIENTO", sz=21)
    y += 36

    hf = font(SBLACK, 54)
    d.text((cx, y), "\u00bfNecesitas una app", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 2
    d.text((cx, y), "para tu negocio?", font=hf, fill=TEXT, anchor="mm")
    y += asc_desc(hf) + 36

    pf = font(SBLACK, 150)
    d.text((cx, y + 8), "S/200", font=pf, fill=(9, 14, 27), anchor="mm")
    d.text((cx, y), "S/200", font=pf, fill=GOLD2, anchor="mm")
    y += asc_desc(pf)

    strikethrough(d, cx, y, "precio regular S/300", font(SSEMI, 24), MUTED, 3)
    y += 56

    tf = font(SSEMI, 27)
    tag = "Ventas \u00b7 Inventario \u00b7 Soporte"
    d.text((cx, y), tag, font=tf, fill=GOLD, anchor="mm")
    y += 72

    chh = 150
    cx0 = cx - maxw // 2
    ov = ots(w, h)
    od = ImageDraw.Draw(ov)
    for off, a in ((6, 24), (12, 38), (18, 28)):
        od.rounded_rectangle([cx0 + 12, y + off, cx0 + maxw - 12, y + off + chh], radius=34,
                             fill=(0, 0, 0, a))
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov), (0, 0))
    gc = grad_card((maxw, chh), 34, GOLD2, GOLD_D)
    img.paste(gc, (cx0, y), gc)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([cx0, y, cx0 + maxw - 1, y + chh - 1], radius=34, outline=(255, 227, 138), width=3)
    draw_spaced(d, cx, y + int(chh * 0.24), "ESCR\u00cdBEME POR WHATSAPP", font(SSEMI, 16), BROWN, 3)
    d.text((cx, y + int(chh * 0.56)), "929 068 219", font=font(SBLACK, 52), fill=INK, anchor="mm")
    y += chh + 36

    lf = font(SSEMI, 23)
    d.text((cx, y), "Oxapampa \u00b7 Pasco \u00b7 Per\u00fa", font=lf, fill=ALTO, anchor="mm")

    img.save(out, "PNG")
    print("OK simple cuadrado ->", out, "fin =", y + 20)


if __name__ == "__main__":
    draw_portrait(r"C:\Users\Intel\Documents\opencode\portfolio\banner_oferta_simple_estado.png")
    draw_square(r"C:\Users\Intel\Documents\opencode\portfolio\banner_oferta_simple_grupos.png")