import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { CaptureStackParamList } from "@/navigation/CaptureStackNavigator";
import { FilterConfig } from "@/store/types";

type FiltersScreenProps = {
  navigation: NativeStackNavigationProp<CaptureStackParamList, "Filters">;
};

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const PROTOCOLS = ["HTTP", "HTTPS"];

export default function FiltersScreen({ navigation }: FiltersScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { filters, updateFilters } = useAppStore();

  const [localFilters, setLocalFilters] = useState<FilterConfig>(filters);
  const [ipInput, setIpInput] = useState("");
  const [hostnameInput, setHostnameInput] = useState("");
  const [endpointInput, setEndpointInput] = useState("");

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSave = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await updateFilters(localFilters);
    navigation.goBack();
  };

  const handleReset = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const emptyFilters: FilterConfig = {
      ipAddresses: [],
      hostnames: [],
      protocols: [],
      endpoints: [],
      methods: [],
    };
    setLocalFilters(emptyFilters);
    await updateFilters(emptyFilters);
  };

  const addChip = (type: keyof FilterConfig, value: string) => {
    if (!value.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const current = localFilters[type] as string[];
    if (!current.includes(value.trim())) {
      setLocalFilters({
        ...localFilters,
        [type]: [...current, value.trim()],
      });
    }
  };

  const removeChip = (type: keyof FilterConfig, value: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const current = localFilters[type] as string[];
    setLocalFilters({
      ...localFilters,
      [type]: current.filter((v) => v !== value),
    });
  };

  const toggleArrayItem = (type: keyof FilterConfig, value: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const current = localFilters[type] as string[];
    if (current.includes(value)) {
      setLocalFilters({
        ...localFilters,
        [type]: current.filter((v) => v !== value),
      });
    } else {
      setLocalFilters({
        ...localFilters,
        [type]: [...current, value],
      });
    }
  };

  const renderChips = (type: keyof FilterConfig) => {
    const items = localFilters[type] as string[];
    if (items.length === 0) return null;

    return (
      <View style={styles.chipsContainer}>
        {items.map((item) => (
          <View
            key={item}
            style={[styles.chip, { backgroundColor: Colors.dark.accent + "30", borderColor: Colors.dark.accent }]}
          >
            <ThemedText style={[styles.chipText, { color: Colors.dark.accent }]}>
              {item}
            </ThemedText>
            <Pressable
              style={styles.chipClose}
              onPress={() => removeChip(type, item)}
            >
              <Feather name="x" size={12} color={Colors.dark.accent} />
            </Pressable>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScreenKeyboardAwareScrollView
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          IP Addresses
        </ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                fontFamily: Fonts?.mono,
              },
            ]}
            placeholder="Enter IP address"
            placeholderTextColor={theme.textTertiary}
            value={ipInput}
            onChangeText={setIpInput}
            onSubmitEditing={() => {
              addChip("ipAddresses", ipInput);
              setIpInput("");
            }}
            keyboardType="numeric"
          />
          <Pressable
            style={[styles.addButton, { backgroundColor: Colors.dark.accent }]}
            onPress={() => {
              addChip("ipAddresses", ipInput);
              setIpInput("");
            }}
          >
            <Feather name="plus" size={20} color="#000" />
          </Pressable>
        </View>
        {renderChips("ipAddresses")}
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Hostnames
        </ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="Enter hostname"
            placeholderTextColor={theme.textTertiary}
            value={hostnameInput}
            onChangeText={setHostnameInput}
            onSubmitEditing={() => {
              addChip("hostnames", hostnameInput);
              setHostnameInput("");
            }}
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.addButton, { backgroundColor: Colors.dark.accent }]}
            onPress={() => {
              addChip("hostnames", hostnameInput);
              setHostnameInput("");
            }}
          >
            <Feather name="plus" size={20} color="#000" />
          </Pressable>
        </View>
        {renderChips("hostnames")}
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Protocols
        </ThemedText>
        <View style={styles.toggleGroup}>
          {PROTOCOLS.map((protocol) => {
            const isSelected = localFilters.protocols.includes(protocol);
            return (
              <Pressable
                key={protocol}
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: isSelected
                      ? Colors.dark.accent
                      : theme.backgroundSecondary,
                    borderColor: isSelected ? Colors.dark.accent : theme.backgroundTertiary,
                  },
                ]}
                onPress={() => toggleArrayItem("protocols", protocol)}
              >
                <Feather
                  name={protocol === "HTTPS" ? "lock" : "unlock"}
                  size={14}
                  color={isSelected ? "#000" : theme.text}
                  style={styles.toggleIcon}
                />
                <ThemedText
                  style={[
                    styles.toggleText,
                    { color: isSelected ? "#000" : theme.text },
                  ]}
                >
                  {protocol}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Methods
        </ThemedText>
        <View style={styles.toggleGroup}>
          {METHODS.map((method) => {
            const isSelected = localFilters.methods.includes(method);
            const methodColor =
              method === "GET"
                ? Colors.dark.methodGet
                : method === "POST"
                  ? Colors.dark.methodPost
                  : method === "PUT"
                    ? Colors.dark.methodPut
                    : method === "DELETE"
                      ? Colors.dark.methodDelete
                      : Colors.dark.methodPatch;

            return (
              <Pressable
                key={method}
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: isSelected ? methodColor : theme.backgroundSecondary,
                    borderColor: isSelected ? methodColor : theme.backgroundTertiary,
                  },
                ]}
                onPress={() => toggleArrayItem("methods", method)}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    { color: isSelected ? "#fff" : theme.text },
                  ]}
                >
                  {method}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Endpoint Paths
        </ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                fontFamily: Fonts?.mono,
              },
            ]}
            placeholder="Enter path (e.g., /api/)"
            placeholderTextColor={theme.textTertiary}
            value={endpointInput}
            onChangeText={setEndpointInput}
            onSubmitEditing={() => {
              addChip("endpoints", endpointInput);
              setEndpointInput("");
            }}
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.addButton, { backgroundColor: Colors.dark.accent }]}
            onPress={() => {
              addChip("endpoints", endpointInput);
              setEndpointInput("");
            }}
          >
            <Feather name="plus" size={20} color="#000" />
          </Pressable>
        </View>
        {renderChips("endpoints")}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleReset}
        >
          <Feather name="refresh-cw" size={16} color={theme.text} style={styles.buttonIcon} />
          <ThemedText style={styles.resetButtonText}>Reset All</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: Colors.dark.accent, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleSave}
        >
          <Feather name="check" size={16} color="#000" style={styles.buttonIcon} />
          <ThemedText style={styles.saveButtonText}>Apply Filters</ThemedText>
        </Pressable>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing["3xl"],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipClose: {
    marginLeft: Spacing.xs,
    padding: 2,
  },
  toggleGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleIcon: {
    marginRight: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
});
