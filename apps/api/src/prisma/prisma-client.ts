/* schema.prisma generates into apps/api/node_modules/.prisma/client. Under
   bun's isolated install the `@prisma/client` barrel resolves to its own
   un-generated stub in the store (PrismaClient typed `any`, no model types),
   so the generated package is imported directly and re-exported from here.
   Everything else in the API imports Prisma types from this module. */
export * from '.prisma/client';
