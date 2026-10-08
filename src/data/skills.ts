export const skills = {
  frontend: {
    number: "01", title: "Frontend Development", subtitle: "THE ARCHITECT", accent: "#00c8ff",
    description: "Interfaces with character. Accessible, responsive experiences with deliberate interaction and motion.",
    technologies: ["React", "Next.js", "JavaScript", "HTML", "CSS", "GSAP", "Tailwind CSS"],
    projects: [] as { name: string; description: string; technologies: string[]; demo?: string; github?: string }[],
  },
  backend: {
    number: "02", title: "Backend Development", subtitle: "THE ENGINE", accent: "#ffb547",
    description: "Reliable server-side applications with organized logic, routing and data persistence.",
    technologies: ["Node.js", "Express", "MySQL", "JavaScript", "REST APIs"],
    projects: [] as { name: string; description: string; technologies: string[]; demo?: string; github?: string }[],
  },
  seo: {
    number: "03", title: "Technical SEO", subtitle: "THE DISCOVERY", accent: "#34d399",
    description: "Technical search optimization focused on site structure, metadata, discoverability and schema markup.",
    technologies: ["JSON-LD", "Schema.org", "Canonical URLs", "Meta Tags", "Technical Audits"],
    projects: [] as { name: string; description: string; technologies: string[]; demo?: string; github?: string }[],
  },
  content: {
    number: "04", title: "Content Writing", subtitle: "THE STORYTELLER", accent: "#8b5cf6",
    description: "Research-driven writing that makes complex information clearer, more useful and more discoverable.",
    technologies: ["SEO Articles", "Blog Writing", "Research", "Content Strategy", "Editorial QA"],
    projects: [] as { name: string; description: string; technologies: string[]; demo?: string; github?: string }[],
  },
} as const;
export type SkillSlug = keyof typeof skills;
export const skillSlugs = Object.keys(skills) as SkillSlug[];
