"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DEFAULT_ABOUT_CONTENT, ABOUT_CONTENT_KEY, type AboutContent } from "@/lib/about-content";

interface AboutContentClientProps {
  variant?: "page" | "home";
}

export function AboutContentClient({ variant = "page" }: AboutContentClientProps) {
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);

  useEffect(() => {
    const refresh = () => {
      const stored = window.localStorage.getItem(ABOUT_CONTENT_KEY);
      setContent(stored ? (JSON.parse(stored) as AboutContent) : DEFAULT_ABOUT_CONTENT);
    };
    refresh();
    window.addEventListener("giant:about-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("giant:about-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (variant === "home") {
    return (
      <section className="section about-home">
        <div className="section-head">
          <div>
            <span className="eyebrow">GIANT-SEIMC</span>
            <h2>Quiénes somos</h2>
          </div>
          <Link className="button secondary" href="/quienes-somos">
            Quiénes somos
          </Link>
        </div>
        <div className="about-split">
          <div className="stack">
            <p className="lead">{content.intro}</p>
            <p className="muted">{content.creator}</p>
          </div>
          <PeoplePreview people={content.people} />
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="about-hero">
        <div className="stack">
          <span className="eyebrow">GIANT-SEIMC</span>
          <h1>{content.title}</h1>
          <p className="lead">{content.intro}</p>
        </div>
        <div className="about-mark">
          <Image src="/giant-logo.png" alt="" width={190} height={104} />
        </div>
      </section>

      <section className="grid two">
        <div className="table-panel stack">
          <h2>Qué es GIANT</h2>
          <p className="muted">{content.intro}</p>
        </div>
        <div className="table-panel stack">
          <h2>Quiénes lo componen</h2>
          <p className="muted">{content.composition}</p>
        </div>
      </section>

      <section className="table-panel stack">
        <h2>Creador</h2>
        <p className="muted">{content.creator}</p>
      </section>

      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Personas</h2>
          <span className="badge">{content.people.length}</span>
        </div>
        <div className="grid three">
          {content.people.map((person) => (
            <article className="person-card" key={person.id}>
              {person.photoUrl ? (
                <img className="person-photo" src={person.photoUrl} alt={person.name} />
              ) : (
                <div className="person-photo placeholder">{person.name.slice(0, 1)}</div>
              )}
              <strong>{person.name}</strong>
              <span className="muted">{person.role}</span>
              <p className="muted">{person.bio}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PeoplePreview({ people }: { people: AboutContent["people"] }) {
  return (
    <div className="people-preview">
      {people.slice(0, 3).map((person) => (
        <div className="person-chip-card" key={person.id}>
          {person.photoUrl ? (
            <img src={person.photoUrl} alt="" />
          ) : (
            <span>{person.name.slice(0, 1)}</span>
          )}
          <div>
            <strong>{person.name}</strong>
            <small>{person.role}</small>
          </div>
        </div>
      ))}
    </div>
  );
}
