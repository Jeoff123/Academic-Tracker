/* ===== DATA FILE: the only place to change syllabus or exams (Jeoff) =====
   Students cannot edit any of this in the app.

   SYLLABUS["Board-Stream"] = { subjects: {...}, exams: [...] }
   - subjects: subject name -> list of chapter names, in order.
   - exams: one entry per exam (for example a term exam). Inside it, "papers"
     has one entry per subject with that subject's own date and the chapter
     NUMBERS it covers (position in the subject's list, starting at 1).

   Exam example (paste inside an "exams" list):
   { name: "Second term exam",
     papers: {
       "Physics":     { date: "2027-02-15", chapters: [1,2,3,4,5] },
       "Chemistry":   { date: "2027-02-18", chapters: [1,2,3] },
       "Mathematics": { date: "2027-02-21", chapters: [1,2,3,4,5,6] }
     } }
*/
const CBSE_COMMON = {
  "Physics": ["Electric Charges and Fields","Electrostatic Potential and Capacitance","Current Electricity","Moving Charges and Magnetism","Magnetism and Matter","Electromagnetic Induction","Alternating Current","Electromagnetic Waves","Ray Optics and Optical Instruments","Wave Optics","Dual Nature of Radiation and Matter","Atoms","Nuclei","Semiconductor Electronics"],
  "Chemistry": ["Solutions","Electrochemistry","Chemical Kinetics","The d- and f-Block Elements","Coordination Compounds","Haloalkanes and Haloarenes","Alcohols, Phenols and Ethers","Aldehydes, Ketones and Carboxylic Acids","Amines","Biomolecules"],
  "Mathematics": ["Relations and Functions","Inverse Trigonometric Functions","Matrices","Determinants","Continuity and Differentiability","Applications of Derivatives","Integrals","Applications of Integrals","Differential Equations","Vector Algebra","Three Dimensional Geometry","Linear Programming","Probability"]
};
const SYLLABUS = {
  "CBSE-PCMC": {
    subjects: { ...CBSE_COMMON, "Computer Science": ["Python Revision Tour","Functions","Exception Handling","File Handling","Data Structures: Stack","Computer Networks","Database Management and SQL","Interface Python with SQL"] },
    exams: [
      { name: "Chemistry exam",
        papers: {
          "Chemistry": { date: "2026-11-20", chapters: [1, 5, 6, 10] }
        } }
    ]
  },
  "CBSE-PCMB": {
    subjects: { ...CBSE_COMMON, "Biology": ["Sexual Reproduction in Flowering Plants","Human Reproduction","Reproductive Health","Principles of Inheritance and Variation","Molecular Basis of Inheritance","Evolution","Human Health and Disease","Microbes in Human Welfare","Biotechnology: Principles and Processes","Biotechnology and its Applications","Organisms and Populations","Ecosystem","Biodiversity and Conservation"] },
    exams: [
      { name: "Chemistry exam",
        papers: {
          "Chemistry": { date: "2026-11-20", chapters: [1, 5, 6, 10] }
        } }
    ]
  },
  // State board entries are filled below from the CBSE lists (same chapter names).
  // Exams stay separate for every board and batch.
  "State-PCMC": { subjects: {}, exams: [] },
  "State-PCMB": { subjects: {}, exams: [] }
};

// State PCMB has the same chapters as CBSE PCMB.
SYLLABUS["State-PCMB"].subjects = SYLLABUS["CBSE-PCMB"].subjects;
// State PCMC shares Physics, Chemistry and Mathematics with PCMB.
SYLLABUS["State-PCMC"].subjects = {
  ...CBSE_COMMON,
  "Computer Science": ["Structures and Pointers","Concepts of Object Oriented Programming","Data Structures and Operations","Web Technology","Web Designing Using HTML","Client Side Scripting Using JavaScript","Web Hosting","Database Management System","Structured Query Language","Server Side Scripting Using PHP","Advances in Computing","ICT and Society"]
};
