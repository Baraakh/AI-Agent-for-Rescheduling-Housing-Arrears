// Simulated MOEI system data — auto-retrieved after UAE PASS login.
// In real deployment this comes from the MOEI loan management system via API.
// Keyed by the UAE PASS persona ID (case1–case4).

export const MOEI_LOAN_DATA = {
  case1: {
    beneficiaryId: 'SZHP-BEN-100417',
    loanId: 'SZHP-LN-2014-08831',
    originalAmount: 750000,
    disbursementDate: '2014-10-01',
    originalTermMonths: 240,
    remainingTermMonths: 144,
    currentEmi: 3400,
    outstandingBalance: 489600,
    currentSalary: 29500,
    salaryAtOrigination: 22000,
    arrears: {
      totalAmount: 13600,
      unpaidInstallments: 4,
      monthsOverdue: 4,
      firstMissedMonth: '2026-02',
    },
    paymentHistory: [
      { month: '2025-06', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2025-07', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2025-08', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2025-09', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2025-10', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2025-11', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2025-12', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2026-01', due: 3400, paid: 3400, status: 'PAID' },
      { month: '2026-02', due: 3400, paid: 0, status: 'MISSED' },
      { month: '2026-03', due: 3400, paid: 0, status: 'MISSED' },
      { month: '2026-04', due: 3400, paid: 0, status: 'MISSED' },
      { month: '2026-05', due: 3400, paid: 0, status: 'MISSED' },
    ],
    previousApplications: [
      { id: 'SZHP-APP-2019-0442', type: 'INSTALLMENT_MODIFICATION', status: 'CLOSED', outcome: 'APPROVED' },
    ],
  },

  case2: {
    beneficiaryId: 'SZHP-BEN-100892',
    loanId: 'SZHP-LN-2010-03317',
    originalAmount: 680000,
    disbursementDate: '2010-12-01',
    originalTermMonths: 300,
    remainingTermMonths: 205,
    currentEmi: 2150,
    outstandingBalance: 440750,
    currentSalary: 11200,
    salaryAtOrigination: 18500,
    arrears: {
      totalAmount: 21500,
      unpaidInstallments: 10,
      monthsOverdue: 10,
      firstMissedMonth: '2025-08',
    },
    paymentHistory: [
      { month: '2025-06', due: 2150, paid: 2150, status: 'PAID' },
      { month: '2025-07', due: 2150, paid: 2150, status: 'PAID' },
      { month: '2025-08', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2025-09', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2025-10', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2025-11', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2025-12', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2026-01', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2026-02', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2026-03', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2026-04', due: 2150, paid: 0, status: 'MISSED' },
      { month: '2026-05', due: 2150, paid: 0, status: 'MISSED' },
    ],
    previousApplications: [],
  },

  case3: {
    beneficiaryId: 'SZHP-BEN-101338',
    loanId: 'SZHP-LN-2020-06620',
    originalAmount: 820000,
    disbursementDate: '2020-04-01',
    originalTermMonths: 240,
    remainingTermMonths: 170,
    currentEmi: 4100,
    outstandingBalance: 697000,
    currentSalary: 16000,
    salaryAtOrigination: 24000,
    arrears: {
      totalAmount: 32800,
      unpaidInstallments: 8,
      monthsOverdue: 8,
      firstMissedMonth: '2025-10',
    },
    paymentHistory: [
      { month: '2025-06', due: 4100, paid: 4100, status: 'PAID' },
      { month: '2025-07', due: 4100, paid: 4100, status: 'PAID' },
      { month: '2025-08', due: 4100, paid: 4100, status: 'PAID' },
      { month: '2025-09', due: 4100, paid: 4100, status: 'PAID' },
      { month: '2025-10', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2025-11', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2025-12', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2026-01', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2026-02', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2026-03', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2026-04', due: 4100, paid: 0, status: 'MISSED' },
      { month: '2026-05', due: 4100, paid: 0, status: 'MISSED' },
    ],
    previousApplications: [
      { id: 'SZHP-APP-2023-1190', type: 'INSTALLMENT_MODIFICATION', status: 'CLOSED', outcome: 'WITHDRAWN' },
    ],
  },

  case4: {
    beneficiaryId: 'SZHP-BEN-101755',
    loanId: 'SZHP-LN-2017-05104',
    originalAmount: 600000,
    disbursementDate: '2017-02-01',
    originalTermMonths: 240,
    remainingTermMonths: 156,
    currentEmi: 2900,
    outstandingBalance: 452400,
    currentSalary: 19800,
    salaryAtOrigination: 19500,
    arrears: {
      totalAmount: 17400,
      unpaidInstallments: 6,
      monthsOverdue: 6,
      firstMissedMonth: '2025-09',
    },
    paymentHistory: [
      { month: '2025-06', due: 2900, paid: 2900, status: 'PAID' },
      { month: '2025-07', due: 2900, paid: 2900, status: 'PAID' },
      { month: '2025-08', due: 2900, paid: 2900, status: 'PAID' },
      { month: '2025-09', due: 2900, paid: 0, status: 'MISSED' },
      { month: '2025-10', due: 2900, paid: 0, status: 'MISSED' },
      { month: '2025-11', due: 2900, paid: 0, status: 'MISSED' },
      { month: '2025-12', due: 2900, paid: 2900, status: 'PAID' },
      { month: '2026-01', due: 2900, paid: 0, status: 'MISSED' },
      { month: '2026-02', due: 2900, paid: 0, status: 'MISSED' },
      { month: '2026-03', due: 2900, paid: 0, status: 'MISSED' },
      { month: '2026-04', due: 2900, paid: 2900, status: 'PAID' },
      { month: '2026-05', due: 2900, paid: 2900, status: 'PAID' },
    ],
    previousApplications: [],
  },
}

export function getLoanDataByPersonaId(personaId) {
  return MOEI_LOAN_DATA[personaId] || null
}

export function getPaymentOnTimePct(paymentHistory) {
  if (!paymentHistory?.length) return 100
  const paid = paymentHistory.filter((p) => p.status === 'PAID').length
  return Math.round((paid / paymentHistory.length) * 100)
}

export default MOEI_LOAN_DATA