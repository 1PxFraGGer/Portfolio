import { Suspense } from "react";
import Link from "next/link";
import SkillPageMotion from "@/components/experience/SkillTransition";
import { notFound } from "next/navigation";
import { skills, skillSlugs, type SkillSlug } from "@/data/skills";

export function generateStaticParams() {
  return skillSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in skills)) return { title: "Skill Not Found" };
  const skill = skills[slug as SkillSlug];
  return { title: `${skill.title} | Beyond The Code`, description: skill.description };
}

async function SkillPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in skills)) notFound();
  const skill = skills[slug as SkillSlug];
  const projects = skill.projects;
  return (
    <main className="skill-world" style={{ "--skill-accent": skill.accent } as React.CSSProperties}>
      <div className="skill-atmosphere" aria-hidden="true"><div className="skill-orb"/><div className="skill-orbit skill-orbit--a"/><div className="skill-orbit skill-orbit--b"/></div>
      <header className="skill-topbar"><SkillPageMotion skill={slug as SkillSlug} /><span>DIMENSION {skill.number} / 04</span></header>
      <section className="skill-introduction">
        <p className="skill-overline">BEYOND THE CODE // SKILL WORLD</p>
        <h1>{skill.subtitle}<small>{skill.title}</small></h1>
        <p className="skill-description">{skill.description}</p>
        <div className="skill-scroll-cue">SCROLL TO EXPLORE ↓</div>
      </section>
      <section className="skill-content"><p className="skill-section-label">01 / TECHNOLOGIES</p><h2>Tools of the trade.</h2><div className="skill-tags">{skill.technologies.map(t => <span key={t}>{t}</span>)}</div></section>
      <section className="skill-content skill-projects"><p className="skill-section-label">02 / FEATURED WORK</p><h2>Selected projects.</h2>
        {projects.length ? <div className="skill-project-grid">{projects.map((p, i) => <article className="skill-project" key={p.name}><span>PROJECT {String(i+1).padStart(2,"0")}</span><h3>{p.name}</h3><p>{p.description}</p><div className="skill-tags">{p.technologies.map(t=><span key={t}>{t}</span>)}</div><div className="skill-links">{p.demo && <a href={p.demo} target="_blank" rel="noopener noreferrer">LIVE DEMO ↗</a>}{p.github && <a href={p.github} target="_blank" rel="noopener noreferrer">GITHUB ↗</a>}</div></article>)}</div> : <p className="skill-project-empty">Project details will appear here once added to <code>src/data/skills.ts</code>. No project names or links have been invented.</p>}
      </section>
      <footer className="skill-footer"><Link href="/">← BACK TO LANDING</Link><span>BEYOND THE CODE / 2026</span></footer>
    </main>
  );
}


export default function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<main className="skill-world" aria-busy="true"><p className="skill-overline">INITIALIZING DIMENSION...</p></main>}>
      <SkillPageContent params={params} />
    </Suspense>
  );
}
