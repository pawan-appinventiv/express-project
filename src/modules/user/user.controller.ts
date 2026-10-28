import { Router, type Request, type Response } from 'express';
import { validateBody } from '../../middlewares/validate';
import { sendSuccess } from '../../utils/sendSuccess';
import { createUserDto, updateUserDto, userIdParamDto, type CreateUserDto, type UpdateUserDto } from './user.dto';
import * as userService from './user.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  sendSuccess(res, await userService.findAllUsers());
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = userIdParamDto.parse(req.params);
  sendSuccess(res, await userService.findUserById(id));
});

router.post('/', validateBody(createUserDto), async (req: Request<unknown, unknown, CreateUserDto>, res: Response) => {
  sendSuccess(res, await userService.createUser(req.body), 201);
});

router.patch(
  '/:id',
  validateBody(updateUserDto),
  async (req: Request<{ id: string }, unknown, UpdateUserDto>, res: Response) => {
    const { id } = userIdParamDto.parse(req.params);
    sendSuccess(res, await userService.updateUser(id, req.body));
  },
);

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = userIdParamDto.parse(req.params);
  await userService.deleteUser(id);
  sendSuccess(res, undefined, 204);
});

export default router;