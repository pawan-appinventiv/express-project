import { z } from 'zod';
import {
  className,
  classNameQuery,
  dateOfBirth,
  guardianRelation,
  pagination,
  personName,
  phone,
  rollNo,
  section,
  safeText,
} from '../../utils/validators';

export const guardianDto = z.strictObject({
  name: personName,
  phone,
  relation: guardianRelation,
});

export const createStudentDto = z.strictObject({
  rollNo,
  firstName: personName,
  lastName: personName,
  dateOfBirth,
  className,
  section,
  guardian: guardianDto,
});
export type CreateStudentDto = z.infer<typeof createStudentDto>;

export const updateStudentDto = z
  .strictObject({
    rollNo: rollNo.optional(),
    firstName: personName.optional(),
    lastName: personName.optional(),
    dateOfBirth: dateOfBirth.optional(),
    className: className.optional(),
    section: section.optional(),
    guardian: guardianDto.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;

const emptyToUndefined = (value: unknown): unknown => (value === undefined || value === '' ? undefined : value);

export const listStudentsQueryDto = pagination.extend({
  className: z.preprocess(emptyToUndefined, classNameQuery.optional()),
  section: z.preprocess(emptyToUndefined, section.optional()),
  search: z.preprocess(emptyToUndefined, safeText(100).optional()),
});

export interface ListStudentsQueryDto {
  limit: number;
  offset: number;
  className?: string;
  section?: string;
  search?: string;
}

export interface StudentResponseDto {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  className: string;
  section: string;
  guardian: {
    name: string;
    phone: string;
    relation: 'father' | 'mother' | 'guardian';
  };
  createdAt: string;
  updatedAt: string;
}
