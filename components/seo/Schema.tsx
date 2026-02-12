export default function Schema({ data }: { data: Record<string, unknown> }) {
  const safeJson = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJson,
      }}
    />
  );
}
