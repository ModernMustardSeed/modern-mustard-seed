export type Project = {
  title: string;
  subtitle: string;
  tags: string[];
  href: string;
  color: string;
  caseStudySlug?: string;
};

export const projects: Project[] = [
  {
    title: 'Make Me Studio',
    subtitle: 'AI creative studio for video, image, and asset generation',
    tags: ['Next.js', 'Gemini', 'Stripe'],
    href: 'https://source-zip.vercel.app',
    color: 'from-amber-900/40 to-amber-800/20',
    caseStudySlug: 'make-me-studio',
  },
  {
    title: 'Cross + Covenant',
    subtitle: 'Headless e-commerce with WebGL particles and print-on-demand',
    tags: ['Shopify', 'WebGL', 'Printify'],
    href: 'https://crossandcovenant.co',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    title: 'Olive Shoot',
    subtitle: 'Agentic OS for solopreneurs. tRPC, real-time, AI-native',
    tags: ['Next.js 16', 'tRPC', 'Zustand'],
    href: 'https://olive-shoot.vercel.app',
    color: 'from-blue-900/40 to-blue-800/20',
    caseStudySlug: 'olive-shoot',
  },
  {
    title: 'Ignition',
    subtitle: 'Multi-agent idea-to-income swarm. Coordinated AI collaboration',
    tags: ['Multi-Agent', 'Claude', 'Gemini'],
    href: 'https://ignition-sarah-7990s-projects.vercel.app',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    title: 'Alive Notes',
    subtitle: 'An OS for human intention. Mobile-first, beautifully crafted',
    tags: ['Expo', 'React Native', 'Zustand'],
    href: 'https://alive-notes-landing.vercel.app',
    color: 'from-indigo-900/40 to-indigo-800/20',
  },
  {
    title: 'Kingdom Lab',
    subtitle: 'AI experimentation playground. Prototypes and showcases',
    tags: ['Next.js', 'AI APIs', 'Vercel'],
    href: 'https://kingdom-lab.vercel.app',
    color: 'from-amber-900/40 to-amber-800/20',
  },
  {
    title: 'Luxe Design',
    subtitle: 'AI interior design and virtual staging for real estate pros',
    tags: ['Replicate', 'Stripe', 'Supabase'],
    href: 'https://luxedesign-five.vercel.app',
    color: 'from-rose-900/40 to-rose-800/20',
  },
  {
    title: 'AdForge Studio',
    subtitle: 'AI-powered ad creative generation and campaign design',
    tags: ['AI', 'Creative', 'Studio'],
    href: 'https://adforge-studio.vercel.app',
    color: 'from-emerald-900/40 to-emerald-800/20',
  },
  {
    title: 'The Claw Concierge',
    subtitle: 'Premium setup service. Three tiers from $697 to $15K+',
    tags: ['Brand', 'Service', 'Community'],
    href: 'https://theclawconcierge.com',
    color: 'from-amber-900/40 to-amber-800/20',
  },
  {
    title: 'Upskill Academy',
    subtitle: 'AI workforce development. 25 courses, WIOA-eligible',
    tags: ['React', 'Zustand', 'Education'],
    href: 'https://modern-mustard-seed-academy.vercel.app',
    color: 'from-indigo-900/40 to-indigo-800/20',
  },
  {
    title: 'What Next',
    subtitle: 'AI decision intelligence. Scenario modeling and outcome prediction',
    tags: ['AI', 'Supabase', 'TypeScript'],
    href: 'https://what-next-ruddy.vercel.app',
    color: 'from-rose-900/40 to-rose-800/20',
  },
  {
    title: 'Wild Things',
    subtitle: 'Personal portfolio. VHS aesthetic, scroll-driven storytelling',
    tags: ['Next.js', 'Framer Motion', 'WebGL'],
    href: 'https://wild-things-nine.vercel.app',
    color: 'from-amber-900/40 to-amber-800/20',
  },
];

export const stats = [
  { value: '40+', label: 'Products Shipped' },
  { value: '2-6 Wks', label: 'Idea to Launch' },
  { value: 'AI-First', label: 'Every Product' },
  { value: 'Full Stack', label: 'Concept to Launch' },
];
