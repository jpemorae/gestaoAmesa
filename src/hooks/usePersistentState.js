import { useEffect, useRef, useState } from "react";

function readStoredValue(key, initialValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  } catch {
    return initialValue;
  }
}

export function usePersistentState(key, initialValue) {
  const previousKey = useRef(key);
  const [value, setValue] = useState(() => readStoredValue(key, initialValue));

  useEffect(() => {
    if (previousKey.current !== key) {
      previousKey.current = key;
      setValue(readStoredValue(key, initialValue));
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }, [initialValue, key, value]);

  return [value, setValue];
}
