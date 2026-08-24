import { ensureBlogHtmlImageAlts } from "@/lib/blog-content";

type Props = {
  html?: string;
  paragraphs: string[];
  imageAltFallback?: string;
};

const proseClass =
  "blog-content prose prose-lg max-w-none " +
  "prose-headings:scroll-mt-28 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground " +
  "prose-h2:mt-14 prose-h2:mb-5 prose-h2:border-l-2 prose-h2:border-primary prose-h2:pl-4 prose-h2:text-2xl " +
  "prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-xl " +
  "prose-p:text-[1.0625rem] prose-p:leading-[1.8] prose-p:text-gray-text " +
  "prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 prose-a:underline-offset-4 hover:prose-a:decoration-primary " +
  "prose-strong:font-semibold prose-strong:text-foreground " +
  "prose-blockquote:my-10 prose-blockquote:border-l-primary prose-blockquote:bg-gray-light/80 prose-blockquote:py-4 prose-blockquote:pr-4 prose-blockquote:text-lg prose-blockquote:italic prose-blockquote:text-gray-text " +
  "prose-ul:my-6 prose-ol:my-6 prose-li:my-1.5 prose-li:marker:text-primary " +
  "prose-img:my-10 prose-img:rounded-none prose-img:shadow-none " +
  "prose-hr:my-12 prose-hr:border-gray/60 " +
  "prose-pre:rounded-xl prose-pre:bg-dark prose-pre:text-white " +
  "prose-code:before:content-none prose-code:after:content-none " +
  "prose-table:w-full prose-table:border-collapse " +
  "prose-th:border prose-th:border-gray/60 prose-th:bg-gray-light prose-th:px-3 prose-th:py-2 " +
  "prose-td:border prose-td:border-gray/60 prose-td:px-3 prose-td:py-2";

export function BlogPostBody({ html, paragraphs, imageAltFallback }: Props) {
  if (html?.trim()) {
    const safeHtml = imageAltFallback
      ? ensureBlogHtmlImageAlts(html, imageAltFallback)
      : html;
    return (
      <div
        className={proseClass}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  return (
    <div className={proseClass}>
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}
