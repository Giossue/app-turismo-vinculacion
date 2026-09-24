import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { useTurismoPalette } from "@/core/ui/theme-context";
import {
  TourismActionButton,
  TourismIconAction,
} from "@/core/ui/tourism-controls";
import { TourismPressable } from "@/core/ui/tourism-pressable";
import {
  turismoMetrics,
  turismoRadii,
  turismoSpacing,
  turismoTypography,
} from "@/core/ui/tokens";
import { useAuth } from "@/features/auth/application/auth-context";
import { getPublishedCenters } from "@/features/centers/data/public-centers-api";
import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { useAgentPlans } from "../application/use-agent-plans";
import type {
  SaveAgentPlanInput,
  SavedAgentPlan,
} from "../data/agent-itineraries-api";

type Plans = ReturnType<typeof useAgentPlans>;

export function AgentSavedPlans({
  plans,
  onOpenCenter,
}: Readonly<{
  plans: Plans;
  onOpenCenter: (code: string) => void;
}>) {
  const colors = useTurismoPalette();
  const auth = useAuth();
  const [selected, setSelected] = useState<SavedAgentPlan | null>(null);
  const [draft, setDraft] = useState<SaveAgentPlanInput | null>(null);
  const [search, setSearch] = useState("");
  const [searchDay, setSearchDay] = useState<number | null>(null);
  const [matches, setMatches] = useState<readonly PublicCenter[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const select = (plan: SavedAgentPlan) => {
    setSelected(plan);
    setDraft({
      title: plan.title,
      summary: plan.summary,
      days: plan.days.map((day) => ({
        date: day.date,
        stops: day.stops.map((stop) => stop.code),
      })),
    });
  };

  const move = (dayIndex: number, stopIndex: number, offset: number) => {
    setDraft((current) => {
      if (!current) return current;
      const days = current.days.map((day) => ({
        ...day,
        stops: [...day.stops],
      }));
      const stops = days[dayIndex].stops;
      const destination = stopIndex + offset;
      if (destination < 0 || destination >= stops.length) return current;
      [stops[stopIndex], stops[destination]] = [
        stops[destination],
        stops[stopIndex],
      ];
      return { ...current, days };
    });
  };

  const changeDays = (
    update: (days: { date: string | null; stops: string[] }[]) => void,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const days = current.days.map((day) => ({
        date: day.date,
        stops: [...day.stops],
      }));
      update(days);
      return { ...current, days };
    });
  };

  const findCenters = async (dayIndex: number) => {
    const term = search.trim();
    if (term.length < 2) return;
    setSearchDay(dayIndex);
    setSearching(true);
    setSearchError(null);
    try {
      setMatches(
        (await getPublishedCenters({ text: term }, auth.request)).slice(0, 10),
      );
    } catch {
      setSearchError("No se pudieron buscar lugares publicados.");
    } finally {
      setSearching(false);
    }
  };

  const save = async () => {
    if (!selected || !draft) return;
    const result = await plans.update(selected.id, draft);
    if (result) {
      setSelected(null);
      setDraft(null);
    }
  };

  const remove = () => {
    if (!selected) return;
    Alert.alert("Eliminar plan", `¿Eliminar «${selected.title}»?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          void plans.remove(selected.id).then((removed) => {
            if (removed) {
              setSelected(null);
              setDraft(null);
            }
          }),
      },
    ]);
  };

  const stopName = (dayIndex: number, code: string) =>
    selected?.days
      .flatMap((day) => day.stops)
      .find((stop) => stop.code === code)?.name ??
    matches.find((center) => center.code === code)?.name ??
    code;

  const totalStops =
    draft?.days.reduce((count, day) => count + day.stops.length, 0) ?? 0;
  const invalidDays =
    draft?.days.some(
      (day) =>
        day.stops.length < 1 ||
        day.stops.length > 6 ||
        (day.date !== null && !validDate(day.date)),
    ) ?? false;

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {plans.error ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {plans.error}
        </Text>
      ) : null}
      {selected && draft ? (
        <>
          <TourismActionButton
            compact
            label="Volver a mis planes"
            onPress={() => {
              setSelected(null);
              setDraft(null);
            }}
          />
          <Text style={[styles.label, { color: colors.text }]}>
            Nombre del plan
          </Text>
          <TextInput
            accessibilityLabel="Nombre del plan"
            maxLength={160}
            onChangeText={(title) =>
              setDraft((current) => (current ? { ...current, title } : null))
            }
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
            value={draft.title}
          />
          <Text style={[styles.label, { color: colors.text }]}>
            Descripción
          </Text>
          <TextInput
            accessibilityLabel="Descripción del plan"
            maxLength={500}
            multiline
            onChangeText={(summary) =>
              setDraft((current) => (current ? { ...current, summary } : null))
            }
            style={[
              styles.input,
              styles.summary,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
            value={draft.summary}
          />
          {draft.days.map((day, dayIndex) => (
            <View key={dayIndex} style={styles.day}>
              <Text style={[styles.label, { color: colors.text }]}>
                Jornada {dayIndex + 1}
              </Text>
              <TextInput
                accessibilityLabel={`Fecha de jornada ${dayIndex + 1}; opcional, formato año-mes-día`}
                maxLength={10}
                placeholder="Fecha opcional: AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
                onChangeText={(value) =>
                  changeDays((days) => {
                    days[dayIndex].date = value.trim() || null;
                  })
                }
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
                value={day.date ?? ""}
              />
              {day.stops.map((code, stopIndex) => (
                <View key={code} style={styles.stop}>
                  <TourismPressable
                    accessibilityLabel={`Abrir ${stopName(dayIndex, code)}`}
                    accessibilityRole="button"
                    onPress={() => onOpenCenter(code)}
                    style={styles.stopNameButton}
                  >
                    <Text style={[styles.body, { color: colors.text }]}>
                      {stopIndex + 1}. {stopName(dayIndex, code)}
                    </Text>
                  </TourismPressable>
                  <TourismIconAction
                    accessibilityLabel={`Subir ${stopName(dayIndex, code)}`}
                    disabled={stopIndex === 0}
                    icon="chevronUp"
                    onPress={() => move(dayIndex, stopIndex, -1)}
                    variant="ghost"
                  />
                  <TourismIconAction
                    accessibilityLabel={`Bajar ${stopName(dayIndex, code)}`}
                    disabled={stopIndex === day.stops.length - 1}
                    icon="chevronDown"
                    onPress={() => move(dayIndex, stopIndex, 1)}
                    variant="ghost"
                  />
                  <TourismIconAction
                    accessibilityLabel={`Quitar ${stopName(dayIndex, code)}`}
                    icon="close"
                    onPress={() =>
                      changeDays((days) => {
                        days[dayIndex].stops.splice(stopIndex, 1);
                      })
                    }
                    variant="ghost"
                  />
                </View>
              ))}
              <TextInput
                accessibilityLabel={`Buscar lugar para jornada ${dayIndex + 1}`}
                onChangeText={(value) => {
                  setSearchDay(dayIndex);
                  setSearch(value);
                  setMatches([]);
                }}
                placeholder="Buscar lugar publicado"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
                value={searchDay === dayIndex ? search : ""}
              />
              <TourismActionButton
                compact
                disabled={
                  searching || search.trim().length < 2 || day.stops.length >= 6
                }
                label="Buscar para esta jornada"
                onPress={() => void findCenters(dayIndex)}
              />
              {searchDay === dayIndex && searchError ? (
                <Text style={[styles.error, { color: colors.danger }]}>
                  {searchError}
                </Text>
              ) : null}
              {searchDay === dayIndex &&
                matches.map((center) => (
                  <TourismPressable
                    accessibilityLabel={`Añadir ${center.name} a jornada ${dayIndex + 1}`}
                    accessibilityRole="button"
                    key={center.code}
                    onPress={() => {
                      changeDays((days) => {
                        if (
                          days[dayIndex].stops.length < 6 &&
                          !days[dayIndex].stops.includes(center.code)
                        )
                          days[dayIndex].stops.push(center.code);
                      });
                      setMatches([]);
                      setSearch("");
                    }}
                    style={[
                      styles.plan,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text style={[styles.body, { color: colors.text }]}>
                      {center.name}
                    </Text>
                  </TourismPressable>
                ))}
              {draft.days.length > 1 ? (
                <TourismActionButton
                  compact
                  label="Quitar jornada"
                  onPress={() =>
                    changeDays((days) => {
                      days.splice(dayIndex, 1);
                    })
                  }
                />
              ) : null}
            </View>
          ))}
          <TourismActionButton
            compact
            disabled={draft.days.length >= 7}
            label="Añadir jornada"
            onPress={() =>
              changeDays((days) => {
                days.push({ date: null, stops: [] });
              })
            }
          />
          {invalidDays || totalStops < 2 ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Cada jornada necesita de 1 a 6 lugares; el plan completo, al menos
              2.
            </Text>
          ) : null}
          <TourismActionButton
            disabled={
              plans.busy ||
              !draft.title.trim() ||
              !draft.summary.trim() ||
              invalidDays ||
              totalStops < 2
            }
            label="Guardar cambios"
            onPress={() => void save()}
          />
          <TourismActionButton
            disabled={plans.busy}
            label="Eliminar plan"
            onPress={remove}
          />
        </>
      ) : (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>
            Mis planes
          </Text>
          {plans.plans.length === 0 && !plans.busy ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Todavía no tienes planes guardados. Pide un plan al agente y
              guárdalo desde su propuesta.
            </Text>
          ) : null}
          {plans.plans.map((plan) => (
            <TourismPressable
              accessibilityLabel={`Editar plan ${plan.title}`}
              accessibilityRole="button"
              key={plan.id}
              onPress={() => select(plan)}
              style={[
                styles.plan,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                {plan.title}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.body, { color: colors.textMuted }]}
              >
                {plan.summary}
              </Text>
              <Text style={[styles.body, { color: colors.textFaint }]}>
                {plan.days.length} jornada(s) ·{" "}
                {plan.days.reduce((count, day) => count + day.stops.length, 0)}{" "}
                paradas
              </Text>
            </TourismPressable>
          ))}
        </>
      )}
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: turismoSpacing.md, paddingBottom: turismoSpacing.xxl },
  heading: { ...turismoTypography.title },
  label: { ...turismoTypography.label },
  body: { ...turismoTypography.bodySmall },
  error: { ...turismoTypography.bodySmall },
  input: {
    ...turismoTypography.body,
    borderRadius: turismoRadii.sm,
    borderWidth: turismoMetrics.borderWidth,
    minHeight: turismoMetrics.touchTarget,
    paddingHorizontal: turismoSpacing.sm,
  },
  summary: {
    minHeight: turismoMetrics.controlLg * 2,
    textAlignVertical: "top",
  },
  plan: {
    borderRadius: turismoRadii.md,
    borderWidth: turismoMetrics.borderWidth,
    gap: turismoSpacing.xs,
    minHeight: turismoMetrics.touchTarget,
    padding: turismoSpacing.md,
  },
  day: { gap: turismoSpacing.xs },
  stop: { alignItems: "center", flexDirection: "row" },
  stopNameButton: {
    flex: 1,
    justifyContent: "center",
    minHeight: turismoMetrics.touchTarget,
  },
});

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
