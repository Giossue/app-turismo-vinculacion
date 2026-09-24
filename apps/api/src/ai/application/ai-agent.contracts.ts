import { z } from "zod";

const referenceSchema = z.string().trim().min(1).max(96);
const finiteCoordinate = z.number().finite();

export const agentLocationSchema = z
  .object({
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    accuracyMeters: finiteCoordinate.min(0).max(10_000).optional(),
  })
  .strict();

export const agentChatSchema = z
  .object({
    message: z.string().trim().min(1).max(2_000),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(2_000),
          })
          .strict(),
      )
      .max(12)
      .default([]),
    location: agentLocationSchema.optional(),
    conversationId: z.uuid().optional(),
  })
  .strict();

export type AgentChatInput = z.infer<typeof agentChatSchema>;

export const agentModelCardSchema = z
  .object({
    ref: referenceSchema,
  })
  .strict();

const agentModelItineraryStopSchema = z
  .object({
    order: z.number().int().min(1).max(6),
    ref: referenceSchema,
  })
  .strict();

const agentModelItinerarySchema = z
  .object({
    stops: z.array(agentModelItineraryStopSchema).min(2).max(6),
    summary: z.string().trim().min(1).max(500),
    title: z.string().trim().min(1).max(160),
  })
  .strict();

export const agentModelActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("open_center"),
      ref: referenceSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("start_route"),
      mode: z.enum(["car", "bicycle", "foot"]),
      ref: referenceSchema,
    })
    .strict(),
]);

export const agentModelResponseSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    cards: z.array(agentModelCardSchema).max(6).default([]),
    actions: z.array(agentModelActionSchema).max(4).default([]),
    itinerary: agentModelItinerarySchema.optional(),
  })
  .strict();

const agentCenterCardSchema = z
  .object({
    type: z.literal("center"),
    code: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(120),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    distanceMeters: finiteCoordinate.min(0).nullable(),
  })
  .strict();

const agentEstablishmentCardSchema = z
  .object({
    type: z.literal("establishment"),
    name: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(500),
    category: z.string().trim().max(120).nullable(),
    address: z.string().trim().max(500).nullable(),
    phone: z.string().trim().max(40).nullable(),
    localityName: z.string().trim().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90).nullable(),
    longitude: finiteCoordinate.min(-180).max(180).nullable(),
    distanceMeters: finiteCoordinate.min(0).nullable(),
  })
  .strict();

const agentPoiCardSchema = z
  .object({
    type: z.literal("poi"),
    name: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(120),
    localityName: z.string().trim().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    distanceMeters: finiteCoordinate.min(0),
  })
  .strict();

export const agentCardSchema = z.discriminatedUnion("type", [
  agentCenterCardSchema,
  agentEstablishmentCardSchema,
  agentPoiCardSchema,
]);

const agentItineraryStopSchema = z
  .object({
    type: z.literal("center"),
    code: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    order: z.number().int().min(1).max(6),
  })
  .strict();

export const agentItinerarySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(500),
    stops: z.array(agentItineraryStopSchema).min(2).max(6),
  })
  .strict();

const agentRouteDestinationSchema = z
  .object({
    type: z.enum(["center", "establishment", "poi"]),
    code: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
  })
  .strict();

export const agentActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("request_location") }).strict(),
  z
    .object({
      type: z.literal("open_center"),
      code: z.string().trim().min(1).max(120),
    })
    .strict(),
  z
    .object({
      type: z.literal("start_route"),
      destination: agentRouteDestinationSchema,
      mode: z.enum(["car", "bicycle", "foot"]),
      requiresConfirmation: z.literal(true),
    })
    .strict(),
]);

export const agentSourceSchema = z
  .object({
    type: z.enum(["center", "establishment", "poi", "transport", "routing"]),
    label: z.string().trim().min(1).max(240),
  })
  .strict();

export const agentResponseSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    cards: z.array(agentCardSchema).max(6),
    actions: z.array(agentActionSchema).max(4),
    itinerary: agentItinerarySchema.optional(),
    sources: z.array(agentSourceSchema).max(24),
    conversationId: z.uuid().optional(),
    historySaveError: z.boolean().optional(),
  })
  .strict();

export type AgentModelResponse = z.infer<typeof agentModelResponseSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type AgentItinerary = z.infer<typeof agentItinerarySchema>;
export type AgentCard = z.infer<typeof agentCardSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type AgentSource = z.infer<typeof agentSourceSchema>;
