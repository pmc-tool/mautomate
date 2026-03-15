import { vi } from "vitest";

// Mock wasp/client/operations
export const useQuery = vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() }));
export const getBrandingSettings = vi.fn();
export const saveBrandingSettings = vi.fn();
export const getAllPosts = vi.fn();
export const approvePost = vi.fn();
export const rejectPost = vi.fn();
export const reworkPost = vi.fn();
export const schedulePost = vi.fn();
export const movePost = vi.fn();
export const getPostRevisions = vi.fn();
export const restoreRevision = vi.fn();
export const publishPostNow = vi.fn();
export const getSocialMediaPost = vi.fn();
export const getSeoPost = vi.fn();
export const uploadFile = vi.fn();
export const getDownloadFileSignedURL = vi.fn();
