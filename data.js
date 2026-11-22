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
   Use  chapters: "all"  when an exam covers a subject's whole syllabus.

   An exam can also list "extra" papers with no chapters (for example a language theory paper):
     extra: { "Part II Languages": { date: "2026-12-10", note: "Theory exam, no fixed chapters" } }
   These show only in the timetable, not in the study plan.

   Practicals or other dated events (no chapters, shown only in the timetable):
   SYLLABUS["Board-Stream"].events = [ { name: "Board Practicals", dates: ["2027-01-06", "2027-01-07"] } ];
   A date can also carry a note:  { date: "2027-01-06", note: "Physics practical" }
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
        papers: { "Chemistry": { date: "2026-11-20", chapters: [1, 5, 6, 10] } } },
      { name: "Computer Science exam",
        papers: { "Computer Science": { date: "2026-11-23", chapters: [2, 3, 4, 5, 8] } } },
      { name: "Model exam 1",
        papers: {
          // "English": { date: "2026-12-07", chapters: "all" },  // add after CBSE English chapters exist
          "Mathematics": { date: "2026-12-09", chapters: "all" },
          "Chemistry":   { date: "2026-12-11", chapters: "all" },
          "Computer Science": { date: "2026-12-14", chapters: "all" },
          "Physics":     { date: "2026-12-16", chapters: "all" }
        } },
      { name: "Model exam 2",
        papers: {
          "Chemistry":   { date: "2026-12-29", chapters: "all" },
          "Mathematics": { date: "2027-01-01", chapters: "all" },
          "Physics":     { date: "2027-01-04", chapters: "all" },
          // "English": { date: "2027-01-15", chapters: "all" },  // add after CBSE English chapters exist
          "Computer Science": { date: "2027-01-20", chapters: "all" }
        } }
    ]
  },
  "CBSE-PCMB": {
    subjects: { ...CBSE_COMMON, "Biology": ["Sexual Reproduction in Flowering Plants","Human Reproduction","Reproductive Health","Principles of Inheritance and Variation","Molecular Basis of Inheritance","Evolution","Human Health and Disease","Microbes in Human Welfare","Biotechnology: Principles and Processes","Biotechnology and its Applications","Organisms and Populations","Ecosystem","Biodiversity and Conservation"] },
    exams: [
      { name: "Chemistry exam",
        papers: { "Chemistry": { date: "2026-11-20", chapters: [1, 5, 6, 10] } } },
      { name: "Biology exam",
        papers: { "Biology": { date: "2026-11-23", chapters: [3, 6, 11, 12] } } },
      { name: "Model exam 1",
        papers: {
          // "English": { date: "2026-12-07", chapters: "all" },  // add after CBSE English chapters exist
          "Mathematics": { date: "2026-12-09", chapters: "all" },
          "Chemistry":   { date: "2026-12-11", chapters: "all" },
          "Biology": { date: "2026-12-14", chapters: "all" },
          "Physics":     { date: "2026-12-16", chapters: "all" }
        } },
      { name: "Model exam 2",
        papers: {
          "Chemistry":   { date: "2026-12-29", chapters: "all" },
          "Mathematics": { date: "2027-01-01", chapters: "all" },
          "Physics":     { date: "2027-01-04", chapters: "all" },
          // "English": { date: "2027-01-15", chapters: "all" },  // add after CBSE English chapters exist
          "Biology": { date: "2027-01-20", chapters: "all" }
        } }
    ]
  },
  // State board entries are filled below from the CBSE lists (same chapter names).
  // Exams stay separate for every board and batch.
  "State-PCMC": {
    subjects: {},
    exams: [
      { name: "Christmas exam",
        extra: { "Part II Languages": { date: "2026-12-10", note: "Theory exam, no fixed chapters" } },
        papers: {
          "Physics":     { date: "2026-12-09", chapters: "all" },
          "Mathematics": { date: "2026-12-11", chapters: "all" },
          "Chemistry":   { date: "2026-12-14", chapters: "all" },
          "Computer Science": { date: "2026-12-16", chapters: "all" },
          "English":     { date: "2026-12-17", chapters: "all" }
        } }
    ]
  },
  "State-PCMB": {
    subjects: {},
    exams: [
      { name: "Christmas exam",
        extra: { "Part II Languages": { date: "2026-12-10", note: "Theory exam, no fixed chapters" } },
        papers: {
          "Physics":     { date: "2026-12-09", chapters: "all" },
          "Mathematics": { date: "2026-12-11", chapters: "all" },
          "Chemistry":   { date: "2026-12-14", chapters: "all" },
          "Biology": { date: "2026-12-15", chapters: "all" },
          "English":     { date: "2026-12-17", chapters: "all" }
        } }
    ]
  }
};

// English is common to all State board batches.
const STATE_ENGLISH = ["The 3Ls Of Empowerment","Any Woman","Matchbox","Horegallu","Mending Wall","Amigo Brothers","The Hour Of Truth","A Three Wheeled Revolution","Didi","Stammer","When a Sapling is Planted","Rice","Dangers of Drug Abuse","Post Early for Christmas","This is Going to Hurt Just A Little Bit","Crime and Punishment"];

// State PCMB: same Physics, Chemistry, Mathematics and Biology as CBSE PCMB, plus English.
SYLLABUS["State-PCMB"].subjects = {
  ...CBSE_COMMON,
  "English": STATE_ENGLISH,
  "Biology": SYLLABUS["CBSE-PCMB"].subjects["Biology"]
};
// State PCMC: Physics, Chemistry and Mathematics are shared with PCMB, plus English.
SYLLABUS["State-PCMC"].subjects = {
  ...CBSE_COMMON,
  "English": STATE_ENGLISH,
  "Computer Science": ["Structures and Pointers","Concepts of Object Oriented Programming","Data Structures and Operations","Web Technology","Web Designing Using HTML","Client Side Scripting Using JavaScript","Web Hosting","Database Management System","Structured Query Language","Server Side Scripting Using PHP","Advances in Computing","ICT and Society"]
};

// Board practicals (no chapters, so they only appear in the timetable)
const CBSE_PRACTICALS = { name: "Board Practicals", dates: ["2027-01-06","2027-01-07","2027-01-08","2027-01-11","2027-01-12","2027-01-13","2027-01-14","2027-01-15"] };
SYLLABUS["CBSE-PCMC"].events = [CBSE_PRACTICALS];
SYLLABUS["CBSE-PCMB"].events = [CBSE_PRACTICALS];
