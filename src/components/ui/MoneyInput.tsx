import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { parseMoneyInput, formatMoneyInput } from '../../utils/money';

export interface MoneyInputProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  allowEmpty?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder,
  className,
  id,
  ariaLabel,
  allowEmpty = false
}) => {
  const { lang } = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Helper to format a number into display string
  const toDisplayString = (num: number): string => {
    if (num === 0) {
      return allowEmpty ? '' : '0';
    }
    return formatMoneyInput(num, lang);
  };

  const [displayValue, setDisplayValue] = useState<string>(() => toDisplayString(value));
  const caretPosRef = useRef<number | null>(null);

  // Sync display value when value prop changes externally
  useEffect(() => {
    setDisplayValue(toDisplayString(value));
  }, [value, lang, allowEmpty]);

  // Restore caret position after React re-render
  useLayoutEffect(() => {
    if (caretPosRef.current !== null && inputRef.current) {
      const pos = caretPosRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      caretPosRef.current = null;
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const rawCaret = e.target.selectionStart ?? rawVal.length;

    // Count digits before cursor in raw value
    let digitsBeforeCursor = 0;
    for (let i = 0; i < Math.min(rawCaret, rawVal.length); i++) {
      if (/\d/.test(rawVal[i])) {
        digitsBeforeCursor++;
      }
    }

    const numValue = parseMoneyInput(rawVal);
    const newDisplay = toDisplayString(numValue);
    setDisplayValue(newDisplay);

    // Calculate new cursor position in newDisplay where same number of digits precede caret
    let newPos = 0;
    let digitsSeen = 0;
    for (let i = 0; i < newDisplay.length; i++) {
      if (/\d/.test(newDisplay[i])) {
        digitsSeen++;
      }
      if (digitsSeen === digitsBeforeCursor) {
        newPos = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) {
      newPos = 0;
    } else if (digitsSeen < digitsBeforeCursor) {
      newPos = newDisplay.length;
    }

    caretPosRef.current = newPos;
    onChange(numValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleBlur = () => {
    let finalValue = value;
    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }
    if (finalValue !== value) {
      onChange(finalValue);
    }
    setDisplayValue(toDisplayString(finalValue));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      id={id}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
