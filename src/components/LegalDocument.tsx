import Link from "next/link";

export function LegalDocument({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);

  return (
    <article className="legal-document">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("# ")) {
          return <h1 key={index}>{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={index}>{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={index}>{trimmed.slice(4)}</h3>;
        }
        if (/^[a-z]\.\s/i.test(trimmed)) {
          return (
            <p className="legal-item" key={index}>
              {renderInlineLinks(trimmed)}
            </p>
          );
        }

        return <p key={index}>{renderInlineLinks(trimmed)}</p>;
      })}
    </article>
  );
}

function renderInlineLinks(text: string) {
  const match = text.match(/^(.*)\[([^\]]+)\]\(([^)]+)\)(.*)$/);
  if (!match) return text;

  return (
    <>
      {match[1]}
      <Link href={match[3]}>{match[2]}</Link>
      {match[4]}
    </>
  );
}
