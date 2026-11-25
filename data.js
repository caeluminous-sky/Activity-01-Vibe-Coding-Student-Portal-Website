/*
 * Sample data for the student portal.
 * Edit this file to change what the portal shows. No backend needed.
 *
 * - Days in `meetings` are numbers: 1 = Mon ... 5 = Fri
 * - `dueIn` and `daysAgo` are relative to today, so the demo always looks current.
 * - A component with `score: null` is pending (not yet graded).
 */
window.PORTAL_DATA = {
  term: "1st Semester, A.Y. 2026-2027",

  student: {
    firstName: "Alex",
    lastName: "Rivera",
    studentId: "2024-10382",
    program: "BS Computer Science",
    yearLevel: "3rd Year",
    section: "CS-3A",
    email: "alex.rivera@northbridge.edu",
    phone: "+63 917 555 0142",
    birthdate: "2004-03-18",
    address: "128 Mabini Street, Quezon City",
    guardian: "Maria Rivera",
    guardianPhone: "+63 917 555 0199",
    advisor: "Dr. Maria Santos",
    status: "Regular"
  },

  courses: [
    {
      id: "CS301", name: "Design & Analysis of Algorithms", instructor: "Dr. Maria Santos",
      room: "Room B204", units: 3, color: "#6366f1",
      meetings: [{ day: 1, start: "09:00", end: "10:30" }, { day: 3, start: "09:00", end: "10:30" }],
      attendance: { present: 21, total: 23 },
      components: [
        { name: "Quizzes",      weight: 20, score: 88, max: 100 },
        { name: "Problem Sets", weight: 20, score: 92, max: 100 },
        { name: "Midterm Exam", weight: 25, score: 81, max: 100 },
        { name: "Final Exam",   weight: 35, score: null, max: 100 }
      ]
    },
    {
      id: "CS315", name: "Database Systems", instructor: "Prof. Daniel Cruz",
      room: "Computer Lab 3", units: 3, color: "#0ea5e9",
      meetings: [{ day: 2, start: "13:00", end: "14:30" }, { day: 4, start: "13:00", end: "14:30" }],
      attendance: { present: 22, total: 22 },
      components: [
        { name: "Lab Exercises", weight: 30, score: 95, max: 100 },
        { name: "Midterm Exam",  weight: 30, score: 89, max: 100 },
        { name: "Case Study",    weight: 15, score: 90, max: 100 },
        { name: "Final Exam",    weight: 25, score: null, max: 100 }
      ]
    },
    {
      id: "CS330", name: "Web Engineering", instructor: "Prof. Lea Tan",
      room: "Room C110", units: 3, color: "#10b981",
      meetings: [{ day: 1, start: "13:00", end: "14:30" }, { day: 3, start: "13:00", end: "14:30" }],
      attendance: { present: 20, total: 23 },
      components: [
        { name: "Activities",    weight: 20, score: 96, max: 100 },
        { name: "Midterm Project", weight: 25, score: 93, max: 100 },
        { name: "Quizzes",       weight: 15, score: 85, max: 100 },
        { name: "Final Project", weight: 40, score: null, max: 100 }
      ]
    },
    {
      id: "MATH240", name: "Linear Algebra", instructor: "Dr. Henry Lim",
      room: "Room A105", units: 3, color: "#f59e0b",
      meetings: [{ day: 2, start: "09:00", end: "10:30" }, { day: 4, start: "09:00", end: "10:30" }],
      attendance: { present: 19, total: 22 },
      components: [
        { name: "Quizzes",      weight: 25, score: 74, max: 100 },
        { name: "Midterm Exam", weight: 35, score: 78, max: 100 },
        { name: "Homework",     weight: 10, score: 90, max: 100 },
        { name: "Final Exam",   weight: 30, score: null, max: 100 }
      ]
    },
    {
      id: "ENG210", name: "Technical Writing", instructor: "Ms. Grace Ong",
      room: "Room D302", units: 2, color: "#ec4899",
      meetings: [{ day: 5, start: "10:00", end: "12:30" }],
      attendance: { present: 11, total: 11 },
      components: [
        { name: "Reports",      weight: 40, score: 91, max: 100 },
        { name: "Presentation", weight: 20, score: 94, max: 100 },
        { name: "Portfolio",    weight: 40, score: null, max: 100 }
      ]
    }
  ],

  deadlines: [
    { title: "Web Engineering: Final Project demo", course: "CS330",   dueIn: 3 },
    { title: "Algorithms: Problem Set 9",           course: "CS301",   dueIn: 5 },
    { title: "Database Systems: Case Study report", course: "CS315",   dueIn: 8 },
    { title: "Technical Writing: Portfolio draft",  course: "ENG210",  dueIn: 12 }
  ],

  announcements: [
    {
      id: "a1", category: "Academic", important: true, daysAgo: 0,
      title: "Final examination schedule released",
      body: "The final examination schedule for this semester is now posted. Exams run from December 15 to 19. Please check your course schedule for the exact room and time, and bring a valid school ID on exam days. Conflicts must be reported to the Registrar by December 1."
    },
    {
      id: "a2", category: "Finance", important: true, daysAgo: 1,
      title: "Last day to settle tuition balance",
      body: "Students with outstanding balances must settle their accounts by November 30 to be cleared for the final exams. Payment is accepted at the Cashier's Office and through the online payment channels listed on the Finance page."
    },
    {
      id: "a3", category: "Event", important: false, daysAgo: 2,
      title: "CS Week hackathon: registration open",
      body: "Teams of 3 to 4 students can register for the 24-hour hackathon on December 6. This year's theme is sustainable campus tech. Prizes include internship interviews with partner companies. Sign up with the CS Society officers."
    },
    {
      id: "a4", category: "Campus", important: false, daysAgo: 4,
      title: "Library extended hours during exam season",
      body: "The main library will stay open until 11:00 PM from December 1 to 19. Quiet study rooms can be reserved at the front desk for up to three hours at a time."
    },
    {
      id: "a5", category: "Academic", important: false, daysAgo: 6,
      title: "Course advising for next semester",
      body: "Advising slots for the 2nd semester open on December 2. Meet your adviser to review your study plan and confirm prerequisites before enlistment begins."
    },
    {
      id: "a6", category: "Event", important: false, daysAgo: 9,
      title: "Career fair: meet 40+ employers",
      body: "The annual career fair takes place in the covered court. Bring printed copies of your resume and dress professionally. Workshops on interviews and portfolio reviews run all day."
    },
    {
      id: "a7", category: "Campus", important: false, daysAgo: 12,
      title: "Holiday break schedule",
      body: "Classes are suspended from December 22 to January 4. Administrative offices will operate on a skeleton schedule. Regular classes resume on January 5."
    }
  ]
};
