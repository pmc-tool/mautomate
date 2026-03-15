// Mock wasp/server
export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const prisma = {
  setting: {
    findMany: async () => [],
    upsert: async () => ({}),
  },
  socialMediaAgentPost: {
    findUnique: async () => null,
    update: async () => ({}),
  },
  seoAgentPost: {
    findUnique: async () => null,
    update: async () => ({}),
  },
  postRevision: {
    create: async () => ({}),
  },
};
