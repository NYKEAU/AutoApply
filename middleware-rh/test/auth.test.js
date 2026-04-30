/**
 * Tests pour l'authentification
 * Ce fichier contient les tests pour les routes d'authentification
 */

import request from "supertest";
import app from "../src/app.js";
import jwt from "jsonwebtoken";
import config from "../src/config.js";
import { firebaseAdmin } from "../src/config/firebase.js";

// Mock de Firebase Admin SDK
jest.mock("../src/config/firebase.js", () => ({
  firebaseAdmin: {
    auth: () => ({
      createUser: jest.fn().mockResolvedValue({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      }),
      getUser: jest.fn().mockResolvedValue({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      }),
      getUserByEmail: jest.fn().mockResolvedValue({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      }),
    }),
  },
}));

// Mock de Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaClient = {
    user: {
      create: jest.fn().mockResolvedValue({
        id: 1,
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      }),
    },
    candidature: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe("API Auth", () => {
  // Test d'inscription
  test("POST /api/auth/register devrait créer un nouvel utilisateur", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("user");
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toHaveProperty("uid", "test-uid");
    expect(response.body.user).toHaveProperty("email", "test@example.com");
    expect(response.body.user).toHaveProperty("displayName", "Test User");

    // Vérifier que le token est valide
    const decoded = jwt.verify(response.body.token, config.jwt.secret);
    expect(decoded).toHaveProperty("uid", "test-uid");
    expect(decoded).toHaveProperty("email", "test@example.com");
  });

  // Test de connexion
  test("POST /api/auth/login devrait authentifier un utilisateur", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("user");
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toHaveProperty("uid", "test-uid");
    expect(response.body.user).toHaveProperty("email", "test@example.com");

    // Vérifier que le token est valide
    const decoded = jwt.verify(response.body.token, config.jwt.secret);
    expect(decoded).toHaveProperty("uid", "test-uid");
    expect(decoded).toHaveProperty("email", "test@example.com");
  });

  // Test de récupération des informations utilisateur
  test("GET /api/auth/me devrait retourner les informations de l'utilisateur connecté", async () => {
    // Créer un token valide
    const token = jwt.sign(
      {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      },
      config.jwt.secret,
      {
        expiresIn: "1h",
        algorithm: "HS256",
      }
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("uid", "test-uid");
    expect(response.body.user).toHaveProperty("email", "test@example.com");
    expect(response.body.user).toHaveProperty("displayName", "Test User");
  });

  // Test de déconnexion
  test("GET /api/auth/logout devrait déconnecter l'utilisateur", async () => {
    const response = await request(app).get("/api/auth/logout");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "Déconnexion réussie");
  });

  // Test d'accès à une route protégée sans authentification
  test("GET /api/candidatures sans authentification devrait retourner une erreur 401", async () => {
    const response = await request(app).get("/api/candidatures");

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("error");
  });

  // Test d'accès à une route protégée avec authentification
  test("GET /api/candidatures avec authentification devrait retourner les candidatures", async () => {
    // Créer un token valide
    const token = jwt.sign(
      {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      },
      config.jwt.secret,
      {
        expiresIn: "1h",
        algorithm: "HS256",
      }
    );

    const response = await request(app)
      .get("/api/candidatures")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
