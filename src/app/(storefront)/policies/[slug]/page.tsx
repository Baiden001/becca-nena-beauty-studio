import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POLICIES, POLICY_CONFIG, POLICY_LINKS } from "@/lib/policies";

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const policy = POLICIES[params.slug];
  return policy
    ? { title: `${policy.title} | ${POLICY_CONFIG.business}` }
    : {};
}

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = POLICIES[params.slug];
  if (!policy) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <p className="eyebrow">Policies</p>
      <h1 className="mt-2 font-serif text-4xl text-brown">{policy.title}</h1>
      <p className="mt-2 text-xs text-taupe">Last updated {POLICY_CONFIG.updated}</p>
      <p className="mt-6 leading-relaxed text-taupe">{policy.intro}</p>

      {policy.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="mt-10 font-serif text-xl text-brown">{section.heading}</h2>
          {section.paragraphs?.map((p, i) => (
            <p key={i} className="mt-3 leading-relaxed text-taupe">
              {p}
            </p>
          ))}
          {section.list && (
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-taupe marker:text-rose">
              {section.list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <nav aria-label="Other policies" className="mt-14 border-t border-rose/20 pt-6 text-sm">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {POLICY_LINKS.filter((l) => l.slug !== policy.slug).map((l) => (
            <li key={l.slug}>
              <Link
                href={`/policies/${l.slug}`}
                className="text-brown underline decoration-rose/60 underline-offset-4 hover:text-rose"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
