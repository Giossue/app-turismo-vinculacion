import { z } from "zod";

import { routeModes } from "@/features/routing/domain/routing";

/** Limits of the API's chat contract (`agentChatSchema`). */
export const AGENT_MESSAGE_MAX_LENGTH = 2_000;
export const AGENT_HISTORY_MAX_ITEMS = 12;
export const AGENT_MAX_ACCURACY_METERS = 10_000;

const finiteCoordinate = z.number().finite();

export const agentLocationSchema = z
  .object({
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    accuracyMeters: finiteCoordinate
      .min(0)
      .max(AGENT_MAX_ACCURACY_METERS)
      .optional(),
  })
  .strict();

const agentCenterCardSchema = z
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

const agentEstablishmentCardSchema = z
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

const agentPoiCardSchema = z
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

const agentCardSchema = z.discriminatedUnion("type", [
  agentCenterCardSchema,
  agentEstablishmentCardSchema,
  agentPoiCardSchema,
]);

const agentItineraryStopSchema = z
  .object({
    type: z.literal("center"),
    code: z.string().min(1).max(120),
    name: z.string().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
    order: z.number().int().min(1).max(6),
  })
  .strict();

const agentItinerarySchema = z
  .object({
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(500),
    stops: z.array(agentItineraryStopSchema).min(2).max(6),
  })
  .strict();

const agentRouteDestinationSchema = z
  .object({
    type: z.enum(["center", "establishment", "poi"]),
    code: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(180),
    latitude: finiteCoordinate.min(-90).max(90),
    longitude: finiteCoordinate.min(-180).max(180),
  })
  .strict();

const agentActionSchema = z.discriminatedUnion("type", [
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
      mode: z.enum(routeModes),
      requiresConfirmation: z.literal(true),
    })
    .strict(),
]);

const agentSourceSchema = z
  .object({
    type: z.enum(["center", "establishment", "poi", "transport", "routing"]),
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

/** A previous turn sent back to the agent as conversation context. */
export const agentHistoryItemSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(AGENT_MESSAGE_MAX_LENGTH),
  })
  .strict();

export type AgentLocation = z.infer<typeof agentLocationSchema>;
export type AgentCard = z.infer<typeof agentCardSchema>;
export type AgentItinerary = z.infer<typeof agentItinerarySchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type AgentRouteDestination = z.infer<typeof agentRouteDestinationSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
type AgentSource = z.infer<typeof agentSourceSchema>;
export type AgentHistoryItem = Readonly<z.infer<typeof agentHistoryItemSchema>>;

export type StartRouteAction = Extract<AgentAction, { type: "start_route" }>;

/**
 * A chat bubble. `kind` marks bubbles that are not part of a successful
 * exchange (the greeting, an error, an answer cut off mid-stream); they are
 * shown but never sent back to the agent as history.
 */
export type AgentMessage = Readonly<{
  id: string;
  role: "assistant" | "user";
  text: string;
  kind?: "intro" | "error" | "partial";
  cards?: readonly AgentCard[];
  itinerary?: AgentItinerary;
  actions?: readonly AgentAction[];
  sources?: readonly AgentSource[];
}>;

export function isSameRouteAction(
  left: StartRouteAction,
  right: StartRouteAction,
): boolean {
  return (
    left.mode === right.mode &&
    left.destination.type === right.destination.type &&
    left.destination.name === right.destination.name &&
    left.destination.latitude === right.destination.latitude &&
    left.destination.longitude === right.destination.longitude
  );
}
