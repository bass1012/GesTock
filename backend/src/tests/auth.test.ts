import request from 'supertest';
import app from '../app';

describe('Authentification API', () => {
  it('devrait retourner 401 si aucun token n\'est fourni', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('devrait échouer à la connexion avec des identifiants invalides', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
      
    expect(res.status).toBe(401);
  });
});
