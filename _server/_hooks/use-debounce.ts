import React, { useEffect } from "react";

export default function useDebounce(
  callback: () => void,
  deps: React.DependencyList,
  duration: number = 300,
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      callback();
    }, duration);

    return () => clearTimeout(timer);
  }, [...deps]);
}