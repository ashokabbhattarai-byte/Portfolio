import type {
  Certification,
  Education,
  Experience,
  Profile,
  Skill,
} from '@portfolio/types';
/* The committed copy of the CMS content. It is both the seed source for the
   database and the fallback lib/content.ts serves when the API is unreachable,
   so it is typed against the wire contract rather than a local shape. */
export const profile: Profile = {
  name: 'Ashok Bhattarai',
  role: 'Software developer',
  location: 'Lalitpur, Nepal',
  email: 'ashok.ab.bhattaraii@gmail.com',
  github: 'https://github.com/ashokabbhattaraii',
  linkedin: null,
  resume: '/assets/ashok-bhattarai-resume.pdf',
  description:
    'Building SuchanaAI, Nepal’s searchable government notices, so a Lok Sewa ad does not need five tabs. I ship full-stack and AI products that stay fast because QA is part of the build, not an afterthought.',
  languages: 'Nepali (native), English, Hindi',
};
export const experience: Experience[] = [
  {
    id: 'experience-rumsan-associate',
    role: 'Associate Software Engineer',
    company: 'Rumsan',
    dates: 'Jul 2026 to Present',
    detail:
      'Contributing to software engineering, internal applications, and AI projects.',
    position: 0,
  },
  {
    id: 'experience-rumsan-intern',
    role: 'Full Stack Intern',
    company: 'Rumsan',
    dates: 'Oct 2025 to Apr 2026',
    detail:
      'Hands-on full-stack application development within the engineering team.',
    position: 1,
  },
];
export const skills: Skill[] = [
  {
    id: 'skill-web',
    name: 'Web development',
    items: 'JavaScript, React.js, Next.js, HTML, CSS, Tailwind CSS',
    position: 0,
  },
  {
    id: 'skill-programming',
    name: 'Programming & data',
    items: 'C, MySQL',
    position: 1,
  },
  {
    id: 'skill-quality',
    name: 'Quality & tools',
    items:
      'Quality assurance, Scandium, Visual Studio Code, Cisco Packet Tracer',
    position: 2,
  },
  {
    id: 'skill-focus',
    name: 'Areas of focus',
    items: 'Full-stack applications, responsive web design, AI projects',
    position: 3,
  },
];
export const education: Education[] = [
  {
    id: 'education-lbef',
    school: 'Lord Buddha Education Foundation',
    award: 'Bachelor of Computer Science',
    dates: 'Jul 2026',
    notes: [],
    position: 0,
  },
  {
    id: 'education-ccrc',
    school: 'Capital College and Research Center',
    award: 'Higher Secondary Education (+2)',
    /* No date is published for this one; the GPA is the only extra detail. */
    dates: '',
    notes: ['GPA 3.6'],
    position: 1,
  },
];
export const certifications: Certification[] = [
  {
    id: 'certification-fcc-responsive',
    title: 'Responsive Web Design',
    issuer: 'freeCodeCamp',
    date: 'Feb 2024',
    url: null,
    position: 0,
  },
  {
    id: 'certification-fcc-algorithms',
    title: 'JavaScript Algorithms and Data Structures',
    issuer: 'freeCodeCamp',
    date: 'Mar 2024',
    url: null,
    position: 1,
  },
  {
    id: 'certification-udemy-testing',
    title: 'Introduction to Software Structures Testing',
    issuer: 'Udemy',
    date: 'Mar 2024',
    url: null,
    position: 2,
  },
];
