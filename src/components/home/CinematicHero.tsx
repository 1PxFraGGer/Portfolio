"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import { useDimensionTravel } from "@/components/experience/DimensionTravelProvider";

import gsap from "gsap";


import { useGSAP } from "@gsap/react";

import {

  ArrowLeft,

  ArrowRight,



  SkipForward,

} from "lucide-react";

import type {

  ArtifactKey,

  SceneStage,

} from "@/components/experience/PortalCanvas";


gsap.registerPlugin(useGSAP);

const PortalCanvas = dynamic(

  () => import("@/components/experience/PortalCanvas"),

  {

    ssr: false,

    loading: () => <div className="movie-canvas-loading" />,

  }

);

const artifactOrder: ArtifactKey[] = ["frontend", "backend", "seo", "content"];
const artifactContent: Record<ArtifactKey, { eyebrow: string; title: string; description: string; bullets: string[]; accent: string }> = {
  frontend: { eyebrow: "DIMENSION 01 / FRONTEND", title: "The Architect", description: "I craft responsive, interactive interfaces with reusable components and cinematic motion.", bullets: ["React, Next.js, JavaScript", "HTML, CSS, UI architecture", "Projects, live demos and source code"], accent: "#00C8FF" },
  backend: { eyebrow: "DIMENSION 02 / BACKEND", title: "The Engine", description: "I build server-side systems, APIs and persistent data layers that power applications.", bullets: ["Node.js and Express", "MySQL and authentication", "Server-side projects and architecture"], accent: "#FFB547" },
  seo: { eyebrow: "DIMENSION 03 / TECHNICAL SEO", title: "The Discovery", description: "I engineer search-friendly websites with strong technical foundations and structured data.", bullets: ["Structured data and metadata", "Canonical URLs and indexing", "SEO audits and optimization"], accent: "#34D399" },
  content: { eyebrow: "DIMENSION 04 / CONTENT WRITING", title: "The Storyteller", description: "I transform research into helpful, search-focused stories and informative articles.", bullets: ["SEO articles and blogs", "Education research and editorial content", "Published writing and content samples"], accent: "#8B5CF6" },
};

export default function CinematicHero() {

  const container = useRef<HTMLElement>(null);
  const { travel } = useDimensionTravel();
  const [navigating, setNavigating] = useState(false);

  const resumedHub = useRef(false);
  if (typeof window !== "undefined" && sessionStorage.getItem("multiverse:return-to-hub") === "1") {
    resumedHub.current = true;
    sessionStorage.removeItem("multiverse:return-to-hub");
  }

  const [stage, setStage] = useState<SceneStage>("opening");

  const inWorld = stage === "world" || stage === "returning";

  const [ready, setReady] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(false);

  const [jumping, setJumping] = useState(false);

  const [activeArtifact, setActiveArtifact] = useState<ArtifactKey>("frontend");
  const introTimeline = useRef<gsap.core.Timeline | null>(null);

  const transitioningRef = useRef(false);

  const jumpTimeline = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setReducedMotion(media.matches);

    update();

    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);

  }, []);

  useGSAP(

    () => {
      if (resumedHub.current) {
        setStage("world");
        setReady(true);
        gsap.set(".movie-opening-label", { opacity: 0 });
        gsap.set(".movie-hero-copy", { opacity: 0 });
        gsap.set(".movie-letterbox", { height: 0 });
        return;
      }

      const elements = [

        ".movie-title",

        ".movie-description",

        ".movie-actions",

        ".movie-kicker",

      ];

      if (reducedMotion) {

        setStage("charged");

        setReady(true);

        gsap.set(elements, { opacity: 1, y: 0 });

        gsap.set(".movie-opening-label", { opacity: 0 });

        gsap.set(".movie-char", { opacity: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)" });

        gsap.set(".movie-letterbox", { height: "6vh" });

        return;

      }

      gsap.set(elements, { opacity: 0, y: 45 });

      gsap.set(".movie-opening-label", { opacity: 0 });

      gsap.set(".movie-char", { opacity: 0, yPercent: 100, rotateX: -80, filter: "blur(14px)" });

      gsap.set(".movie-letterbox", { height: "14vh" });

      const timeline = gsap.timeline();

      introTimeline.current = timeline;

      timeline

        .to(".movie-opening-label", { opacity: 1, duration: 0.8 }, 0.5)

        .to(".movie-opening-label", { opacity: 0, duration: 0.6 }, 2.6)

        .call(() => setStage("charged"), [], 4.3)

        .to(".movie-kicker", { opacity: 1, y: 0, duration: 0.6 }, 5.0)

        .to(

          ".movie-title",

          {

            opacity: 1,

            y: 0,

            duration: 0.01,

            ease: "power4.out",

          },

          5.3

        )

        .to(".movie-char", { opacity: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)", duration: 1.2, stagger: 0.055, ease: "power4.out" }, 5.3)

        .to(".movie-letterbox", { height: "6vh", duration: 1.6, ease: "power3.inOut" }, 5.0)

        .to(".movie-description", { opacity: 1, y: 0, duration: 0.8 }, 6.1)

        .to(

          ".movie-actions",

          {

            opacity: 1,

            y: 0,

            duration: 0.7,

            onComplete: () => setReady(true),

          },

          6.6

        );

      return () => timeline.kill();

    },

    {

      scope: container,

      dependencies: [reducedMotion],

      revertOnUpdate: true,

    }

  );

  const skipIntro = () => {

    if (transitioningRef.current) return;

    introTimeline.current?.kill();

    setStage("charged");

    setReady(true);

    gsap.set(".movie-opening-label", { opacity: 0 });

    gsap.set(".movie-char", { opacity: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)" });

    gsap.set(".movie-letterbox", { height: "6vh" });

    gsap.set(

      ".movie-kicker, .movie-title, .movie-description, .movie-actions",

      { opacity: 1, y: 0 }

    );

  };

  const enterWorld = () => {

    if (!ready || jumping || transitioningRef.current) return;

    transitioningRef.current = true;

    introTimeline.current?.kill();

    setJumping(true);

    setReady(false);

    setActiveArtifact("frontend");

    setStage("jump");

    jumpTimeline.current?.kill();

    const timeline = gsap.timeline();

    jumpTimeline.current = timeline;

    timeline

      .to(".movie-letterbox", { height: "12vh", duration: reducedMotion ? 0.01 : 0.9, ease: "power3.inOut" }, 0)

      .to(".movie-hero-copy", {

        opacity: 0,

        duration: reducedMotion ? 0 : 0.45,

      })

      .to(

        ".movie-flash",

        {

          opacity: 0.95,

          duration: reducedMotion ? 0.01 : 0.35,

        },

        reducedMotion ? 0 : 1.7

      )

      .call(() => setStage("world"), [], reducedMotion ? 0.02 : 2.05)

      .to(".movie-letterbox", { height: 0, duration: reducedMotion ? 0.01 : 1.4, ease: "power3.inOut" }, reducedMotion ? 0.05 : 2.2)

      .to(".movie-flash", {

        opacity: 0,

        duration: reducedMotion ? 0.01 : 0.85,

        onComplete: () => {

          setJumping(false);

          transitioningRef.current = false;

        },

      });

  };

  const returnToPortal = () => {

    if (jumping || transitioningRef.current || stage !== "world") return;

    transitioningRef.current = true;

    jumpTimeline.current?.kill();

    setJumping(true);

    setReady(false);

    setStage("returning");



    const q = gsap.utils.selector(container);

    const hero = q(".movie-hero-copy");

    const flash = q(".movie-flash");

    const worldOverlay = q(".architect-overlay");

    const titleParts = q(

      ".movie-kicker, .movie-title, .movie-description, .movie-actions"

    );



    const timeline = gsap.timeline({

      onComplete: () => {

        setJumping(false);

        setReady(true);

        transitioningRef.current = false;

      },

    });

    jumpTimeline.current = timeline;



    timeline

      .to(worldOverlay, {

        opacity: 0,

        y: 24,

        duration: reducedMotion ? 0.01 : 0.55,

        ease: "power2.in",

      }, 0)

      .to(flash, {

        opacity: 1,

        duration: reducedMotion ? 0.01 : 0.35,

        ease: "power2.in",

      }, reducedMotion ? 0.02 : 2.15)

      .call(() => {

        // The intro remains mounted throughout the entire journey.

        gsap.set(titleParts, { opacity: 1, y: 0 });

        gsap.set(q(".movie-char"), { opacity: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)" });

        gsap.set(hero, { opacity: 0, scale: 0.94 });

        setStage("charged");

        setActiveArtifact("frontend");

      }, [], reducedMotion ? 0.04 : 2.5)

      .to(flash, {

        opacity: 0,

        duration: reducedMotion ? 0.01 : 0.85,

        ease: "power2.out",

      }, reducedMotion ? 0.05 : 2.52)

      .to(q(".movie-letterbox"), { height: "6vh", duration: reducedMotion ? 0.01 : 1.2, ease: "power3.inOut" }, reducedMotion ? 0.04 : 2.5)

      .to(hero, {

        opacity: 1,

        scale: 1,

        duration: reducedMotion ? 0.01 : 0.9,

        ease: "power3.out",

      }, reducedMotion ? 0.06 : 2.7);

  };

  const openSkill = (skill: ArtifactKey = activeArtifact) => {
    if (jumping || navigating || transitioningRef.current || stage !== "world") return;
    setNavigating(true);
    transitioningRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scope = container.current;
    if (!scope) return;
    const q = gsap.utils.selector(scope);
    travel(skill,"enter");
  };


  const currentArtifact = useMemo(

    () => artifactContent[activeArtifact],

    [activeArtifact]

  );

  useEffect(() => {

    return () => {

      introTimeline.current?.kill();

      jumpTimeline.current?.kill();

    };

  }, []);

  return (

    <section ref={container} className={`movie-hero ${inWorld ? "is-world" : ""}`} id="home">

      <div className="movie-scene">

        <PortalCanvas

          stage={stage}

          reducedMotion={reducedMotion}

          activeArtifact={activeArtifact}

          onArtifactSelect={setActiveArtifact}
          onSkillOpen={openSkill}

        />

      </div>

      <div className="movie-shadows" aria-hidden="true" />


      <div className="movie-flash" aria-hidden="true" />

      <div className="movie-letterbox movie-letterbox--top" aria-hidden="true" />

      <div className="movie-letterbox movie-letterbox--bottom" aria-hidden="true" />

      <>

          <header className="movie-nav" style={{ opacity: inWorld ? 0 : 1, pointerEvents: inWorld ? "none" : "auto" }}>

            <a href="#home" className="movie-brand">

              <span className="movie-brand-mark">B/</span>

              <span>BEYOND THE CODE</span>

            </a>

            <span className="movie-status">

              <span className="movie-status-dot" />

              SYSTEM ONLINE

            </span>

          </header>

          <div className="movie-opening-label">

            <span>INITIALIZING THE MULTIVERSE</span>

            <span className="movie-loading-line" />

            <span>ESTABLISHING CONNECTION...</span>

          </div>

          <div className="movie-hero-copy" style={{ pointerEvents: inWorld ? "none" : "auto" }}>

            <div className="movie-title-wrap">

              <p className="movie-kicker">AN INTERACTIVE DEVELOPER FILM</p>

              <h1 className="movie-title" aria-label="Beyond the code">

                {"BEYOND".split("").map((char, index) => (

                  <i key={`b-${index}`} className="movie-char" aria-hidden="true">{char}</i>

                ))}

                <span>

                  {"THE CODE".split("").map((char, index) => (

                    <i key={`c-${index}`} className="movie-char" aria-hidden="true">{char === " " ? "\u00A0" : char}</i>

                  ))}

                </span>

              </h1>

              <p className="movie-description">

                One developer. Multiple dimensions.

                <br />

                Infinite possibilities.

              </p>

              <div className="movie-actions">

                <button

                  className="movie-enter"

                  onClick={enterWorld}

                  disabled={!ready || jumping}

                >

                  ENTER THE MULTIVERSE

                  <ArrowRight size={20} />

                </button>

              </div>

            </div>

          </div>

          {stage === "opening" && !reducedMotion && (

            <button className="movie-skip" onClick={skipIntro}>

              SKIP INTRO

              <SkipForward size={15} />

            </button>

          )}

          <div className="movie-bottom-hud" style={{ opacity: inWorld ? 0 : 1 }}>

            <div>

              <span>BTCC / EXPERIENCE 001</span>

              <strong>

                {stage === "jump" ? "DIMENSIONAL TRANSIT" : "THE AWAKENING"}

              </strong>

            </div>

            <span className="movie-coordinate">REALITY: INITIALIZING</span>

          </div>

      </>

      {(stage === "world" || stage === "returning") && (

        <div className="architect-overlay">

          <div className="architect-topbar">

            <button

  className="architect-return"

  onClick={returnToPortal}

  disabled={jumping}

>

              <ArrowLeft size={15} />

              RETURN TO PORTAL

            </button>

            <div className="architect-world-tag">

              <span>THE MULTIVERSE / 04</span>

              <strong>SKILL PORTALS</strong>

            </div>

          </div>

                    <div className="architect-helper">

            Choose one of four skill portals. Select it, then enter its world.

          </div>

          <nav className="architect-artifact-nav" aria-label="Four skill portals">

            {artifactOrder.map((item) => (

              <button

                type="button"

                key={item}

                className={activeArtifact === item ? "is-active" : ""}

                aria-pressed={activeArtifact === item}

                onClick={() => setActiveArtifact(item)}

              >

                <span className="architect-artifact-dot" style={{ background: artifactContent[item].accent }} />

                {item === "frontend" ? "FRONTEND" : item === "backend" ? "BACKEND" : item === "seo" ? "TECHNICAL SEO" : "CONTENT WRITING"}

              </button>

            ))}

          </nav>

          <div className="architect-panel">

            <div className="architect-swap" key={activeArtifact}>

            <span

              className="architect-panel__eyebrow"

              style={{ color: currentArtifact.accent }}

            >

              {currentArtifact.eyebrow}

            </span>

            <h2>{currentArtifact.title}</h2>

            <p>{currentArtifact.description}</p>

            <ul className="architect-bullets">

              {currentArtifact.bullets.map((item, index) => (

                <li key={item} style={{ animationDelay: `${0.15 + index * 0.08}s` }}>{item}</li>

              ))}

            </ul>

            </div>

            <div className="architect-note">

              <button className="hub-enter-skill" type="button" onClick={() => openSkill()} disabled={jumping || navigating}>EXPLORE {activeArtifact.toUpperCase()} <ArrowRight size={15} /></button>

            </div>

          </div>

        </div>

      )}

<span className="sr-only" aria-live="polite">

        {stage === "world"

          ? `Multiverse hub loaded. Selected skill: ${currentArtifact.title}.`

          : stage === "jump"

          ? "Travelling through the portal."

          : ""}

      </span>

    </section>

  );

}
