"use client";

import { Plus, Trash2, type LucideIcon } from "lucide-react";
import { LUCIDE_ICON_NAMES, type LucideIconName } from "@/lib/lucide-icon-map";
import { cn } from "@/lib/utils";

export const crmFieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-gray-text/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type FieldProps = {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

export function CrmFormField({ label, hint, htmlFor, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs leading-relaxed text-gray-text">{hint}</p>}
      {children}
    </div>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function CrmFormSection({ title, description, children, className }: SectionProps) {
  return (
    <section className={cn("rounded-2xl border border-gray/40 bg-white p-6 shadow-sm", className)}>
      <div className="mb-5 border-b border-gray/30 pb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-text">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

type HeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function CrmFormHeader({ icon: Icon, title, description, actions }: HeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Icon className="h-6 w-6 text-primary" aria-hidden />
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-text">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function CrmFormStatus({ message }: { message: string }) {
  if (!message) return null;
  const isError = message.includes("Impossible") || message.includes("erreur");
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {message}
    </div>
  );
}

type ActionsProps = {
  saving: boolean;
  label?: string;
  formId?: string;
};

export function CrmFormActions({ saving, label = "Enregistrer", formId }: ActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-8 border-t border-gray/40 bg-[#f8fafc]/95 px-1 py-4 backdrop-blur-sm">
      <button
        type="submit"
        form={formId}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
      >
        {saving && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
        )}
        {label}
      </button>
    </div>
  );
}

type LineListProps = {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  minItems?: number;
};

export function CrmLineListEditor({
  label,
  hint,
  values,
  onChange,
  placeholder = "Nouvel élément…",
  addLabel = "Ajouter une ligne",
  minItems = 0,
}: LineListProps) {
  function update(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  function remove(index: number) {
    if (values.length <= minItems) return;
    onChange(values.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...values, ""]);
  }

  return (
    <CrmFormField label={label} hint={hint}>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={value}
              onChange={(e) => update(index, e.target.value)}
              className={crmFieldClass}
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={values.length <= minItems}
              className="shrink-0 rounded-xl border border-gray/60 p-2.5 text-gray-text hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              aria-label="Supprimer la ligne"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray/60 px-3 py-2 text-sm font-medium text-gray-text hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
        </button>
      </div>
    </CrmFormField>
  );
}

type IconSelectProps = {
  label?: string;
  value: LucideIconName | string;
  onChange: (value: LucideIconName) => void;
};

export function CrmIconSelect({ label = "Icône", value, onChange }: IconSelectProps) {
  return (
    <CrmFormField label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LucideIconName)}
        className={crmFieldClass}
      >
        {LUCIDE_ICON_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </CrmFormField>
  );
}

type HeroPreviewProps = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  titleAfter?: string;
  description?: string;
};

export function CrmHeroPreview({ eyebrow, title, highlight, titleAfter, description }: HeroPreviewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray/40 bg-dark text-white shadow-sm">
      <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white/50">
        Aperçu
      </div>
      <div className="space-y-3 p-5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">{eyebrow}</p>
        )}
        <p className="text-lg font-bold leading-snug">
          {title}
          {highlight && (
            <>
              {" "}
              <span className="text-primary-light">{highlight}</span>
            </>
          )}
          {titleAfter}
        </p>
        {description && <p className="text-sm leading-relaxed text-white/70">{description}</p>}
      </div>
    </div>
  );
}

type ItemCardProps = {
  title: string;
  index: number;
  onRemove?: () => void;
  children: React.ReactNode;
};

export function CrmRepeaterCard({ title, index, onRemove, children }: ItemCardProps) {
  return (
    <div className="rounded-xl border border-gray/30 bg-gray-light/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          {title} {index + 1}
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-gray-text hover:bg-red-50 hover:text-red-600"
            aria-label={`Supprimer ${title} ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

type PageHeroNavProps<T extends string> = {
  groups: { label: string; keys: T[] }[];
  labels: Record<T, string>;
  activeKey: T;
  onSelect: (key: T) => void;
};

export function CrmGroupedTabs<T extends string>({ groups, labels, activeKey, onSelect }: PageHeroNavProps<T>) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeKey === key ? "bg-primary text-white shadow-sm" : "bg-gray-light text-gray-text hover:bg-gray/20",
                )}
              >
                {labels[key]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type TabItem<T extends string> = { id: T; label: string };

export function CrmSectionTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray/30 pb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            active === tab.id ? "bg-primary text-white" : "text-gray-text hover:bg-gray-light",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function CrmSecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-gray-light disabled:opacity-60"
    >
      {children}
    </button>
  );
}
