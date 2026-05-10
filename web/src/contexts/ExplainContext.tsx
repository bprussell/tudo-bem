import { createContext, useContext } from "react";
import type { ExplainTopic } from "../lib/explain";

type ExplainContextValue = {
  open: (topic: ExplainTopic) => void;
};

export const ExplainContext = createContext<ExplainContextValue>({
  open: () => {
    /* no-op default */
  },
});

export function useExplain(): ExplainContextValue {
  return useContext(ExplainContext);
}
