import { Router, type Request, type Response } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { sendSuccess } from '../../utils/sendSuccess';
import { idParam } from '../../utils/validators';
import { averagesQueryDto, updateMarkDto, type AveragesQueryDto, type UpdateMarkDto } from './mark.dto';
import * as markService from './mark.service';

const router = Router();

router.get('/averages', validateQuery(averagesQueryDto), async (_req: Request, res: Response) => {
  sendSuccess(res, await markService.getSubjectAverages(res.locals.validatedQuery as AveragesQueryDto));
});

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(updateMarkDto),
  async (req: Request<{ id: string }, unknown, UpdateMarkDto>, res: Response) => {
    sendSuccess(res, await markService.updateMark(Number(req.params.id), req.body));
  },
);

router.delete('/:id', validateParams(idParam), async (req: Request, res: Response) => {
  await markService.deleteMark(Number(req.params.id));
  sendSuccess(res, undefined, 204);
});

export default router;
