# Demo Cases Manifest — Sahel Agent

Synthetic beneficiary cases for demonstrating and testing the SZHP arrears
rescheduling agent. All documents are synthetic (clearly marked) and internally
consistent within each case. Figures here are the "ground truth" the documents
encode; the loan/arrears figures would live in the MOEI mock, the income figures
come from the certificates and bank statements.

Every document carries a footer marking it as a synthetic testing sample.

---

## Case 1 — Khalid Saeed Al Mazrouei — Path P1 (Increase)

**Demo beat:** Fast, clean auto-approval. The speed story.

| Field | Value |
|---|---|
| Emirates ID | 784-1988-3471902-6 |
| Family size | 4 (married, 2 children) |
| Employer | ADNOC Onshore (stable) |
| Current salary | AED 29,500 (up from 22,000 at origination, +34%) |
| Per-member income | AED 7,375 |
| Hardship type | TEMPORARY_CIRCUMSTANCE (resolved) |
| Bank vs certificate | Consistent (29,500 = 29,500) → V2 passes |

**Documents:** salary certificate, bank statement (6 mo), hardship letter.
**Why P1:** income up, low obligations, healthy per-member income, hardship resolved,
applicant explicitly willing to increase. Headroom under the 20% cap supports a
moderate installment increase.

---

## Case 2 — Aisha Mohammed Al Nuaimi — Path P4 (Transfer Arrears)

**Demo beat:** Compassionate hardship handling + Arabic NLU + medical QR verification.
The empathy and capability story.

| Field | Value |
|---|---|
| Emirates ID | 784-1980-6628451-2 |
| Family size | 5 (widowed, 4 children) |
| Income | AED 11,200 pension (down from 18,500 salary, −39.5%) |
| Per-member income | AED 2,240 (BELOW the 2,500 threshold → S6 binding) |
| Hardship type | MEDICAL_HARDSHIP + INCOME_REDUCTION |
| Medical report | MOHAP, MS (ICD-10 G35), permanent unfit, verifiable QR |
| Bank vs certificate | Consistent (pension 11,200) → V2 passes |

**Documents:** income/pension certificate, bank statement (salary→pension transition),
hardship letter (AR/EN), medical report with verification QR.
**QR payload:** signed JSON — issuer MOHAP, report_id MOH-MR-2026-887341, decision,
signature. The report_id matches the visible text (A2 cross-check passes).
**Why P4:** income down, near 20% cap, per-member income below threshold, genuine
documented hardship. Defer arrears to end of loan without increasing installment.

---

## Case 3 — Mohammed Rashid Al Hammadi — Path P5 (Escalate)

**Demo beat:** The agent catches an inconsistency and refuses to auto-decide.
The governance and trust story. **Most important case for the 25-pt governance bucket.**

| Field | Value |
|---|---|
| Emirates ID | 784-1985-2249076-3 |
| Family size | 5 (married, 3 children) |
| Claimed salary | AED 16,000 (new employer, salary certificate) |
| Observed salary | AED 24,000 (bank statement, all 6 months, old employer) |
| Discrepancy | ~50% — far exceeds ±10% tolerance → V2 FAILS / ESC3 |
| Hardship type | INCOME_REDUCTION (claimed, unverified) |

**Documents:** salary certificate (16,000), contradicting bank statement (24,000),
hardship letter.
**Why P5:** The declared income (certificate + letter) contradicts the observed bank
transfers by far more than the 10% tolerance. The agent cannot trust the income
figure, so it must NOT auto-decide. It escalates to a human officer with a clear
explanation of the discrepancy. This demonstrates the agent knows its limits.

---

## Case 4 — Fatima Ali Al Shamsi — Path P3 (Maintain)

**Demo beat:** Nuanced steady handling of a temporary, resolved circumstance.
The consistency story.

| Field | Value |
|---|---|
| Emirates ID | 784-1990-7714388-1 |
| Family size | 4 (married, 2 children) |
| Salary | AED 19,800 (stable, ~unchanged) |
| Per-member income | AED 4,950 |
| Hardship type | TEMPORARY_CIRCUMSTANCE (resolved) |
| Supporting doc | Spouse's surgery discharge summary (Thumbay Hospital) |
| Bank vs certificate | Consistent (19,800) → V2 passes |

**Documents:** salary certificate, bank statement (6 mo), hardship letter,
supporting medical note (spouse).
**Why P3:** income stable, current EMI reasonable, hardship temporary and resolved,
installments already resumed. Keep installment unchanged and spread arrears across
the remaining term within the 20% cap.

---

## Coverage Summary

| Case | Path | Hardship | V2 cross-check | Outcome |
|---|---|---|---|---|
| Khalid | P1 | Temporary (resolved) | Pass | Auto-approve (increase) |
| Aisha | P4 | Medical + income drop | Pass | Auto-approve (transfer) |
| Mohammed | P5 | Income drop (claimed) | **Fail** | Escalate to human |
| Fatima | P3 | Temporary (resolved) | Pass | Auto-approve (maintain) |

Paths demonstrated: P1, P3, P4, P5. (P2 — partial increase — is a near-variant of
P1 and is intentionally not given a separate demo case.)

## Future fraud-detection asset

Case 2's QR is a real signed payload. A tampered twin (mismatched report_id or
malformed signature) can be generated later to demonstrate Agent A2 catching a
forged document — a strong governance beat for the demo.
