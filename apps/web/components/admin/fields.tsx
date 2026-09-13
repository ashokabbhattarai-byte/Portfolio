'use client';
/**
 * Form primitives for the CMS. Every control is a real labelled input with its
 * hint and error wired through `aria-describedby`, because the whole point of
 * this screen is data entry and a mislabelled field is a data bug.
 */
import { useEffect, useRef, useState } from 'react';

type Common = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  span?: boolean;
};

function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(
    Boolean,
  );
  return ids.length ? ids.join(' ') : undefined;
}

function Shell({
  id,
  label,
  error,
  hint,
  required,
  span,
  children,
}: Common & { children: React.ReactNode }) {
  return (
    <div className={`adm-field${span ? ' span-all' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <span className="adm-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="adm-err" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

type TextProps = Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'password' | 'datetime-local';
  autoComplete?: string;
  maxLength?: number;
};

export function TextField({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  autoComplete,
  maxLength,
  ...common
}: TextProps) {
  return (
    <Shell {...common}>
      <input
        id={common.id}
        name={common.id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        disabled={common.disabled}
        required={common.required}
        aria-invalid={common.error ? true : undefined}
        aria-describedby={describedBy(common.id, common.hint, common.error)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </Shell>
  );
}

export function TextAreaField({
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
  ...common
}: Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Shell {...common}>
      <textarea
        id={common.id}
        name={common.id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={common.disabled}
        required={common.required}
        aria-invalid={common.error ? true : undefined}
        aria-describedby={describedBy(common.id, common.hint, common.error)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </Shell>
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ...common
}: Common & {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <Shell {...common}>
      <select
        id={common.id}
        name={common.id}
        value={value}
        disabled={common.disabled}
        aria-invalid={common.error ? true : undefined}
        aria-describedby={describedBy(common.id, common.hint, common.error)}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function NumberField({
  value,
  onChange,
  onBlur,
  min = 0,
  ...common
}: Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: number;
}) {
  return (
    <Shell {...common}>
      <input
        id={common.id}
        name={common.id}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={value}
        disabled={common.disabled}
        aria-invalid={common.error ? true : undefined}
        aria-describedby={describedBy(common.id, common.hint, common.error)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </Shell>
  );
}

export function SwitchField({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="adm-switch">
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div>
        <label htmlFor={id}>{label}</label>
        {hint ? (
          <span className="adm-hint" id={`${id}-hint`}>
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** `color` and `ink` are painted straight onto the project artwork, so the
 *  field shows the swatch it is about to produce rather than a bare string. */
export function ColorField({
  value,
  onChange,
  onBlur,
  ...common
}: Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const valid = HEX.test(value);
  return (
    <Shell {...common}>
      <div className="adm-colour">
        <input
          type="color"
          value={valid ? value : '#000000'}
          disabled={common.disabled}
          aria-label={`${common.label} colour picker`}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={common.id}
          name={common.id}
          type="text"
          value={value}
          spellCheck={false}
          placeholder="#f4f3ee"
          disabled={common.disabled}
          required={common.required}
          aria-invalid={common.error ? true : undefined}
          aria-describedby={describedBy(common.id, common.hint, common.error)}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      </div>
    </Shell>
  );
}

/**
 * Repeatable single-line inputs. Rows can be reordered and removed from the
 * keyboard, and adding one moves focus into it so the list can be typed
 * straight through.
 */
export function ListField({
  values,
  onChange,
  itemLabel,
  placeholder,
  addLabel,
  ...common
}: Common & {
  values: string[];
  onChange: (values: string[]) => void;
  itemLabel: string;
  placeholder?: string;
  addLabel?: string;
}) {
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const rows = useRef(new Map<number, HTMLInputElement>());

  useEffect(() => {
    if (focusRow === null) return;
    rows.current.get(focusRow)?.focus();
    setFocusRow(null);
  }, [focusRow]);

  const replace = (index: number, value: string) =>
    onChange(
      values.map((item, position) => (position === index ? value : item)),
    );

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setFocusRow(target);
  };

  const remove = (index: number) => {
    onChange(values.filter((_, position) => position !== index));
    setFocusRow(Math.max(0, index - 1));
  };

  return (
    <div className={`adm-field${common.span ? ' span-all' : ''}`}>
      <label id={`${common.id}-label`} htmlFor={`${common.id}-0`}>
        {common.label}
        {common.required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div
        className="adm-list"
        role="group"
        aria-labelledby={`${common.id}-label`}
        aria-describedby={describedBy(common.id, common.hint, common.error)}
      >
        {values.length === 0 ? (
          <p className="adm-list-empty">
            No {itemLabel.toLowerCase()} entries yet.
          </p>
        ) : null}
        {values.map((value, index) => (
          <div className="adm-list-row" key={index}>
            <span className="n" aria-hidden="true">
              {index + 1}
            </span>
            <input
              id={`${common.id}-${index}`}
              type="text"
              value={value}
              placeholder={placeholder}
              disabled={common.disabled}
              aria-label={`${itemLabel} ${index + 1}`}
              aria-invalid={common.error && !value.trim() ? true : undefined}
              onChange={(event) => replace(index, event.target.value)}
              ref={(node) => {
                if (node) rows.current.set(index, node);
                else rows.current.delete(index);
              }}
            />
            <span className="adm-row-actions">
              <button
                type="button"
                className="adm-move"
                onClick={() => move(index, -1)}
                disabled={common.disabled || index === 0}
                aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="adm-move"
                onClick={() => move(index, 1)}
                disabled={common.disabled || index === values.length - 1}
                aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
              >
                ↓
              </button>
              <button
                type="button"
                className="adm-btn ghost tiny"
                onClick={() => remove(index)}
                disabled={common.disabled}
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              >
                Remove
              </button>
            </span>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="adm-btn tiny"
            disabled={common.disabled}
            onClick={() => {
              onChange([...values, '']);
              setFocusRow(values.length);
            }}
          >
            {addLabel ?? `Add ${itemLabel.toLowerCase()}`}
          </button>
        </div>
      </div>
      {common.hint ? (
        <span className="adm-hint" id={`${common.id}-hint`}>
          {common.hint}
        </span>
      ) : null}
      {common.error ? (
        <span className="adm-err" id={`${common.id}-error`} role="alert">
          {common.error}
        </span>
      ) : null}
    </div>
  );
}
