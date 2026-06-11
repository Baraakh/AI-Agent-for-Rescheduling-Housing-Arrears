"""
One-off script to regenerate Data/Case2/02_bank_statement.pdf with consistent
AED 11,200 monthly pension credits across all 6 months.

Why: the original PDF had months 1-2 at AED 18,500 (old salary) and months 3-6
at AED 11,200 (current pension), causing V2 cross-check to fail (16.1% discrepancy)
and routing to P5 instead of P4. All 6 months must match the income certificate.

Run once: pip install fpdf2 && python generate_case2_bank_statement.py
"""
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from pathlib import Path

OUTPUT = Path(__file__).parent.parent / "Data" / "Case2" / "02_bank_statement.pdf"

MONTHS = [
    ("December 2025", "2025-12-01"),
    ("January 2026",  "2026-01-02"),
    ("February 2026", "2026-02-03"),
    ("March 2026",    "2026-03-03"),
    ("April 2026",    "2026-04-01"),
    ("May 2026",      "2026-05-01"),
]
CREDIT = 11_200.00

NL = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}   # newline after cell
NR = {"new_x": XPos.RIGHT,   "new_y": YPos.TOP}    # continue same line

pdf = FPDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# Header
pdf.set_font("Helvetica", "B", 18)
pdf.cell(0, 10, "SHARJAH ISLAMIC BANK", align="C", **NL)
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 7, "Account Statement - 6 Months", align="C", **NL)
pdf.ln(4)

# Account info
info = [
    ("Account Holder",   "Aisha Mohammed Al Nuaimi"),
    ("Emirates ID",      "784-1980-6628451-2"),
    ("Account No.",      "AE07 0331 2345 6789 0012 345"),
    ("Statement Period", "01 December 2025 - 31 May 2026"),
    ("Currency",         "AED - UAE Dirham"),
]
for label, value in info:
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(60, 8, label + ":", **NR)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, value, **NL)
pdf.ln(6)

# Table header
pdf.set_fill_color(230, 230, 230)
pdf.set_font("Helvetica", "B", 10)
COL = [45, 35, 65, 30, 30]
HEADERS = ["Date", "Reference", "Description", "Debit (AED)", "Credit (AED)"]
for i, (w, h) in enumerate(zip(COL, HEADERS)):
    kw = NL if i == len(COL) - 1 else NR
    pdf.cell(w, 9, h, border=1, fill=True, align="C", **kw)

# Transaction rows - all 6 months at AED 11,200
pdf.set_font("Helvetica", "", 10)
for i, (_label, date_str) in enumerate(MONTHS):
    ref = f"GPSS{2025120 + i}"
    row = [date_str, ref, "GPSSA PENSION CREDIT", "", f"{CREDIT:,.2f}"]
    for j, (w, cell) in enumerate(zip(COL, row)):
        kw = NL if j == len(COL) - 1 else NR
        pdf.cell(w, 9, cell, border=1, align="C", **kw)

pdf.ln(4)

# Summary
total = CREDIT * len(MONTHS)
pdf.set_font("Helvetica", "B", 10)
pdf.cell(0, 8, f"Total Credits (6 months): AED {total:,.2f}", **NL)
pdf.cell(0, 8, f"Average Monthly Credit:   AED {CREDIT:,.2f}", **NL)
pdf.ln(4)

# Footer
pdf.set_font("Helvetica", "I", 8)
pdf.cell(0, 6, "Computer-generated statement. Sharjah Islamic Bank, UAE.", align="C", **NL)
pdf.cell(0, 6, "SYNTHETIC - for SZHP AI Agent hackathon demo only.", align="C", **NL)

pdf.output(str(OUTPUT))
print(f"Generated: {OUTPUT}")
