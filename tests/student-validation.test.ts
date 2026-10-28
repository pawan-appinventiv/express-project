import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app';
import type { Student } from '../src/modules/student/student.interface';
import * as markRepository from '../src/modules/mark/mark.repository';
import * as studentRepository from '../src/modules/student/student.repository';

const sampleStudent = (): Student => ({
  id: 1,
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: new Date(2014, 4, 1),
  className: '10',
  section: 'A',
  guardian: { name: 'Ravi Sharma', phone: '+919876543210', relation: 'father' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const validStudent = () => ({
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: '2014-05-01',
  className: '10',
  section: 'A',
  guardian: {
    name: 'Ravi Sharma',
    phone: '+919876543210',
    relation: 'father',
  },
});

let server: Server;
let baseUrl = '';

const request = async (method: string, path: string, body?: unknown, raw?: string) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as { error?: { details?: unknown } }) : null,
  };
};

const detailsText = (body: { error?: { details?: unknown } } | null): string => JSON.stringify(body?.error?.details ?? '');

const expectNoRepositoryCalls = (): void => {
  expect(studentRepository.findMany).not.toHaveBeenCalled();
  expect(studentRepository.findById).not.toHaveBeenCalled();
  expect(studentRepository.insert).not.toHaveBeenCalled();
  expect(studentRepository.update).not.toHaveBeenCalled();
  expect(studentRepository.remove).not.toHaveBeenCalled();
  expect(markRepository.insertMany).not.toHaveBeenCalled();
  expect(markRepository.findById).not.toHaveBeenCalled();
  expect(markRepository.update).not.toHaveBeenCalled();
  expect(markRepository.remove).not.toHaveBeenCalled();
  expect(markRepository.subjectAverages).not.toHaveBeenCalled();
};

describe('student and mark validation', () => {
  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Test server did not bind');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(studentRepository, 'findMany').mockResolvedValue([]);
    vi.spyOn(studentRepository, 'findById').mockResolvedValue(sampleStudent());
    vi.spyOn(studentRepository, 'insert').mockResolvedValue(sampleStudent());
    vi.spyOn(studentRepository, 'update').mockResolvedValue(sampleStudent());
    vi.spyOn(studentRepository, 'remove').mockResolvedValue(true);
    vi.spyOn(markRepository, 'insertMany').mockResolvedValue([]);
    vi.spyOn(markRepository, 'findById').mockResolvedValue(null);
    vi.spyOn(markRepository, 'update').mockResolvedValue(null);
    vi.spyOn(markRepository, 'remove').mockResolvedValue(true);
    vi.spyOn(markRepository, 'subjectAverages').mockResolvedValue([]);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('rejects SQL injection in rollNo', async () => {
    // A quote break-out would make a concatenated WHERE clause true and return every student.
    const response = await request('POST', '/api/students', {
      ...validStudent(),
      rollNo: "2026-10A-017' OR '1'='1",
    });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('rollNo');
    expectNoRepositoryCalls();
  });

  it('rejects stored XSS in a top-level name', async () => {
    // The script would run in a browser the next time the name was rendered as HTML.
    const response = await request('POST', '/api/students', {
      ...validStudent(),
      firstName: '<script>alert(1)</script>',
    });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('firstName');
    expectNoRepositoryCalls();
  });

  it('rejects XSS hidden in the nested guardian', async () => {
    // The guardian name would execute when an admin page rendered it as HTML.
    const response = await request('POST', '/api/students', {
      ...validStudent(),
      guardian: { ...validStudent().guardian, name: '<img src=x onerror=alert(1)>' },
    });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('guardian.name');
    expectNoRepositoryCalls();
  });

  it('rejects prototype pollution', async () => {
    // A __proto__ key could change object prototypes and skip later access checks.
    const payload = JSON.stringify(validStudent()).replace(
      '{',
      '{"__proto__":{"admin":true},',
    );
    const response = await request('POST', '/api/students', undefined, payload);
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('__proto__');
    expectNoRepositoryCalls();
  });

  it('rejects mass assignment of id', async () => {
    // A client-supplied id would choose the primary key instead of the database identity.
    const response = await request('POST', '/api/students', { ...validStudent(), id: 1 });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('id');
    expectNoRepositoryCalls();
  });

  it('rejects an object where a string is required', async () => {
    // An object in a name field would crash string handling or skip the name checks.
    const response = await request('POST', '/api/students', { ...validStudent(), firstName: { bad: true } });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('firstName');
    expectNoRepositoryCalls();
  });

  it('rejects an oversized marks array', async () => {
    // A 1000-row payload would open a huge transaction and could exhaust memory.
    const marks = Array.from({ length: 1000 }, (_, index) => ({
      subject: `sub-${index}`,
      score: 1,
      maxScore: 100,
    }));
    const response = await request('POST', '/api/students/1/marks', { exam: 'final', marks });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('marks');
    expectNoRepositoryCalls();
  });

  it('rejects a score above maxScore inside the marks array', async () => {
    // A score above the maximum would inflate the subject average and could flip a fail to a pass.
    const response = await request('POST', '/api/students/1/marks', {
      exam: 'final',
      marks: [{ subject: 'maths', score: 120, maxScore: 100 }],
    });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('marks.0.score');
    expectNoRepositoryCalls();
  });

  it('rejects a null byte in a name', async () => {
    // A null byte can truncate the value in a C driver and hide everything after it.
    const response = await request('POST', '/api/students', { ...validStudent(), lastName: 'Sha\u0000rma' });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('lastName');
    expectNoRepositoryCalls();
  });

  it('rejects a calendar date that only looks real', async () => {
    // 2026-02-30 is not a day; accepting it would store a shifted date and break the age rule.
    const response = await request('POST', '/api/students', { ...validStudent(), dateOfBirth: '2026-02-30' });
    expect(response.status).toBe(400);
    expect(detailsText(response.body)).toContain('dateOfBirth');
    expectNoRepositoryCalls();
  });

  it('rejects query values outside their ranges', async () => {
    const limit = await request('GET', '/api/students?limit=100000');
    expect(limit.status).toBe(400);
    expect(detailsText(limit.body)).toContain('limit');

    const className = await request('GET', '/api/students?className=13');
    expect(className.status).toBe(400);
    expect(detailsText(className.body)).toContain('className');

    const section = await request('GET', '/api/students?section=Z');
    expect(section.status).toBe(400);
    expect(detailsText(section.body)).toContain('section');

    const averages = await request('GET', '/api/marks/averages');
    expect(averages.status).toBe(400);
    expect(detailsText(averages.body)).toContain('className');

    expectNoRepositoryCalls();
  });

  it('passes a checked list query through to the repository', async () => {
    const response = await request('GET', '/api/students?className=10&section=a&search=100%25_&limit=5&offset=0');
    expect(response.status).toBe(200);
    expect(studentRepository.findMany).toHaveBeenCalledWith({
      className: '10',
      section: 'A',
      search: '100%_',
      limit: 5,
      offset: 0,
    });
  });

  it('passes average filters through to the repository', async () => {
    const response = await request('GET', '/api/marks/averages?className=10&section=b');
    expect(response.status).toBe(200);
    expect(markRepository.subjectAverages).toHaveBeenCalledWith({
      className: '10',
      exam: undefined,
      section: 'B',
    });
  });

  it('sanitises a valid student before the repository sees it', async () => {
    const response = await request('POST', '/api/students', {
      ...validStudent(),
      rollNo: '  2026-10a-017 ',
      className: 7,
      section: ' a ',
      guardian: {
        ...validStudent().guardian,
        phone: '+91 98765-43210',
        relation: 'Mother',
      },
    });
    expect(response.status).toBe(201);
    expect(studentRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rollNo: '2026-10A-017',
        className: '7',
        section: 'A',
        guardian: expect.objectContaining({
          phone: '+919876543210',
          relation: 'mother',
        }),
      }),
    );
  });
});
