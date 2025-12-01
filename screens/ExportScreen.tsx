import React, { useState } from "react";
import { View, StyleSheet, Pressable, Share, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { CaptureStackParamList } from "@/navigation/CaptureStackNavigator";

type ExportScreenProps = {
  navigation: NativeStackNavigationProp<CaptureStackParamList, "Export">;
};

export default function ExportScreen({ navigation }: ExportScreenProps) {
  const { theme } = useTheme();
  const { exportAsJSON, exportAsHAR, requests } = useAppStore();
  const [exportFormat, setExportFormat] = useState<"json" | "har">("json");

  const handleExport = async (format: "json" | "har") => {
    if (requests.length === 0) {
      Alert.alert("No Data", "No requests to export. Start capturing first.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const data = format === "json" ? exportAsJSON() : exportAsHAR();
      const filename = `pcapdroid-export-${Date.now()}.${format === "json" ? "json" : "har"}`;

      if (Platform.OS === "web") {
        const element = document.createElement("a");
        element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(data)}`);
        element.setAttribute("download", filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      } else {
        await Share.share({
          message: data,
          title: `PCAPdroid Export - ${format.toUpperCase()}`,
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not export data.");
    }
  };

  const renderExportOption = (
    format: "json" | "har",
    title: string,
    description: string,
    icon: string
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.exportOption,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={() => handleExport(format)}
    >
      <View style={[styles.iconBox, { backgroundColor: Colors.dark.accent + "20" }]}>
        <Feather name={icon as any} size={24} color={Colors.dark.accent} />
      </View>
      <View style={styles.optionContent}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={[styles.optionDescription, { color: theme.textTertiary }]}>
          {description}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={theme.textTertiary} />
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: Colors.dark.accent }]}>
          Export Data
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {requests.length} requests available
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Select Format
        </ThemedText>

        {renderExportOption(
          "json",
          "JSON Export",
          "Raw request data with full session information",
          "code"
        )}

        {renderExportOption(
          "har",
          "HAR Format",
          "HTTP Archive format for compatibility with other tools",
          "archive"
        )}
      </View>

      <View style={[styles.infoCard, { backgroundColor: Colors.dark.accent + "10" }]}>
        <Feather name="info" size={16} color={Colors.dark.accent} />
        <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
          Exported data includes headers, bodies, responses, and session credentials for offline analysis.
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
});
