import { z } from "zod";

export const startProjectSchema = z.object({
    projectId: z.string(),
});