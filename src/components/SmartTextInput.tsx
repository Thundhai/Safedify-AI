import React, { useRef, useCallback, forwardRef, useEffect } from 'react';
import { useAutoComplete, Suggestion } from '../hooks/useAutoComplete';

/* ─────────────────────────────────────────────────────────────
   Shared suggestion dropdown (used by both Input & Textarea)
   ───────────────────────────────────────────────────────────── */

interface SuggestionDropdownProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  show: boolean;
  onSelect: (s: Suggestion) => void;
  position: 'above' | 'below';
}

const SuggestionDropdown: React.FC<SuggestionDropdownProps> = ({
  suggestions,
  selectedIndex,
  show,
  onSelect,
  position,
}) => {
  if (!show || suggestions.length === 0) return null;

  return (
    <div
      className={`absolute left-0 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto ${
        position === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
      }`}
    >
      {suggestions.map((s, i) => (
        <button
          key={`${s.text}-${i}`}
          type="button"
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
            i === selectedIndex
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus on input
            onSelect(s);
          }}
        >
          {s.type === 'correction' ? (
            <>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                fix
              </span>
              <span>{s.text}</span>
            </>
          ) : (
            <>
              <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">▸</span>
              <span>{s.text}</span>
            </>
          )}
        </button>
      ))}
      <div className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 flex gap-3">
        <span><kbd className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-[9px]">Tab</kbd> accept</span>
        <span><kbd className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-[9px]">↑↓</kbd> navigate</span>
        <span><kbd className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-[9px]">Esc</kbd> dismiss</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SmartTextInput – drop-in replacement for <input type="text">
   ───────────────────────────────────────────────────────────── */

interface SmartTextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Set text directly (used internally for auto-correct) */
  onValueChange?: (v: string) => void;
  /** Position suggestions above or below (default: below) */
  suggestPosition?: 'above' | 'below';
}

export const SmartTextInput = forwardRef<HTMLInputElement, SmartTextInputProps>(
  ({ value, onChange, onValueChange, suggestPosition = 'below', className, ...rest }, ref) => {
    const localRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || localRef;

    const {
      suggestions,
      selectedIndex,
      showSuggestions,
      computeSuggestions,
      applySuggestion,
      autoCorrectOnSpace,
      handleKeyDown,
      dismiss,
    } = useAutoComplete();

    const setText = useCallback(
      (v: string) => {
        if (onValueChange) {
          onValueChange(v);
        } else {
          // Synthesize a change event
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )!.set!;
          nativeInputValueSetter.call(inputRef.current, v);
          const event = new Event('input', { bubbles: true });
          inputRef.current?.dispatchEvent(event);
        }
      },
      [onValueChange, inputRef],
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        const cursor = e.target.selectionStart ?? newVal.length;

        // Check for auto-correction (if last char typed is space)
        if (newVal.length > value.length && newVal[cursor - 1] === ' ') {
          const corrected = autoCorrectOnSpace(newVal, cursor);
          if (corrected) {
            if (onValueChange) {
              onValueChange(corrected);
            } else {
              onChange(e); // let the original onChange run first
            }
            // Then apply correction
            requestAnimationFrame(() => setText(corrected));
            computeSuggestions(corrected, cursor);
            return;
          }
        }

        onChange(e);
        computeSuggestions(newVal, cursor);
      },
      [onChange, onValueChange, value, autoCorrectOnSpace, computeSuggestions, setText],
    );

    const handleSelect = useCallback(
      (s: Suggestion) => {
        applySuggestion(s, value, setText, inputRef as React.RefObject<HTMLInputElement>);
      },
      [applySuggestion, value, setText, inputRef],
    );

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const handled = handleKeyDown(e, value, setText, inputRef as React.RefObject<HTMLInputElement>);
        if (!handled && rest.onKeyDown) rest.onKeyDown(e);
      },
      [handleKeyDown, value, setText, inputRef, rest.onKeyDown],
    );

    // Dismiss on blur (after a small delay so click on suggestion registers)
    const onBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setTimeout(dismiss, 150);
        if (rest.onBlur) rest.onBlur(e);
      },
      [dismiss, rest.onBlur],
    );

    return (
      <div className="relative">
        <input
          {...rest}
          ref={inputRef}
          type="text"
          value={value}
          className={className}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          autoComplete="off"
        />
        <SuggestionDropdown
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          show={showSuggestions}
          onSelect={handleSelect}
          position={suggestPosition}
        />
      </div>
    );
  },
);

SmartTextInput.displayName = 'SmartTextInput';

/* ─────────────────────────────────────────────────────────────
   SmartTextArea – drop-in replacement for <textarea>
   ───────────────────────────────────────────────────────────── */

interface SmartTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (v: string) => void;
  suggestPosition?: 'above' | 'below';
}

export const SmartTextArea = forwardRef<HTMLTextAreaElement, SmartTextAreaProps>(
  ({ value, onChange, onValueChange, suggestPosition = 'below', className, ...rest }, ref) => {
    const localRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || localRef;

    const {
      suggestions,
      selectedIndex,
      showSuggestions,
      computeSuggestions,
      applySuggestion,
      autoCorrectOnSpace,
      handleKeyDown,
      dismiss,
    } = useAutoComplete();

    const setText = useCallback(
      (v: string) => {
        if (onValueChange) {
          onValueChange(v);
        } else {
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )!.set!;
          nativeTextAreaValueSetter.call(textareaRef.current, v);
          const event = new Event('input', { bubbles: true });
          textareaRef.current?.dispatchEvent(event);
        }
      },
      [onValueChange, textareaRef],
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        const cursor = e.target.selectionStart ?? newVal.length;

        if (newVal.length > value.length && newVal[cursor - 1] === ' ') {
          const corrected = autoCorrectOnSpace(newVal, cursor);
          if (corrected) {
            if (onValueChange) {
              onValueChange(corrected);
            } else {
              onChange(e);
            }
            requestAnimationFrame(() => setText(corrected));
            computeSuggestions(corrected, cursor);
            return;
          }
        }

        onChange(e);
        computeSuggestions(newVal, cursor);
      },
      [onChange, onValueChange, value, autoCorrectOnSpace, computeSuggestions, setText],
    );

    const handleSelect = useCallback(
      (s: Suggestion) => {
        applySuggestion(s, value, setText, textareaRef as React.RefObject<HTMLTextAreaElement>);
      },
      [applySuggestion, value, setText, textareaRef],
    );

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const handled = handleKeyDown(e, value, setText, textareaRef as React.RefObject<HTMLTextAreaElement>);
        if (!handled && rest.onKeyDown) rest.onKeyDown(e);
      },
      [handleKeyDown, value, setText, textareaRef, rest.onKeyDown],
    );

    const onBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setTimeout(dismiss, 150);
        if (rest.onBlur) rest.onBlur(e);
      },
      [dismiss, rest.onBlur],
    );

    return (
      <div className="relative">
        <textarea
          {...rest}
          ref={textareaRef}
          value={value}
          className={className}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          autoComplete="off"
        />
        <SuggestionDropdown
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          show={showSuggestions}
          onSelect={handleSelect}
          position={suggestPosition}
        />
      </div>
    );
  },
);

SmartTextArea.displayName = 'SmartTextArea';
