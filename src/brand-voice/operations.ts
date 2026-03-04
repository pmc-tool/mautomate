import { HttpError } from "wasp/server";
import type {
  GetCompanies,
  GetCompany,
  CreateCompany,
  UpdateCompany,
  DeleteCompany,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  type: z.number().int().min(0).max(2), // 0=Product, 1=Service, 2=Other
  keyFeatures: z.string().optional().nullable(),
});

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  targetAudience: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  tagline: z.string().optional().nullable(),
  toneOfVoice: z.string().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  specificInstructions: z.string().optional().nullable(),
  products: z.array(productSchema).optional().default([]),
});

const updateCompanySchema = createCompanySchema.extend({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getCompanies: GetCompanies<void, any[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  return context.entities.Company.findMany({
    where: { userId: context.user.id },
    include: { products: true },
    orderBy: { name: "asc" },
  });
};

export const getCompany: GetCompany<{ id: string }, any> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const company = await context.entities.Company.findUnique({
    where: { id: args.id },
    include: { products: true },
  });

  if (!company) {
    throw new HttpError(404, "Company not found");
  }

  if (company.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return company;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createCompany: CreateCompany<z.infer<typeof createCompanySchema>, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(createCompanySchema, rawArgs);

  const company = await context.entities.Company.create({
    data: {
      userId: context.user.id,
      name: args.name,
      industry: args.industry ?? null,
      description: args.description,
      targetAudience: args.targetAudience ?? null,
      website: args.website ?? null,
      tagline: args.tagline ?? null,
      toneOfVoice: args.toneOfVoice ?? null,
      brandColor: args.brandColor ?? null,
      specificInstructions: args.specificInstructions ?? null,
    },
  });

  // Create products
  if (args.products.length > 0) {
    await context.entities.Product.createMany({
      data: args.products.map((p) => ({
        userId: context.user!.id,
        companyId: company.id,
        name: p.name,
        type: p.type,
        keyFeatures: p.keyFeatures ?? null,
      })),
    });
  }

  return context.entities.Company.findUnique({
    where: { id: company.id },
    include: { products: true },
  });
};

export const updateCompany: UpdateCompany<z.infer<typeof updateCompanySchema>, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(updateCompanySchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.Company.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "Company not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // Update company
  await context.entities.Company.update({
    where: { id: args.id },
    data: {
      name: args.name,
      industry: args.industry ?? null,
      description: args.description,
      targetAudience: args.targetAudience ?? null,
      website: args.website ?? null,
      tagline: args.tagline ?? null,
      toneOfVoice: args.toneOfVoice ?? null,
      brandColor: args.brandColor ?? null,
      specificInstructions: args.specificInstructions ?? null,
    },
  });

  // Replace products: delete old, create new
  await context.entities.Product.deleteMany({
    where: { companyId: args.id },
  });

  if (args.products.length > 0) {
    await context.entities.Product.createMany({
      data: args.products.map((p) => ({
        userId: context.user!.id,
        companyId: args.id,
        name: p.name,
        type: p.type,
        keyFeatures: p.keyFeatures ?? null,
      })),
    });
  }

  return context.entities.Company.findUnique({
    where: { id: args.id },
    include: { products: true },
  });
};

export const deleteCompany: DeleteCompany<{ id: string }, void> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const company = await context.entities.Company.findUnique({
    where: { id: args.id },
  });

  if (!company) {
    throw new HttpError(404, "Company not found");
  }

  if (company.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // Products cascade-delete via the schema relation
  await context.entities.Company.delete({
    where: { id: args.id },
  });
};
