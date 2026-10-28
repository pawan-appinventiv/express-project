import { Router, type Request, type Response } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { sendSuccess } from '../../utils/sendSuccess';
import { idParam } from '../../utils/validators';
import { createMarksDto, type CreateMarksDto } from '../mark/mark.dto';
import * as markService from '../mark/mark.service';
import {
  createStudentDto,
  listStudentsQueryDto,
  updateStudentDto,
  type CreateStudentDto,
  type ListStudentsQueryDto,
  type UpdateStudentDto,
} from './student.dto';
import * as studentService from './student.service';

const router = Router();

router.post(
  '/',
  validateBody(createStudentDto),
  async (req: Request<unknown, unknown, CreateStudentDto>, res: Response) => {
    sendSuccess(res, await studentService.createStudent(req.body), 201);
  },
);

router.get('/', validateQuery(listStudentsQueryDto), async (_req: Request, res: Response) => {
  sendSuccess(res, await studentService.listStudents(res.locals.validatedQuery as ListStudentsQueryDto));
});

router.post(
  '/:id/marks',
  validateParams(idParam),
  validateBody(createMarksDto),
  async (req: Request<{ id: string }, unknown, CreateMarksDto>, res: Response) => {
    sendSuccess(res, await markService.addMarks(Number(req.params.id), req.body), 201);
  },
);

router.get('/:id', validateParams(idParam), async (req: Request, res: Response) => {
  sendSuccess(res, await studentService.getStudent(Number(req.params.id)));
});

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(updateStudentDto),
  async (req: Request<{ id: string }, unknown, UpdateStudentDto>, res: Response) => {
    sendSuccess(res, await studentService.updateStudent(Number(req.params.id), req.body));
  },
);

router.delete('/:id', validateParams(idParam), async (req: Request, res: Response) => {
  await studentService.deleteStudent(Number(req.params.id));
  sendSuccess(res, undefined, 204);
});

export default router;
