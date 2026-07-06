type Props = {
  status?: string;
};

export function BlogPreviewBanner({ status }: Props) {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-950"
    >
      Aperçu brouillon
      {status && status !== "published" ? ` · ${status}` : ""} — non visible publiquement
    </div>
  );
}
