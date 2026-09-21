import { z } from "zod";

const finiteCoordinate = z.number().finite();

export const agentLocationSchema = z
  .object({
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    accuracyMeters: finiteCoordinate.min(0).max(10_000).optional(),
  })
  .strict();

export const agentCenterCardSchema = z
  .object({
    type: z.literal("center"),
    code: z.string().min(1).max(120),
    name: z.string().min(1).max(180),
    summary: z.string().min(1).max(500),
    category: z.string().min(1).max(120),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    distanceMeters: finiteCoordinate.min(0).nullable(),
  })
  .strict();

export const agentEstablishmentCardSchema = z
  .object({
    type: z.literal("establishment"),
    name: z.string().min(1).max(180),
    summary: z.string().min(1).max(500),
    category: z.string().max(120).nullable(),
    address: z.string().max(500).nullable(),
    phone: z.string().max(40).nullable(),
    localityName: z.string().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90).nullable(),
    longitude: finiteCoordinate.min(-180).max(180).nullable(),
    distanceMeters: finiteCoordinate.min(0).nullable(),
  })
  .strict();

export const agentPoiCardSchema = z
  .object({
    type: z.literal("poi"),
    name: z.string().min(1).max(180),
    summary: z.string().min(1).max(500),
    category: z.string().min(1).max(120),
    localityName: z.string().min(1).max(180),
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

export const agentItineraryStopSchema = z
  .object({
    type: z.literal("center"),
    code: z.string().min(1).max(120),
    name: z.string().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    order: z.number().int().min(1).max(6),
  })
  .strict();

export const agentItinerarySchema = z
  .object({
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(500),
    stops: z.array(agentItineraryStopSchema).min(2).max(6),
  })
  .strict();

export const agentRouteDestinationSchema = z
  .object({
    type: z.enum(["center", "establishment", "poi"]),
    code: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
  })
  .strict();

export const agentActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("open_center"),
      code: z.string().min(1).max(120),
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
    type: z.enum(["center", "establishment", "poi", "transport"]),
    label: z.string().min(1).max(240),
  })
  .strict();

export const agentResponseSchema = z
  .object({
    text: z.string().min(1).max(4_000),
    cards: z.array(agentCardSchema).max(6),
    actions: z.array(agentActionSchema).max(4),
    itinerary: agentItinerarySchema.optional(),
    sources: z.array(agentSourceSchema).max(8),
  })
  .strict();

export type AgentLocation = z.infer<typeof agentLocationSchema>;
export type AgentCard = z.infer<typeof agentCardSchema>;
export type AgentItinerary = z.infer<typeof agentItinerarySchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type AgentRouteDestination = z.infer<typeof agentRouteDestinationSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;

export type AgentHistoryItem = Readonly<{
  role: "user" | "assistant";
  content: string;
}>;

export type AgentMessage = Readonly<{
  id: string;
  role: "assistant" | "user";
  text: string;
  cards?: readonly AgentCard[];
  itinerary?: AgentItinerary;
  actions?: readonly AgentAction[];
  sources?: readonly Readonly<{
    type: "center" | "establishment" | "poi" | "transport";
    label: string;
  }>[];
}>;
