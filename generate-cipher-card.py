#!/usr/bin/env python3
"""
Bright Hollow — Pigpen Cipher Infographic Generator v2.0
Generates a polished, cyberpunk-styled cipher reference card.

Usage:  python3 generate-cipher-card.py
Output: pigpen-cipher-v2.png
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

# ═══════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════

WIDTH, HEIGHT = 1400, 900
OUTPUT = "pigpen-cipher-v2.png"

# Challenge message (what gets encrypted at the bottom)
CHALLENGE_TEXT = "FIND THE HOLLOW"

# ── Color Palette ──
BG         = (6, 10, 22)
PANEL      = (12, 18, 38)
CELL_BG    = (8, 14, 30)
CELL_BD    = (30, 44, 68)
CYAN       = (0, 229, 255)
CYAN_DIM   = (0, 100, 135)
CYAN_GLOW  = (0, 60, 80)
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

SYM_LW     = 3       # Symbol line width
SYM_R      = 16      # Symbol half-size (reference grid)
CHAL_R     = 20      # Symbol half-size (challenge row)
DOT_RADIUS = 3

# ═══════════════════════════════════════════════════════════
#  FONT HELPER
# ═══════════════════════════════════════════════════════════

_font_cache = {}

def F(size, bold=False):
    """Load DejaVu Sans font (with cache)."""
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

# Grid-based symbols: walls = (top, right, bottom, left)
# Based on 3×3 tic-tac-toe grid:
#   A | B | C
#   ---------
#   D | E | F
#   ---------
#   G | H | I
# Each letter's symbol = the grid lines adjacent to its cell.

WALLS = {
    'A': (0, 1, 1, 0),   # bottom + right
    'B': (0, 1, 1, 1),   # bottom + left + right (U shape)
    'C': (0, 0, 1, 1),   # bottom + left
    'D': (1, 1, 1, 0),   # top + right + bottom (open left)
    'E': (1, 1, 1, 1),   # all four walls (box)
    'F': (1, 0, 1, 1),   # top + left + bottom (open right)
    'G': (1, 1, 0, 0),   # top + right
    'H': (1, 1, 0, 1),   # top + left + right (cap shape)
    'I': (1, 0, 0, 1),   # top + left
}

# J-R = same shapes as A-I, but with a center dot
DOT_MAP = dict(zip('JKLMNOPQR', 'ABCDEFGHI'))

# X-based symbols: vertex direction
# From the X grid:   \ /
#                      X
#                     / \
# S=top(V), T=right(>), U=left(<), V=bottom(^)
X_DIR = {
    'S': 'down',   # V shape (vertex at bottom)
    'T': 'right',  # > shape (vertex at right)
    'U': 'left',   # < shape (vertex at left)
    'V': 'up',     # ^ shape (vertex at top)
}

# W-Z = same shapes as S-V, but with a center dot
XDOT_MAP = dict(zip('WXYZ', 'STUV'))


# ═══════════════════════════════════════════════════════════
#  DRAWING FUNCTIONS
# ═══════════════════════════════════════════════════════════

def draw_walls(d, cx, cy, r, walls, dot=False, lw=SYM_LW, clr=SYM_COLOR):
    """Draw a pigpen grid symbol (walls around a cell)."""
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
    """Draw a pigpen X symbol (diagonal angles)."""
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
    """Draw the correct pigpen symbol for any letter A-Z."""
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
    """Draw a rounded panel rectangle."""
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=1)


def draw_brackets(d, x0, y0, x1, y1, L=14, clr=CYAN, w=2):
    """Draw decorative corner brackets on a rectangle."""
    corners = [
        [(x0, y0 + L), (x0, y0), (x0 + L, y0)],   # top-left
        [(x1 - L, y0), (x1, y0), (x1, y0 + L)],    # top-right
        [(x0, y1 - L), (x0, y1), (x0 + L, y1)],    # bottom-left
        [(x1 - L, y1), (x1, y1), (x1, y1 - L)],    # bottom-right
    ]
    for pts in corners:
        d.line(pts, fill=clr, width=w, joint="curve")


def draw_hline(d, x0, x1, y, clr=SEPARATOR):
    """Draw a subtle horizontal line."""
    d.line([(x0, y), (x1, y)], fill=clr, width=1)


def text_center_x(d, text, font, area_x0, area_x1):
    """Calculate the X position to center text within a horizontal range."""
    tw = d.textlength(text, font=font)
    return (area_x0 + area_x1) / 2 - tw / 2


def draw_glow_line(d, x0, y, x1, clr=CYAN, glow_clr=CYAN_GLOW, passes=3):
    """Draw a horizontal line with a glow effect."""
    for i in range(passes, 0, -1):
        alpha_clr = tuple(min(255, c + 20 * i) for c in glow_clr)
        d.line([(x0, y - i), (x1, y - i)], fill=alpha_clr, width=1)
        d.line([(x0, y + i), (x1, y + i)], fill=alpha_clr, width=1)
    d.line([(x0, y), (x1, y)], fill=clr, width=1)


# ═══════════════════════════════════════════════════════════
#  MAIN GENERATOR
# ═══════════════════════════════════════════════════════════

def main():
    img = Image.new("RGBA", (WIDTH, HEIGHT), (*BG, 255))
    d = ImageDraw.Draw(img)

    # ── Subtle scanlines ──────────────────────────────────
    for y in range(0, HEIGHT, 3):
        d.line([(0, y), (WIDTH, y)], fill=(255, 255, 255, 4), width=1)

    # ══════════════════════════════════════════════════════
    #  HEADER BAR
    # ══════════════════════════════════════════════════════
    d.rectangle([(0, 0), (WIDTH, 60)], fill=(*HEADER_BG, 255))
    draw_glow_line(d, 0, 60, WIDTH, CYAN_DIM, CYAN_GLOW, passes=2)

    d.text((24, 6), "BRIGHT HOLLOW  //  ENCRYPTION PROTOCOL",
           fill=DIM, font=F(11))
    d.text((24, 24), "PIGPEN CIPHER  —  CAN YOU CRACK IT?",
           fill=GOLD, font=F(28, True))
    d.text((WIDTH - 170, 10), "28.03.2026", fill=DIM, font=F(12))
    d.text((WIDTH - 170, 30), "v2.0", fill=DIM, font=F(12))

    # ══════════════════════════════════════════════════════
    #  LEFT PANEL: CIPHER KEY
    # ══════════════════════════════════════════════════════
    LP = (20, 72, 910, 545)
    draw_panel(d, LP)
    draw_brackets(d, *LP)

    d.text((LP[0] + 18, LP[1] + 14),
           "// CIPHER KEY — SYMBOL REFERENCE", fill=CYAN, font=F(14, True))

    CELL_W = 90
    CELL_H = 62
    CX_START = LP[0] + 55  # center-X of first cell

    # ── Row 1: A–I (grid, no dot) ──
    ry = LP[1] + 55
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

    # ── Row 2: J–R (grid, with dot) ──
    ry += CELL_H + 20
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

    # ── Row 3: S–Z (X-shapes) ──
    ry += CELL_H + 20
    x_offset = CX_START + CELL_W // 2  # center 8 cells in 9-wide row
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

    # ── Legend ──
    legend_y = ry + CELL_H + 22
    d.text((CX_START - 35, legend_y),
           "·  = dot variant   ( J–R mirror A–I shapes with a center dot  ·  "
           "W–Z mirror S–V )",
           fill=CYAN, font=F(11))

    draw_hline(d, LP[0] + 16, LP[2] - 16, legend_y + 28)

    # ── Explanation ──
    info_y = legend_y + 42
    info_lines = [
        "Grid symbols derive from a 3×3 tic-tac-toe layout — each cell's walls form the glyph.",
        "X symbols derive from two crossing diagonals — each triangular region forms the glyph.",
        "Position in the grid determines which edges are drawn; every letter has a unique shape.",
    ]
    for j, line in enumerate(info_lines):
        d.text((CX_START - 35, info_y + j * 20), line, fill=DIM, font=F(11))

    # ══════════════════════════════════════════════════════
    #  RIGHT PANEL: DECRYPTION GUIDE
    # ══════════════════════════════════════════════════════
    RP = (925, 72, WIDTH - 20, 545)
    draw_panel(d, RP)
    draw_brackets(d, *RP)

    d.text((RP[0] + 18, RP[1] + 14),
           "// DECRYPTION GUIDE", fill=CYAN, font=F(14, True))

    # ── Steps ──
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
        # Number
        d.text((RP[0] + 22, sy), num, fill=GOLD, font=F(24, True))
        # Title
        d.text((RP[0] + 64, sy + 4), title, fill=WHITE, font=F(14, True))
        # Description
        d.text((RP[0] + 64, sy + 24), desc, fill=DIM, font=F(11))
        sy += 80

    draw_hline(d, RP[0] + 20, RP[2] - 20, sy)
    sy += 12

    # ── Quick Tips ──
    d.text((RP[0] + 22, sy), "QUICK TIPS", fill=CYAN, font=F(12, True))
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

    # ── Step 02 ──
    by = 558
    d.rounded_rectangle([(20, by), (WIDTH - 20, by + BAR_H)],
                        radius=7, fill=RED_BG, outline=RED_DIM, width=1)
    # Red label
    d.rounded_rectangle([(28, by + 7), (132, by + BAR_H - 7)],
                        radius=5, fill=RED)
    label = "STEP 02"
    lw = d.textlength(label, font=F(15, True))
    d.text((80 - lw / 2, by + BAR_H // 2 - 10), label,
           fill=WHITE, font=F(15, True))
    # Classified text
    ct = "[ CLASSIFIED  —  FIGURE IT OUT ]"
    ctx = text_center_x(d, ct, F(14, True), 132, WIDTH - 20)
    d.text((ctx, by + BAR_H // 2 - 9), ct, fill=(110, 42, 48), font=F(14, True))

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

    # ══════════════════════════════════════════════════════
    #  CHALLENGE SECTION
    # ══════════════════════════════════════════════════════
    ch_y = by2 + BAR_H + 14
    ch_h = 150

    # Main box
    d.rounded_rectangle([(20, ch_y), (WIDTH - 20, ch_y + ch_h)],
                        radius=8, fill=(10, 15, 30))

    # Gold header strip
    strip_h = 30
    d.rounded_rectangle([(20, ch_y), (WIDTH - 20, ch_y + strip_h)],
                        radius=8, fill=(58, 50, 8))
    d.rectangle([(20, ch_y + 15), (WIDTH - 20, ch_y + strip_h)],
                fill=(58, 50, 8))
    ht = "// YOUR CHALLENGE  —  DECRYPT THIS MESSAGE"
    htx = text_center_x(d, ht, F(14, True), 20, WIDTH - 20)
    d.text((htx, ch_y + 6), ht, fill=GOLD, font=F(14, True))

    # ── Draw cipher symbols for the challenge text ──
    sym_y = ch_y + 82
    letter_sp = 44
    space_sp = 30
    # Calculate total width
    total_w = sum(letter_sp if c != ' ' else space_sp for c in CHALLENGE_TEXT)
    cx = WIDTH // 2 - total_w // 2 + letter_sp // 2

    # Draw glow pass (wider, dimmer lines)
    for ch in CHALLENGE_TEXT:
        if ch == ' ':
            cx += space_sp
        else:
            draw_symbol(d, cx, sym_y, CHAL_R, ch, lw=7, clr=CYAN_GLOW)
            cx += letter_sp

    # Draw sharp pass
    cx = WIDTH // 2 - total_w // 2 + letter_sp // 2
    for ch in CHALLENGE_TEXT:
        if ch == ' ':
            cx += space_sp
        else:
            draw_symbol(d, cx, sym_y, CHAL_R, ch)
            cx += letter_sp

    # Hint
    hint = "Begin with the key  ·  Then decode steps 02 & 03  ·  Good luck"
    hx = text_center_x(d, hint, F(11), 20, WIDTH - 20)
    d.text((hx, ch_y + ch_h - 28), hint, fill=DIM, font=F(11))

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

    # ══════════════════════════════════════════════════════
    #  VIGNETTE OVERLAY (dark edges)
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
