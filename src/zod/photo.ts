import { z } from 'zod';

export const photoStatusSchema = z.union([
  z.literal('camera'),
  z.literal('pending'),
  z.literal('completed'),
]);

export const photoSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  status: photoStatusSchema,
  uri: z.string(),
  cameraPath: z.string(),
  pendingPath: z.string().optional(),
  completedPath: z.string().optional(),
  extension: z.string(),
  isVideo: z.boolean(),
  size: z.number(),
  modifiedTime: z.number(),
  thumbnail: z.string().optional(),
});
