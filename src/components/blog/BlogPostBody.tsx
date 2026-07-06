type Props = {
  html?: string;
  paragraphs: string[];
};

export function BlogPostBody({ html, paragraphs }: Props) {
  if (html?.trim()) {
    return (
      <div
        className="blog-content prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-gray-text prose-p:leading-relaxed prose-a:text-primary prose-a:underline prose-strong:text-foreground prose-blockquote:border-primary prose-blockquote:text-gray-text prose-img:rounded-xl prose-pre:rounded-xl prose-pre:bg-dark prose-pre:text-white prose-code:before:content-none prose-code:after:content-none prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-gray/60 prose-th:bg-gray-light prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray/60 prose-td:px-3 prose-td:py-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-6 leading-relaxed text-gray-text">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
