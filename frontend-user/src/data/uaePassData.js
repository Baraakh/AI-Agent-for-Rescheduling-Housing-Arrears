// Simulated UAE PASS personas for demo.
// In real deployment this data comes from the UAE PASS API after authentication.
// Each persona maps to one of the 4 demo cases (P1, P4, P5, P3).

export const UAE_PASS_PERSONAS = [
  {
    id: 'case1',
    caseLabel: 'Case 1 — P1',
    emiratesId: '784-1988-3471902-6',
    fullNameEn: 'Khalid Saeed Al Mazrouei',
    fullNameAr: 'خالد سعيد المزروعي',
    nationality: 'United Arab Emirates',
    dateOfBirth: '1988-07-14',
    gender: 'Male',
    mobile: '+971-50-441-7720',
    email: 'khalid.almazrouei@example.ae',
    address: { emirate: 'Abu Dhabi', area: 'Khalifa City' },
    maritalStatus: 'Married',
    householdSize: 4,
    dependents: 2,
    employer: 'ADNOC Onshore',
    addMandateSigned: true,
  },
  {
    id: 'case2',
    caseLabel: 'Case 2 — P4',
    emiratesId: '784-1980-6628451-2',
    fullNameEn: 'Aisha Mohammed Al Nuaimi',
    fullNameAr: 'عائشة محمد النعيمي',
    nationality: 'United Arab Emirates',
    dateOfBirth: '1981-03-03',
    gender: 'Female',
    mobile: '+971-55-227-9914',
    email: 'aisha.alnuaimi@example.ae',
    address: { emirate: 'Sharjah', area: 'Al Wahda' },
    maritalStatus: 'Widowed',
    householdSize: 5,
    dependents: 4,
    employer: 'Ministry of Social Affairs (Pension)',
    addMandateSigned: true,
  },
  {
    id: 'case3',
    caseLabel: 'Case 3 — P5',
    emiratesId: '784-1985-2249076-3',
    fullNameEn: 'Mohammed Rashid Al Hammadi',
    fullNameAr: 'محمد راشد الحمادي',
    nationality: 'United Arab Emirates',
    dateOfBirth: '1985-11-22',
    gender: 'Male',
    mobile: '+971-50-884-1772',
    email: 'm.alhammadi@example.ae',
    address: { emirate: 'Dubai', area: 'Deira' },
    maritalStatus: 'Married',
    householdSize: 5,
    dependents: 3,
    employer: 'Falcon Contracting LLC',
    addMandateSigned: true,
  },
  {
    id: 'case4',
    caseLabel: 'Case 4 — P3',
    emiratesId: '784-1990-7714388-1',
    fullNameEn: 'Fatima Ali Al Shamsi',
    fullNameAr: 'فاطمة علي الشامسي',
    nationality: 'United Arab Emirates',
    dateOfBirth: '1990-05-19',
    gender: 'Female',
    mobile: '+971-56-771-4388',
    email: 'fatima.alshamsi@example.ae',
    address: { emirate: 'Ajman', area: 'Al Nuaimiya' },
    maritalStatus: 'Married',
    householdSize: 4,
    dependents: 2,
    employer: 'Ajman Municipality',
    addMandateSigned: true,
  },
]

export function getPersonaById(id) {
  return UAE_PASS_PERSONAS.find((p) => p.id === id) || null
}

export default UAE_PASS_PERSONAS
