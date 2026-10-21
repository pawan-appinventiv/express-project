import { z } from 'zod';

export const createUserDto = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
});
export type CreateUserDto = z.infer<typeof createUserDto>;

export const updateUserDto = createUserDto
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });
export type UpdateUserDto = z.infer<typeof updateUserDto>;

export const userIdParamDto = z.object({
  id: z.coerce.number().int().positive(),
});
export type UserIdParamDto = z.infer<typeof userIdParamDto>;

export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}