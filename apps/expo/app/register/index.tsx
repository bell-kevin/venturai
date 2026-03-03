import { api } from "@venturai/backend";
import type { Id } from "@venturai/backend/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { initNfc, nfcAssetUrl, writeUrlToNfcTag } from "../../lib/nfc";
import { theme } from "../../lib/theme";
import { uploadPhotoFromUri } from "../../lib/uploadPhoto";

type Step =
  | "photo"
  | "suggesting"
  | "edit"
  | "creating"
  | "template"
  | "templateEdit"
  | "write"
  | "done";

function NfcWriteStep({
  assetId,
  onSuccess,
  onSkip,
}: {
  assetId: string;
  onSuccess: () => void;
  onSkip?: () => void;
}) {
  const [status, setStatus] = useState<"waiting" | "success" | "error">(
    "waiting",
  );
  const nfcUrl = nfcAssetUrl(assetId);

  const attemptWrite = useCallback(async () => {
    setStatus("waiting");
    const ok = await writeUrlToNfcTag(nfcUrl);
    setStatus(ok ? "success" : "error");
    if (ok) onSuccess();
  }, [nfcUrl, onSuccess]);

  useEffect(() => {
    attemptWrite();
  }, [attemptWrite]);

  if (status === "success") {
    return null; // Parent will show done step
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Write to NFC tag</Text>
      <Text style={styles.subtitle}>
        {status === "error"
          ? "Could not write to the tag. Hold the tag steady and try again."
          : "Hold your phone near the NFC tag to write the asset URL."}
      </Text>
      {status === "waiting" && (
        <ActivityIndicator size="large" style={styles.nfcSpinner} />
      )}
      {status === "error" && (
        <Pressable style={styles.button} onPress={attemptWrite}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
      {onSkip && (
        <Pressable
          style={[styles.button, styles.buttonOutline]}
          onPress={onSkip}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            Skip for now
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Register a new asset.
 * Flow: 1) Take photo 2) AI suggests details 3) User edits 4) Create
 * 5) Optional template 6) Scan NFC tag to write venturai.app/a/<assetId>
 */
export default function RegisterAssetScreen() {
  const router = useRouter();

  const makeClientId = useCallback(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  const [step, setStep] = useState<Step>("photo");
  const [nfcStatus, setNfcStatus] = useState<
    "checking" | "supported" | "unsupported"
  >("checking");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    maintenanceGroupId: "",
    manufacturer: "",
    model: "",
    serial: "",
  });
  const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    photoDescriptions: Array<{ id: string; value: string }>;
    additionalQuestions: Array<{
      id: string;
      key: string;
      label: string;
      type: "text" | "number" | "boolean";
    }>;
  }>({
    photoDescriptions: [
      { id: makeClientId(), value: "Wide shot" },
      { id: makeClientId(), value: "Close-up of area of concern" },
    ],
    additionalQuestions: [
      {
        id: makeClientId(),
        key: "condition",
        label: "Overall condition (1-5)",
        type: "number",
      },
    ],
  });

  const adminOrgs = useQuery(api.org_members.getOrgsUserIsAdminOf);
  const orgIdToUse = selectedOrgId ?? adminOrgs?.[0]?._id ?? null;
  const maintenanceGroups = useQuery(
    api.maintenance_groups.listByOrg,
    selectedOrgId ? { orgId: selectedOrgId as Id<"orgs"> } : "skip",
  );
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const suggestFromPhoto = useAction(api.assets.actions.suggestFromPhoto);
  const createAsset = useMutation(api.assets.mutations.create);
  const createTemplate = useMutation(api.templates.create);
  const updateAssetTemplate = useMutation(api.assets.mutations.updateTemplate);

  const openCameraAndContinue = useCallback(async () => {
    if (!orgIdToUse) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera required",
        "Venturai needs camera access to photograph assets.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const uri = result.assets[0].uri;
    setSelectedOrgId(orgIdToUse);
    setStep("suggesting");

    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadPhotoFromUri(uri, uploadUrl);
      const suggestResult = await suggestFromPhoto({
        orgId: orgIdToUse as Id<"orgs">,
        photoStorageId: storageId,
      });
      setForm({
        name: suggestResult.name,
        maintenanceGroupId: suggestResult.maintenanceGroupId,
        manufacturer: suggestResult.manufacturer ?? "",
        model: suggestResult.model ?? "",
        serial: suggestResult.serial ?? "",
      });
      setStep("edit");
    } catch (err) {
      setStep("photo");
      const msg =
        err instanceof Error ? err.message : "Could not analyze photo.";
      console.error("[Register] suggestFromPhoto failed:", err);
      Alert.alert(
        "Error",
        msg.includes("OPENAI_API_KEY")
          ? "AI is not configured. Set OPENAI_API_KEY in Convex dashboard."
          : msg.includes("maintenance group")
            ? "Create a maintenance group in your org first."
            : msg.includes("Could not resolve image")
              ? "Image upload may have failed. Try again."
              : "Could not analyze photo. Please try again.",
      );
    }
  }, [orgIdToUse, generateUploadUrl, suggestFromPhoto]);

  // Initialize NFC on mount
  useEffect(() => {
    let mounted = true;
    initNfc().then((status) => {
      if (mounted) {
        setNfcStatus(status === "supported" ? "supported" : "unsupported");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (adminOrgs === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }
  if (!adminOrgs?.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cannot register</Text>
        <Text style={styles.subtitle}>
          Sign in and create an org, or have an admin add you to one.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.replace("/" as never)}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (step === "photo") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Register asset</Text>
        <Text style={styles.subtitle}>
          Take a photo of the asset. AI will suggest details, then you can edit
          and create the asset. You'll write the tag at the end.
        </Text>

        {adminOrgs && adminOrgs.length > 1 && (
          <>
            <Text style={styles.label}>Organization</Text>
            <View style={styles.groupList}>
              {adminOrgs.map((org) => (
                <Pressable
                  key={org._id}
                  style={[
                    styles.groupOption,
                    orgIdToUse === org._id && styles.groupOptionSelected,
                  ]}
                  onPress={() => setSelectedOrgId(org._id)}
                >
                  <Text style={styles.groupName}>{org.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable style={styles.button} onPress={openCameraAndContinue}>
          <Text style={styles.buttonText}>Take photo</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonOutline]}
          onPress={() => router.replace("/" as never)}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    );
  }

  if (step === "suggesting") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={styles.hint}>AI is analyzing the photo...</Text>
      </View>
    );
  }

  if (step === "edit") {
    const groups = maintenanceGroups ?? [];

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Edit asset details</Text>
        <Text style={styles.subtitle}>Review and adjust AI suggestions.</Text>

        {groups.length > 0 && (
          <>
            <Text style={styles.label}>Maintenance group</Text>
            <View style={styles.groupList}>
              {groups.map((g) => (
                <Pressable
                  key={g._id}
                  style={[
                    styles.groupOption,
                    (form.maintenanceGroupId || groups[0]?._id) === g._id &&
                      styles.groupOptionSelected,
                  ]}
                  onPress={() =>
                    setForm((f) => ({ ...f, maintenanceGroupId: g._id }))
                  }
                >
                  <Text style={styles.groupName}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="Asset name"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={styles.label}>Manufacturer</Text>
        <TextInput
          style={styles.input}
          value={form.manufacturer}
          onChangeText={(v) => setForm((f) => ({ ...f, manufacturer: v }))}
          placeholder="Optional"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          value={form.model}
          onChangeText={(v) => setForm((f) => ({ ...f, model: v }))}
          placeholder="Optional"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={styles.label}>Serial</Text>
        <TextInput
          style={styles.input}
          value={form.serial}
          onChangeText={(v) => setForm((f) => ({ ...f, serial: v }))}
          placeholder="Optional"
          placeholderTextColor={theme.textMuted}
        />

        <Pressable
          style={styles.button}
          disabled={!form.maintenanceGroupId && !groups[0]?._id}
          onPress={async () => {
            if (!selectedOrgId) return;
            const mgId = form.maintenanceGroupId || groups[0]?._id;
            if (!mgId) return;
            setStep("creating");
            try {
              const assetId = await createAsset({
                orgId: selectedOrgId as Id<"orgs">,
                maintenanceGroupId: mgId as Id<"maintenanceGroups">,
                name: form.name,
                manufacturer: form.manufacturer || undefined,
                model: form.model || undefined,
                serial: form.serial || undefined,
              });
              setCreatedAssetId(assetId);
              setStep("template");
            } catch {
              setStep("edit");
            }
          }}
        >
          <Text style={styles.buttonText}>Create asset</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (step === "creating") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={styles.hint}>Creating asset...</Text>
      </View>
    );
  }

  if (step === "template") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Assessment template</Text>
        <Text style={styles.subtitle}>
          Optionally define photo descriptions and questions for inspections.
          Skip to use defaults (at least 1 photo, optional notes).
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => setStep("templateEdit")}
        >
          <Text style={styles.buttonText}>Configure template (recommended)</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep("write")}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Skip for now</Text>
        </Pressable>
      </View>
    );
  }

  if (step === "templateEdit") {
    const qTypes = ["text", "number", "boolean"] as const;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Edit template</Text>
        <Text style={styles.subtitle}>
          What photos should inspectors take? What questions to ask?
        </Text>

        <Text style={styles.label}>Photo descriptions (one per photo)</Text>
        {templateForm.photoDescriptions.map((desc, i) => (
          <View key={desc.id} style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex1]}
              value={desc.value}
              onChangeText={(v) =>
                setTemplateForm((f) => ({
                  ...f,
                  photoDescriptions: f.photoDescriptions.map((d) =>
                    d.id === desc.id ? { ...d, value: v } : d,
                  ),
                }))
              }
              placeholder={`Photo ${i + 1}`}
              placeholderTextColor={theme.textMuted}
            />
            <Pressable
              style={styles.removeBtn}
              onPress={() =>
                setTemplateForm((f) => ({
                  ...f,
                  photoDescriptions: f.photoDescriptions.filter(
                    (d) => d.id !== desc.id,
                  ),
                }))
              }
            >
              <Text style={styles.removeBtnText}>−</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          style={[styles.button, styles.buttonOutline, styles.smallBtn]}
          onPress={() =>
            setTemplateForm((f) => ({
              ...f,
              photoDescriptions: [
                ...f.photoDescriptions,
                { id: makeClientId(), value: "" },
              ],
            }))
          }
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            + Add photo
          </Text>
        </Pressable>

        <Text style={[styles.label, styles.labelTop]}>Additional questions</Text>
        {templateForm.additionalQuestions.map((q) => (
          <View key={q.id} style={styles.questionRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              value={q.key}
              onChangeText={(v) =>
                setTemplateForm((f) => ({
                  ...f,
                  additionalQuestions: f.additionalQuestions.map((aq) =>
                    aq.id === q.id ? { ...aq, key: v } : aq,
                  ),
                }))
              }
              placeholder="key (snake_case)"
              placeholderTextColor={theme.textMuted}
            />
            <TextInput
              style={[styles.input, styles.flex1]}
              value={q.label}
              onChangeText={(v) =>
                setTemplateForm((f) => ({
                  ...f,
                  additionalQuestions: f.additionalQuestions.map((aq) =>
                    aq.id === q.id ? { ...aq, label: v } : aq,
                  ),
                }))
              }
              placeholder="Label"
              placeholderTextColor={theme.textMuted}
            />
            <View style={styles.typeRow}>
              {qTypes.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.typeChip,
                    q.type === t && styles.typeChipSelected,
                  ]}
                  onPress={() =>
                    setTemplateForm((f) => ({
                      ...f,
                      additionalQuestions: f.additionalQuestions.map((aq) =>
                        aq.id === q.id ? { ...aq, type: t } : aq,
                      ),
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      q.type === t && styles.typeChipTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.removeBtn}
              onPress={() =>
                setTemplateForm((f) => ({
                  ...f,
                  additionalQuestions: f.additionalQuestions.filter(
                    (aq) => aq.id !== q.id,
                  ),
                }))
              }
            >
              <Text style={styles.removeBtnText}>−</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          style={[styles.button, styles.buttonOutline, styles.smallBtn]}
          onPress={() =>
            setTemplateForm((f) => ({
              ...f,
              additionalQuestions: [
                ...f.additionalQuestions,
                { id: makeClientId(), key: "", label: "", type: "text" },
              ],
            }))
          }
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            + Add question
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          disabled={templateForm.photoDescriptions.every((d) => !d.value.trim())}
          onPress={async () => {
            if (!selectedOrgId || !createdAssetId) return;
            const validPhotos = templateForm.photoDescriptions
              .map((d) => d.value.trim())
              .filter(Boolean);
            const validQuestions = templateForm.additionalQuestions
              .filter((q) => q.key.trim() && q.label.trim())
              .map((q) => ({
                key: q.key.trim(),
                label: q.label.trim(),
                type: q.type,
              }));
            if (validPhotos.length === 0) return;

            const templateId = await createTemplate({
              orgId: selectedOrgId as Id<"orgs">,
              name: `Template for ${form.name}`,
              photoDescriptions: validPhotos,
              additionalQuestions: validQuestions,
            });
            await updateAssetTemplate({
              assetId: createdAssetId as Id<"assets">,
              templateId,
            });
            setStep("write");
          }}
        >
          <Text style={styles.buttonText}>Create template</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonOutline]}
          onPress={() => setStep("template")}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            Back
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (step === "write" && createdAssetId) {
    if (nfcStatus === "unsupported") {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>NFC required</Text>
          <Text style={styles.subtitle}>
            This device does not support NFC, or NFC is disabled. Hold the tag
            near your phone to write the asset URL. Use a development build on a
            supported device.
          </Text>
          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.replace("/" as never)}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Skip (asset created)
            </Text>
          </Pressable>
        </View>
      );
    }
    return (
      <NfcWriteStep
        assetId={createdAssetId}
        onSuccess={() => setStep("done")}
        onSkip={() => setStep("done")}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asset registered</Text>
      <Text style={styles.subtitle}>
        Open the asset dashboard to view inspections and details. If you wrote
        the tag, scanning it will open this asset.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() =>
          router.replace(
            (createdAssetId ? `/a/${createdAssetId}` : "/") as never,
          )
        }
      >
        <Text style={styles.buttonText}>Open asset dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: theme.background,
  },
  container: { flex: 1, padding: 24, backgroundColor: theme.background },
  pad: { paddingBottom: 48 },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: theme.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 24,
  },
  nfcSpinner: { marginVertical: 24 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: theme.textMuted,
  },
  labelTop: { marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  flex1: { flex: 1 },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.errorBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.error,
  },
  removeBtnText: { fontSize: 18, color: theme.error, fontWeight: "600" },
  questionRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  typeRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.backgroundElevated,
  },
  typeChipSelected: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
  typeChipText: { fontSize: 12, color: theme.textMuted },
  typeChipTextSelected: { color: theme.accent, fontWeight: "600" },
  smallBtn: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: theme.backgroundElevated,
    color: theme.text,
  },
  hint: { marginTop: 12, fontSize: 14, color: theme.textMuted },
  button: {
    backgroundColor: theme.buttonPrimary,
    paddingVertical: theme.buttonPaddingVertical,
    paddingHorizontal: theme.buttonPaddingHorizontal,
    borderRadius: theme.buttonBorderRadius,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: theme.buttonSecondary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonText: {
    color: theme.background,
    fontSize: theme.buttonFontSize,
    fontWeight: theme.buttonFontWeight,
  },
  buttonTextSecondary: { color: theme.textMuted },
  groupList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  groupOption: {
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.backgroundElevated,
  },
  groupOptionSelected: {
    borderColor: theme.accent,
    backgroundColor: theme.accentGlow,
  },
  groupName: { fontSize: 14, color: theme.text },
});
