import { useEffect } from "react";
import { api } from "~/trpc/react";

export const useRefetchAIMoves = () => {
  const { refetch: checkIfAIMoveIsNeeded } =
    api.game.checkIfAIMoveIsNeeded.useQuery(undefined, {
      refetchInterval: 10000,
    });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "r") {
        void checkIfAIMoveIsNeeded();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [checkIfAIMoveIsNeeded]);
};
