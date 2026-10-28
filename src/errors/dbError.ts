const readCode = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('code' in err)) return undefined;
  const code = (err as { code: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

export const isUniqueViolation = (err: unknown): boolean => readCode(err) === '23505';

export const isForeignKeyViolation = (err: unknown): boolean => readCode(err) === '23503';

export const isCheckViolation = (err: unknown): boolean => readCode(err) === '23514';
