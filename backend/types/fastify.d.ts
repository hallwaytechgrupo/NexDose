import '@fastify/jwt';

declare module 'fastify' {
    interface FastifyRequest {
        user: {
            id: string;
            role: string;
        }
    }
}