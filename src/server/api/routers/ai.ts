import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { AVAILABLE_MODELS } from "~/lib/ai/constants";

export const aiRouter = createTRPCRouter({
  getAvailableModels: publicProcedure.query(async () => {
    return AVAILABLE_MODELS;
  }),
});
