import { notFound } from '../../errors/AppError';
import type { CreateStudentDto, ListStudentsQueryDto, StudentResponseDto, UpdateStudentDto } from './student.dto';
import type { Student, StudentChanges } from './student.interface';
import * as studentRepository from './student.repository';

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateOnly = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('dateOfBirth must be YYYY-MM-DD');
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const toResponseDto = (student: Student): StudentResponseDto => ({
  id: student.id,
  rollNo: student.rollNo,
  firstName: student.firstName,
  lastName: student.lastName,
  dateOfBirth: formatDateOnly(student.dateOfBirth),
  className: student.className,
  section: student.section,
  guardian: {
    name: student.guardian.name,
    phone: student.guardian.phone,
    relation: student.guardian.relation,
  },
  createdAt: student.createdAt.toISOString(),
  updatedAt: student.updatedAt.toISOString(),
});

const toChanges = (dto: UpdateStudentDto): StudentChanges => {
  const changes: StudentChanges = {};
  if (dto.rollNo !== undefined) changes.rollNo = dto.rollNo;
  if (dto.firstName !== undefined) changes.firstName = dto.firstName;
  if (dto.lastName !== undefined) changes.lastName = dto.lastName;
  if (dto.dateOfBirth !== undefined) changes.dateOfBirth = parseDateOnly(dto.dateOfBirth);
  if (dto.className !== undefined) changes.className = dto.className;
  if (dto.section !== undefined) changes.section = dto.section;
  if (dto.guardian !== undefined) changes.guardian = dto.guardian;
  return changes;
};

export const listStudents = async (query: ListStudentsQueryDto): Promise<StudentResponseDto[]> => {
  const students = await studentRepository.findMany({
    className: query.className,
    section: query.section,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  });
  return students.map(toResponseDto);
};

export const getStudent = async (id: number): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponseDto(student);
};

export const createStudent = async (dto: CreateStudentDto): Promise<StudentResponseDto> => {
  const student = await studentRepository.insert(toChanges(dto));
  return toResponseDto(student);
};

export const updateStudent = async (id: number, dto: UpdateStudentDto): Promise<StudentResponseDto> => {
  const student = await studentRepository.update(id, toChanges(dto));
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponseDto(student);
};

export const deleteStudent = async (id: number): Promise<void> => {
  const removed = await studentRepository.remove(id);
  if (!removed) throw notFound(`Student ${id} not found`);
};
