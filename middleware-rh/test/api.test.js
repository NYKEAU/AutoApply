/**
 * Tests pour l'API AutoApply
 * Ce fichier contient les tests pour les différentes routes de l'API
 */

import request from 'supertest';
import app from '../src/app.js';
import config from '../src/config.js';

describe('API Health', () => {
  test('GET /api/health devrait retourner un statut 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});

describe('API Candidatures', () => {
  test('GET /api/candidatures devrait retourner un statut 200', async () => {
    const response = await request(app).get('/api/candidatures');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Les candidatures devraient avoir des statuts francisés', async () => {
    const response = await request(app).get('/api/candidatures');
    
    // Vérifier que les candidatures ont bien été récupérées
    expect(response.statusCode).toBe(200);
    
    // Si des candidatures sont présentes, vérifier la francisation
    if (response.body.length > 0) {
      response.body.forEach(candidature => {
        // Vérifier que le statut est francisé
        if (candidature.status) {
          expect(['Postulé', 'Interviewé', 'Job refusé', 'Job accepté']).toContain(candidature.status);
        }
        
        // Vérifier que le salaire est normalisé
        if (!candidature.salary || candidature.salary === "" || candidature.salary === 0) {
          expect(candidature.salary).toBe("Non défini");
        }
      });
    }
  });
});

describe('API Settings', () => {
  test('GET /api/settings devrait retourner un statut 200', async () => {
    const response = await request(app).get('/api/settings');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('settings');
    expect(response.body.settings).toHaveProperty('notionEnabled');
    expect(response.body.settings).toHaveProperty('perplexityEnabled');
  });

  test('POST /api/settings devrait valider le format des tokens', async () => {
    // Test avec un token Notion invalide
    const invalidNotionResponse = await request(app)
      .post('/api/settings')
      .send({
        notionToken: 'invalid_token',
        notionDatabaseId: 'aaaabbbbccccddddeeeeffffgggghhh0',
      });
    expect(invalidNotionResponse.statusCode).toBe(400);
    
    // Test avec un token Perplexity invalide
    const invalidPerplexityResponse = await request(app)
      .post('/api/settings')
      .send({
        perplexityApiKey: 'invalid_key',
      });
    expect(invalidPerplexityResponse.statusCode).toBe(400);
    
    // Test avec des valeurs valides
    const validResponse = await request(app)
      .post('/api/settings')
      .send({
        notionToken: 'ntn_test1234567890abcdefghijklmnopqrstuvwxyz12345678',
        notionDatabaseId: 'aaaabbbbccccddddeeeeffffgggghhh0',
        perplexityApiKey: 'pplx-test1234567890abcdefghijklmnopqrstuvwxyz12345678',
      });
    expect(validResponse.statusCode).toBe(200);
    expect(validResponse.body).toHaveProperty('success', true);
  });
});

describe('Routes non trouvées', () => {
  test('Une route inexistante devrait retourner un statut 404', async () => {
    const response = await request(app).get('/api/route-inexistante');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
  });
}); 