#!/usr/bin/env python3
"""
Bright Hollow — Pigpen Cipher Infographic Generator v3.0
Generates a polished, cyberpunk-styled cipher reference card.

Usage:  python3 generate-cipher-card-v3.py
Output: pigpen-cipher-v3.png
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os, random

# ═══════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════

WIDTH, HEIGHT = 1500, 920
OUTPUT = "pigpen-cipher-v3.png"

CHALLENGE_TEXT = "KWDS QHGGLK BJJLS"

# ── Color Palette ──
BG_TOP     = (8, 14, 32)
BG_BOT     = (3, 5, 12)
PANEL      = (12, 18, 38)
CELL_BG    = (8, 14, 30)
CELL_BD    = (30, 44, 68)
CYAN       = (0, 229, 255)
CYAN_DIM   = (0, 100, 135)
CYAN_GLOW  = (0, 60, 80)
CYAN_SOFT  = (0, 180, 210)
GOLD       = (255, 210, 50)
GOLD_DIM   = (160, 130, 25)
RED        = (215, 45, 55)
RED_DIM    = (95, 25, 30)
RED_BG     = (32, 10, 14)
WHITE      = (228, 234, 244)
DIM        = (60, 80, 108)
DIM_LT     = (85, 108, 138)
SYM_COLOR  = (0, 220, 248)
DOT_COLOR  = (0, 255, 210)
SEPARATOR  = (26, 40, 60)
HEADER_BG  = (10, 14, 30)

SYM_LW     = 3
SYM_R      = 16
CHAL_R     = 22
DOT_RADIUS = 3

# ═══════════════════════════════════════════════════════════
#  FONT HELPER
# ═══════════════════════════════════════════════════════════

_font_cache = {}

def F(size, bold=False):
    key = (size, bold)
    if key in _font_cache:
        return _font_cache[key]
    tag = "-Bold" if bold else ""
    for path in [
        f"/usr/share/fonts/truetype/dejavu/DejaVuSans{tag}.ttf",
        f"/usr/share/fonts/truetype/dejavu/DejaVuSansMono{tag}.ttf",
    ]:
        try:
            _font_cache[key] = ImageFont.truetype(path, size)
            return _font_cache[key]
        except OSError:
            pass
    _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]

# ═══════════════════════════════════════════════════════════
#  PIGPEN CIPHER DATA
# ═══════════════════════════════════════════════════════════

WALLS = {
    'A': (0, 1, 1, 0), 'B': (0, 1, 1, 1), 'C': (0, 0, 1, 1),
    'D': (1, 1, 1, 0), 'E': (1, 1, 1, 1), 'F': (1, 0, 1, 1),
    'G': (1, 1, 0, 0), 'H': (1, 1, 0, 1), 'I': (1, 0, 0, 1),
}
DOT_MAP = dict(zip('JKLMNOPQR', 'ABCDEFGHI'))
X_DIR = {'S': 'down', 'T': 'right', 'U': 'left', 'V': 'up'}
XDOT_MAP = dict(zip('WXYZ', 'STUV'))

# ═══════════════════════════════════════════════════════════
#  DRAWING FUNCTIONS
# ═══════════════════════════════════════════════════════════

def draw_walls(d, cx, cy, r, walls, dot=False, lw=SYM_LW, clr=SYM_COLOR):
    top, right, bottom, left = walls
    x0, y0, x1, y1 = cx - r, cy - r, cx + r, cy + r
    if top:    d.line([(x0, y0), (x1, y0)], fill=clr, width=lw)
    if right:  d.line([(x1, y0), (x1, y1)], fill=clr, width=lw)
    if bottom: d.line([(x0, y1), (x1, y1)], fill=clr, width=lw)
    if left:   d.line([(x0, y0), (x0, y1)], fill=clr, width=lw)
    if dot:
        dr = DOT_RADIUS
        d.ellipse([(cx - dr, cy - dr), (cx + dr, cy + dr)], fill=DOT_COLOR)


def draw_xshape(d, cx, cy, r, direction, dot=False, lw=SYM_LW, clr=SYM_COLOR):
    segs = {
        'down':  [(cx - r, cy - r, cx, cy + r), (cx + r, cy - r, cx, cy + r)],
        'right': [(cx - r, cy - r, cx + r, cy), (cx - r, cy + r, cx + r, cy)],
        'left':  [(cx + r, cy - r, cx - r, cy), (cx + r, cy + r, cx - r, cy)],
        'up':    [(cx - r, cy + r, cx, cy - r), (cx + r, cy + r, cx, cy - r)],
    }
    for x0, y0, x1, y1 in segs[direction]:
        d.line([(x0, y0), (x1, y1)], fill=clr, width=lw)
    if dot:
        dr = DOT_RADIUS
        d.ellipse([(cx - dr, cy - dr), (cx + dr, cy + dr)], fill=DOT_COLOR)


def draw_symbol(d, cx, cy, r, letter, **kw):
    ch = letter.upper()
    if ch in WALLS:
        draw_walls(d, cx, cy, r, WALLS[ch], **kw)
    elif ch in DOT_MAP:
        draw_walls(d, cx, cy, r, WALLS[DOT_MAP[ch]], dot=True, **kw)
    elif ch in X_DIR:
        draw_xshape(d, cx, cy, r, X_DIR[ch], **kw)
    elif ch in XDOT_MAP:
        draw_xshape(d, cx, cy, r, X_DIR[XDOT_MAP[ch]], dot=True, **kw)


def draw_panel(d, box, fill=PANEL, outline=CYAN_DIM, radius=8):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=1)


def draw_panel_glow(img, box, clr=CYAN_GLOW, radius=8, spread=6):
    """Draw a soft glow around a panel by blurring a bright outline."""
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for s in range(spread, 0, -1):
        a = int(30 * (1 - s / spread))
        c = (*clr[:3], a)
        inflated = (box[0] - s, box[1] - s, box[2] + s, box[3] + s)
        gd.rounded_rectangle(inflated, radius=radius + s, outline=c, width=2)
    return Image.alpha_composite(img, glow)


def draw_brackets(d, x0, y0, x1, y1, L=14, clr=CYAN, w=2):
    corners = [
        [(x0, y0 + L), (x0, y0), (x0 + L, y0)],
        [(x1 - L, y0), (x1, y0), (x1, y0 + L)],
        [(x0, y1 - L), (x0, y1), (x0 + L, y1)],
        [(x1 - L, y1), (x1, y1), (x1, y1 - L)],
    ]
    for pts in corners:
        d.line(pts, fill=clr, width=w, joint="curve")


def draw_hline(d, x0, x1, y, clr=SEPARATOR):
    d.line([(x0, y), (x1, y)], fill=clr, width=1)


def text_center_x(d, text, font, area_x0, area_x1):
    tw = d.textlength(text, font=font)
    return (area_x0 + area_x1) / 2 - tw / 2


def draw_glow_line(d, x0, y, x1, clr=CYAN, glow_clr=CYAN_GLOW, passes=3):
    for i in range(passes, 0, -1):
        alpha_clr = tuple(min(255, c + 20 * i) for c in glow_clr)
        d.line([(x0, y - i), (x1, y - i)], fill=alpha_clr, width=1)
        d.line([(x0, y + i), (x1, y + i)], fill=alpha_clr, width=1)
    d.line([(x0, y), (x1, y)], fill=clr, width=1)


def draw_number_circle(d, cx, cy, text, r=18, fill_clr=GOLD, text_clr=(10, 10, 20)):
    """Draw a number inside a golden circle."""
    # Outer glow ring
    for s in range(4, 0, -1):
        a_clr = (fill_clr[0], fill_clr[1], fill_clr[2], int(25 * (4 - s)))
        d.ellipse([(cx - r - s, cy - r - s), (cx + r + s, cy + r + s)],
                  outline=(*fill_clr[:3],), width=1)
    # Filled circle
    d.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=fill_clr)
    # Text
    tw = d.textlength(text, font=F(15, True))
    th = 15
    d.text((cx - tw / 2, cy - th / 2 - 1), text, fill=text_clr, font=F(15, True))


def draw_deco_dots(d, x, y, count=5, spacing=8, clr=CYAN_DIM, r=1):
    """Draw a row of small decorative dots."""
    for i in range(count):
        dx = x + i * spacing
        d.ellipse([(dx - r, y - r), (dx + r, y + r)], fill=clr)


def draw_deco_dashes(d, x, y, count=6, dash_w=12, gap=6, clr=SEPARATOR):
    """Draw a row of small decorative dashes."""
    for i in range(count):
        dx = x + i * (dash_w + gap)
        d.line([(dx, y), (dx + dash_w, y)], fill=clr, width=1)


def draw_mini_grid(d, cx, cy, size=28, clr=DIM):
    """Draw a miniature 3×3 tic-tac-toe grid for reference."""
    s3 = size / 3
    x0, y0 = cx - size / 2, cy - size / 2
    # Vertical lines
    d.line([(x0 + s3, y0), (x0 + s3, y0 + size)], fill=clr, width=1)
    d.line([(x0 + 2 * s3, y0), (x0 + 2 * s3, y0 + size)], fill=clr, width=1)
    # Horizontal lines
    d.line([(x0, y0 + s3), (x0 + size, y0 + s3)], fill=clr, width=1)
    d.line([(x0, y0 + 2 * s3), (x0 + size, y0 + 2 * s3)], fill=clr, width=1)
    # Outer border (subtle)
    d.rectangle([(x0, y0), (x0 + size, y0 + size)], outline=clr, width=1)


def draw_mini_x(d, cx, cy, size=28, clr=DIM):
    """Draw a miniature X grid for reference."""
    hs = size / 2
    d.line([(cx - hs, cy - hs), (cx + hs, cy + hs)], fill=clr, width=1)
    d.line([(cx + hs, cy - hs), (cx - hs, cy + hs)], fill=clr, width=1)


# ═══════════════════════════════════════════════════════════
#  BACKGROUND
# ═══════════════════════════════════════════════════════════

def make_background():
    """Create gradient background with subtle noise (no scanlines)."""
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)

    # Vertical gradient: dark blue top → near-black bottom
    for y in range(HEIGHT):
        t = y / HEIGHT
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        d.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

    # Subtle noise/grain
    random.seed(42)  # deterministic for reproducibility
    noise = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    nd = ImageDraw.Draw(noise)
    for _ in range(12000):
        nx = random.randint(0, WIDTH - 1)
        ny = random.randint(0, HEIGHT - 1)
        v = random.randint(8, 20)
        nd.point((nx, ny), fill=(v, v + 2, v + 8, 40))
    img = Image.alpha_composite(img, noise)

    return img


def add_radial_glow(img, cx, cy, radius=260, clr=(0, 50, 70)):
    """Add a radial glow highlight behind a focal area."""
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(radius, 0, -2):
        t = i / radius
        a = int(35 * (1 - t) * (1 - t))
        c = (*clr, a)
        gd.ellipse([(cx - i, cy - i), (cx + i, cy + i)], fill=c)
    return Image.alpha_composite(img, glow)


# ═══════════════════════════════════════════════════════════
#  MAIN GENERATOR
# ═══════════════════════════════════════════════════════════

def main():
    img = make_background()
    d = ImageDraw.Draw(img)

    # ══════════════════════════════════════════════════════
    #  HEADER BAR
    # ══════════════════════════════════════════════════════
    d.rectangle([(0, 0), (WIDTH, 62)], fill=(*HEADER_BG, 255))
    draw_glow_line(d, 0, 62, WIDTH, CYAN_DIM, CYAN_GLOW, passes=2)

    d.text((24, 6), "BRIGHT HOLLOW  //  ENCRYPTION PROTOCOL",
           fill=DIM, font=F(11))
    d.text((24, 24), "PIGPEN CIPHER  —  CAN YOU CRACK IT?",
           fill=GOLD, font=F(28, True))

    # Decorative dashes in header
    draw_deco_dashes(d, WIDTH - 320, 18, count=8, clr=CYAN_GLOW)
    d.text((WIDTH - 170, 10), "28.03.2026", fill=DIM, font=F(12))
    d.text((WIDTH - 170, 30), "v3.0", fill=DIM, font=F(12))
    draw_deco_dots(d, WIDTH - 170, 50, count=10, clr=CYAN_GLOW)

    # ══════════════════════════════════════════════════════
    #  LEFT PANEL: CIPHER KEY
    # ══════════════════════════════════════════════════════
    LP = (20, 76, 910, 555)
    draw_panel(d, LP)
    img = draw_panel_glow(img, LP, spread=5)
    d = ImageDraw.Draw(img)
    draw_brackets(d, *LP)

    d.text((LP[0] + 18, LP[1] + 12),
           "// CIPHER KEY — SYMBOL REFERENCE", fill=CYAN, font=F(14, True))
    draw_deco_dots(d, LP[0] + 340, LP[1] + 19, count=6, clr=CYAN_GLOW)

    CELL_W = 90
    CELL_H = 62
    CX_START = LP[0] + 55

    # ── Row 1: A–I  ─ GRID ──
    ry = LP[1] + 48
    # Row subtitle
    d.text((CX_START - 35, ry), "GRID  ( A – I )",
           fill=CYAN_DIM, font=F(10, True))
    ry += 16
    for i, letter in enumerate("ABCDEFGHI"):
        cx = CX_START + i * CELL_W
        cy = ry + CELL_H // 2
        d.rounded_rectangle(
            [(cx - 37, cy - 27), (cx + 37, cy + 27)],
            radius=5, fill=CELL_BG, outline=CELL_BD, width=1
        )
        tw = d.textlength(letter, font=F(11, True))
        d.text((cx - tw / 2, cy - 25), letter, fill=DIM_LT, font=F(11, True))
        draw_symbol(d, cx, cy + 6, SYM_R, letter)

    # ── Row 2: J–R  ─ GRID + DOT ──
    ry += CELL_H + 14
    d.text((CX_START - 35, ry), "GRID + DOT  ( J – R )",
           fill=CYAN_DIM, font=F(10, True))
    ry += 16
    for i, letter in enumerate("JKLMNOPQR"):
        cx = CX_START + i * CELL_W
        cy = ry + CELL_H // 2
        d.rounded_rectangle(
            [(cx - 37, cy - 27), (cx + 37, cy + 27)],
            radius=5, fill=CELL_BG, outline=CELL_BD, width=1
        )
        tw = d.textlength(letter, font=F(11, True))
        d.text((cx - tw / 2, cy - 25), letter, fill=DIM_LT, font=F(11, True))
        draw_symbol(d, cx, cy + 6, SYM_R, letter)

    # ── Row 3: S–Z  ─ DIAGONAL ──
    ry += CELL_H + 14
    d.text((CX_START - 35, ry), "DIAGONAL  ( S – Z )",
           fill=CYAN_DIM, font=F(10, True))
    ry += 16
    x_offset = CX_START + CELL_W // 2
    for i, letter in enumerate("STUVWXYZ"):
        cx = x_offset + i * CELL_W
        cy = ry + CELL_H // 2
        d.rounded_rectangle(
            [(cx - 37, cy - 27), (cx + 37, cy + 27)],
            radius=5, fill=CELL_BG, outline=CELL_BD, width=1
        )
        tw = d.textlength(letter, font=F(11, True))
        d.text((cx - tw / 2, cy - 25), letter, fill=DIM_LT, font=F(11, True))
        draw_symbol(d, cx, cy + 6, SYM_R, letter)

    # ── Visual Reference: mini grids ──
    ref_y = ry + CELL_H + 18
    draw_hline(d, LP[0] + 16, LP[2] - 16, ref_y)
    ref_y += 14

    # Mini tic-tac-toe grid + label
    grid_cx = CX_START - 5
    grid_cy = ref_y + 22
    draw_mini_grid(d, grid_cx, grid_cy, size=36, clr=CYAN_DIM)
    d.text((grid_cx + 28, grid_cy - 10),
           "Grid origin: each cell's surrounding walls form the glyph",
           fill=DIM, font=F(10))

    # Mini X grid + label
    x_cx = grid_cx
    x_cy = grid_cy + 42
    draw_mini_x(d, x_cx, x_cy, size=36, clr=CYAN_DIM)
    d.text((x_cx + 28, x_cy - 10),
           "X origin: each triangular region forms a V-shape glyph",
           fill=DIM, font=F(10))

    # Dot legend
    dot_cy = x_cy + 36
    d.ellipse([(grid_cx - 4, dot_cy - 4), (grid_cx + 4, dot_cy + 4)],
              fill=DOT_COLOR)
    d.text((grid_cx + 28, dot_cy - 7),
           "Center dot shifts the letter: A→J, B→K, … S→W, T→X, etc.",
           fill=DIM, font=F(10))

    # ══════════════════════════════════════════════════════
    #  RIGHT PANEL: DECRYPTION GUIDE
    # ══════════════════════════════════════════════════════
    RP = (925, 76, WIDTH - 20, 555)
    draw_panel(d, RP)
    img = draw_panel_glow(img, RP, spread=5)
    d = ImageDraw.Draw(img)
    draw_brackets(d, *RP)

    d.text((RP[0] + 18, RP[1] + 12),
           "// DECRYPTION GUIDE", fill=CYAN, font=F(14, True))

    # ── Steps with numbered circles ──
    sy = RP[1] + 52
    steps = [
        ("01", "DECODE THE GLYPH",
         "Every symbol is a fragment of the\n"
         "grid enclosing its letter"),
        ("02", "SPOT THE DOT",
         "A center dot transforms A–I into\n"
         "J–R — identical shape, new letter"),
        ("03", "READ THE ANGLES",
         "Diagonal V-shapes map to S–Z.\n"
         "The dot rule carries over for W–Z"),
    ]
    for num, title, desc in steps:
        # Numbered circle
        draw_number_circle(d, RP[0] + 40, sy + 14, num, r=16)
        # Title
        d.text((RP[0] + 66, sy + 4), title, fill=WHITE, font=F(14, True))
        # Description
        d.text((RP[0] + 66, sy + 24), desc, fill=DIM, font=F(11))
        sy += 80

    draw_hline(d, RP[0] + 20, RP[2] - 20, sy)
    sy += 14

    # ── Quick Tips ──
    d.text((RP[0] + 22, sy), "QUICK TIPS", fill=CYAN, font=F(12, True))
    draw_deco_dashes(d, RP[0] + 118, sy + 7, count=5, dash_w=8, gap=4, clr=CYAN_GLOW)
    sy += 22
    tips = [
        "→  Isolate each glyph, then count its edges",
        "→  Two walls = corner letter  (A, C, G, I)",
        "→  Four walls = center letter  (E or N·)",
        "→  Always check for the dot before deciding",
        "→  Diagonal shapes have no flat sides",
    ]
    for tip in tips:
        d.text((RP[0] + 22, sy), tip, fill=DIM, font=F(11))
        sy += 19

    sy += 8
    d.text((RP[0] + 22, sy),
           "THEN — 2 more steps after pigpen…",
           fill=GOLD, font=F(11, True))

    # ══════════════════════════════════════════════════════
    #  CLASSIFIED STEPS
    # ══════════════════════════════════════════════════════
    BAR_H = 50
    by = 568

    # ── Step 02 ──
    d.rounded_rectangle([(20, by), (WIDTH - 20, by + BAR_H)],
                        radius=7, fill=RED_BG, outline=RED_DIM, width=1)
    d.rounded_rectangle([(28, by + 7), (132, by + BAR_H - 7)],
                        radius=5, fill=RED)
    label = "STEP 02"
    lw = d.textlength(label, font=F(15, True))
    d.text((80 - lw / 2, by + BAR_H // 2 - 10), label,
           fill=WHITE, font=F(15, True))
    ct = "[ CLASSIFIED  —  FIGURE IT OUT ]"
    ctx = text_center_x(d, ct, F(14, True), 132, WIDTH - 20)
    d.text((ctx, by + BAR_H // 2 - 9), ct, fill=(110, 42, 48), font=F(14, True))
    # Edge dashes
    draw_deco_dashes(d, 145, by + BAR_H // 2, count=3, dash_w=8, gap=5, clr=RED_DIM)

    # ── Step 03 ──
    by2 = by + BAR_H + 10
    d.rounded_rectangle([(20, by2), (WIDTH - 20, by2 + BAR_H)],
                        radius=7, fill=RED_BG, outline=RED_DIM, width=1)
    d.rounded_rectangle([(28, by2 + 7), (132, by2 + BAR_H - 7)],
                        radius=5, fill=RED)
    label2 = "STEP 03"
    lw2 = d.textlength(label2, font=F(15, True))
    d.text((80 - lw2 / 2, by2 + BAR_H // 2 - 10), label2,
           fill=WHITE, font=F(15, True))
    d.text((ctx, by2 + BAR_H // 2 - 9), ct, fill=(110, 42, 48), font=F(14, True))
    draw_deco_dashes(d, 145, by2 + BAR_H // 2, count=3, dash_w=8, gap=5, clr=RED_DIM)

    # ══════════════════════════════════════════════════════
    #  CHALLENGE SECTION
    # ══════════════════════════════════════════════════════
    ch_y = by2 + BAR_H + 14
    ch_h = 158

    # Radial glow behind challenge area
    glow_cx = WIDTH // 2
    glow_cy = ch_y + ch_h // 2
    img = add_radial_glow(img, glow_cx, glow_cy, radius=300, clr=(0, 40, 55))
    d = ImageDraw.Draw(img)

    # Main box
    d.rounded_rectangle([(20, ch_y), (WIDTH - 20, ch_y + ch_h)],
                        radius=8, fill=(10, 15, 30, 220))

    # Gold header strip
    strip_h = 30
    d.rounded_rectangle([(20, ch_y), (WIDTH - 20, ch_y + strip_h)],
                        radius=8, fill=(58, 50, 8))
    d.rectangle([(20, ch_y + 15), (WIDTH - 20, ch_y + strip_h)],
                fill=(58, 50, 8))
    ht = "// YOUR CHALLENGE  —  DECRYPT THIS MESSAGE"
    htx = text_center_x(d, ht, F(14, True), 20, WIDTH - 20)
    d.text((htx, ch_y + 6), ht, fill=GOLD, font=F(14, True))

    # ── Cipher symbols (bigger, well-spaced) ──
    sym_y = ch_y + 86
    letter_sp = 62
    space_sp = 52
    total_w = sum(letter_sp if c != ' ' else space_sp for c in CHALLENGE_TEXT)

    # Glow pass
    cx = WIDTH // 2 - total_w // 2 + letter_sp // 2
    for ch in CHALLENGE_TEXT:
        if ch == ' ':
            cx += space_sp
        else:
            draw_symbol(d, cx, sym_y, CHAL_R, ch, lw=8, clr=(0, 40, 55))
            cx += letter_sp

    # Sharp pass
    cx = WIDTH // 2 - total_w // 2 + letter_sp // 2
    for ch in CHALLENGE_TEXT:
        if ch == ' ':
            cx += space_sp
        else:
            draw_symbol(d, cx, sym_y, CHAL_R, ch, lw=3, clr=CYAN)
            cx += letter_sp

    # Hint
    hint = "Begin with the key  ·  Then decode steps 02 & 03  ·  Good luck"
    hx = text_center_x(d, hint, F(11), 20, WIDTH - 20)
    d.text((hx, ch_y + ch_h - 28), hint, fill=DIM, font=F(11))
    # Decorative dots around hint
    draw_deco_dots(d, int(hx) - 40, ch_y + ch_h - 22, count=4, clr=CYAN_GLOW)
    hint_end = hx + d.textlength(hint, F(11))
    draw_deco_dots(d, int(hint_end) + 12, ch_y + ch_h - 22, count=4, clr=CYAN_GLOW)

    # ══════════════════════════════════════════════════════
    #  FOOTER
    # ══════════════════════════════════════════════════════
    ft_y = ch_y + ch_h + 12
    d.rectangle([(0, ft_y), (WIDTH, HEIGHT)], fill=(*HEADER_BG, 255))
    draw_glow_line(d, 0, ft_y, WIDTH, CYAN_DIM, CYAN_GLOW, passes=2)

    d.text((24, ft_y + 8),
           "FOR DAILY GUIDES, GIVEAWAYS & COMMUNITY", fill=DIM, font=F(10))
    d.text((24, ft_y + 24),
           "FIND THE HOLLOW  ·  DISCORD.GG/SxchUBHJAFQ",
           fill=CYAN, font=F(13, True))

    bh_text = "Bright Hollow"
    bh_w = d.textlength(bh_text, font=F(22, True))
    d.text((WIDTH - 30 - bh_w, ft_y + 12), bh_text,
           fill=WHITE, font=F(22, True))

    # Small corner dots in footer
    draw_deco_dots(d, WIDTH - 30 - int(bh_w) - 50, ft_y + 22, count=4, clr=CYAN_GLOW)

    # ══════════════════════════════════════════════════════
    #  VIGNETTE OVERLAY
    # ══════════════════════════════════════════════════════
    vig = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(80):
        a = int(35 * (1 - i / 80))
        vd.rectangle([(i, i), (WIDTH - i, HEIGHT - i)], outline=(0, 0, 0, a))
    img = Image.alpha_composite(img, vig)

    # ══════════════════════════════════════════════════════
    #  SAVE
    # ══════════════════════════════════════════════════════
    final = img.convert("RGB")
    final.save(OUTPUT, quality=95)
    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f"✓  Generated: {OUTPUT}  ({WIDTH}×{HEIGHT}, {size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
