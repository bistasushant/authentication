import { z } from "zod";

export const paginationValidation = z.object({
  search: z.string().max(255).optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().max(100).min(1).optional().default(20),
});

export type PaginationInput = z.infer<typeof paginationValidation>;
