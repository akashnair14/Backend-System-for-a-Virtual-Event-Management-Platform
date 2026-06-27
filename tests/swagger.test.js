const request = require('supertest');
const app = require('../src/app');

describe('Swagger Documentation Endpoints', () => {
  it('should serve the Swagger UI at /api-docs/', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
    expect(res.text).toContain('html');
  });

  it('should redirect /api-docs to /api-docs/ or serve it successfully', async () => {
    const res = await request(app).get('/api-docs');
    // swagger-ui-express usually responds with a redirect (301/302) or 200 depending on trailing slash handling
    expect([200, 301, 302]).toContain(res.status);
  });
});
