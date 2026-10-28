import express, { type Request } from 'express';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFound';
import { rejectDangerousPayload } from './middlewares/rejectDangerousPayload';
import { requestLogger } from './middlewares/requestLogger';
import routes from './routes';

const app = express();

app.use(requestLogger);
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf.toString('utf8');
    },
  }),
);
app.use(rejectDangerousPayload);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;