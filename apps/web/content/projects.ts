import type { Project } from '@portfolio/types';
/* Seed source for the CMS and the fallback lib/content.ts serves when the API
   is unreachable. `id` is only a placeholder: the database mints cuids and
   matches these rows on `slug`. */
export const projects: Project[] = [
  {
    id: 'project-suchana-ai',
    slug: 'suchana-ai',
    image: '/assets/suchanaai-home.webp',
    gallery: '/assets/suchanaai-notices.webp',
    features: [
      'A unified feed of notices from official government portals.',
      'Search and filters for notice categories, organizations, and topics.',
      'AI classification, summaries, and document search.',
      'English and Nepali interfaces with configurable notice alerts.',
    ],
    title: 'SuchanaAI',
    category: 'AI',
    role: 'Independent developer',
    context: 'Independent project',
    color: '#dae5dc',
    ink: '#25493e',
    symbol: 'सू',
    live: 'https://suchanaai.tech',
    summary: 'Public notices with a more intelligent starting point.',
    overview:
      'An AI-powered public notice platform for Nepal, completed and launched as an independent project.',
    challenge:
      'Government notices are scattered across different portals. SuchanaAI brings them into one searchable place for people following jobs, exams, tenders and policy updates.',
    contribution:
      'Built and launched SuchanaAI independently, taking it from development to a publicly accessible platform.',
    outcome: 'Completed and launched at suchanaai.tech.',
    focus: [
      'Public notices',
      'Artificial intelligence',
      'Independent development',
    ],
    published: true,
    featured: true,
    position: 0,
  },
  {
    id: 'project-workops',
    slug: 'workops',
    title: 'WorkOps',
    category: 'Full stack',
    role: 'Full-stack development',
    context: 'Rumsan · Internal application',
    color: '#e8dacf',
    ink: '#643d29',
    symbol: 'W',
    live: 'https://workops.rumsan.net',
    summary: 'Less admin work. More focused delivery.',
    overview:
      'An internal utility management system built for Rumsan to support day-to-day office operations.',
    challenge:
      'Internal teams need software designed around everyday utility management. WorkOps addresses this practical operational need.',
    contribution:
      'Built an internal utility management system for Rumsan, applying full-stack development to an internal application.',
    outcome:
      'A dedicated system supporting internal office operations at Rumsan. Access may require an organization account.',
    focus: [
      'Office operations',
      'Utility management',
      'Full-stack development',
    ],
    features: [],
    published: true,
    featured: true,
    position: 1,
  },
  {
    id: 'project-chatty',
    slug: 'chatty',
    title: 'Chatty',
    category: 'AI',
    role: 'Development contributor',
    context: 'Rumsan · Team project',
    color: '#dfe6d8',
    ink: '#2f4a2b',
    symbol: '“',
    summary: 'Exploring applied AI through teamwork.',
    overview: 'An AI project at Rumsan, developed as part of the project team.',
    challenge:
      'AI products require collaborative engineering. Chatty reflects my experience contributing to AI projects within a team.',
    contribution:
      'Contributed to development as a member of the Rumsan project team.',
    outcome:
      'Contributed to the team’s AI development work. Internal product details are not published.',
    focus: [
      'Artificial intelligence',
      'Team development',
      'Software engineering',
    ],
    features: [],
    published: true,
    featured: true,
    position: 2,
  },
  {
    id: 'project-certfy',
    slug: 'certfy',
    title: 'Certfy',
    category: 'Blockchain',
    role: 'Development contributor',
    context: 'Collaborative project',
    color: '#e7e5bf',
    ink: '#545821',
    symbol: '✓',
    summary: 'A clearer way to verify authenticity.',
    overview:
      'A blockchain-based project for verifying certificate authenticity.',
    challenge:
      'Certificate verification is a question of trust. Certfy applies blockchain to this verification problem.',
    contribution:
      'Contributed to the development of a blockchain-based certificate verification project.',
    outcome:
      'Development contributions to certificate verification. No public deployment or performance results are claimed.',
    focus: ['Blockchain', 'Certificate authenticity', 'Verification'],
    features: [],
    published: true,
    featured: false,
    position: 3,
  },
];
