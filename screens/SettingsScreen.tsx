import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { port, setPort, clearRequests, clearSessions, loadData } = useAppStore();
  const [portInput, setPortInput] = useState(port.toString());

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPortInput(port.toString());
  }, [port]);

  const handleSavePort = async () => {
    const newPort = parseInt(portInput, 10);
    if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
      if (Platform.OS === "web") {
        alert("Please enter a valid port number (1-65535)");
      } else {
        Alert.alert("Invalid Port", "Please enter a valid port number (1-65535)");
      }
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await setPort(newPort);
  };

  const handleClearRequests = () => {
    if (Platform.OS === "web") {
      if (confirm("Clear all captured requests?")) {
        clearRequests();
      }
    } else {
      Alert.alert(
        "Clear Requests",
        "This will delete all captured network requests. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              clearRequests();
            },
          },
        ]
      );
    }
  };

  const handleClearSessions = () => {
    if (Platform.OS === "web") {
      if (confirm("Clear all session data?")) {
        clearSessions();
      }
    } else {
      Alert.alert(
        "Clear Sessions",
        "This will delete all stored credentials and session data. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              clearSessions();
            },
          },
        ]
      );
    }
  };

  const handleClearAll = () => {
    if (Platform.OS === "web") {
      if (confirm("Clear ALL data (requests and sessions)?")) {
        clearRequests();
        clearSessions();
      }
    } else {
      Alert.alert(
        "Clear All Data",
        "This will delete all captured requests and session data. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
            style: "destructive",
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              clearRequests();
              clearSessions();
            },
          },
        ]
      );
    }
  };

  const renderSettingRow = (
    icon: string,
    iconColor: string,
    title: string,
    description: string,
    action: React.ReactNode
  ) => (
    <View style={[styles.settingRow, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "20" }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={[styles.settingDescription, { color: theme.textTertiary }]}>
          {description}
        </ThemedText>
      </View>
      {action}
    </View>
  );

  return (
    <ScreenScrollView>
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Capture Settings
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.portRow}>
            <View style={styles.portLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.dark.accent + "20" }]}>
                <Feather name="radio" size={18} color={Colors.dark.accent} />
              </View>
              <View style={styles.portInfo}>
                <ThemedText style={styles.settingTitle}>Capture Port</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: theme.textTertiary }]}>
                  Port to receive PCAPdroid data
                </ThemedText>
              </View>
            </View>
            <View style={styles.portInputGroup}>
              <TextInput
                style={[
                  styles.portInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    fontFamily: Fonts?.mono,
                  },
                ]}
                value={portInput}
                onChangeText={setPortInput}
                keyboardType="number-pad"
                maxLength={5}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: Colors.dark.accent, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={handleSavePort}
              >
                <Feather name="check" size={16} color="#000" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Data Management
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              { borderBottomColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleClearRequests}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.dark.accentYellow + "20" }]}>
                <Feather name="inbox" size={18} color={Colors.dark.accentYellow} />
              </View>
              <View>
                <ThemedText style={styles.settingTitle}>Clear Requests</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: theme.textTertiary }]}>
                  Delete all captured network requests
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              { borderBottomColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleClearSessions}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.dark.accentBlue + "20" }]}>
                <Feather name="key" size={18} color={Colors.dark.accentBlue} />
              </View>
              <View>
                <ThemedText style={styles.settingTitle}>Clear Sessions</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: theme.textTertiary }]}>
                  Delete all stored credentials and cookies
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleClearAll}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.dark.accentRed + "20" }]}>
                <Feather name="trash-2" size={18} color={Colors.dark.accentRed} />
              </View>
              <View>
                <ThemedText style={[styles.settingTitle, { color: Colors.dark.accentRed }]}>
                  Clear All Data
                </ThemedText>
                <ThemedText style={[styles.settingDescription, { color: theme.textTertiary }]}>
                  Delete all requests and session data
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          About
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.aboutRow, { borderBottomColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.aboutLabel, { color: theme.textTertiary }]}>
              Version
            </ThemedText>
            <ThemedText style={styles.aboutValue}>1.0.0</ThemedText>
          </View>
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutLabel, { color: theme.textTertiary }]}>
              PCAPdroid Analyzer
            </ThemedText>
            <ThemedText style={[styles.aboutValue, { color: Colors.dark.accent }]}>
              Network Traffic Analysis
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Feather name="info" size={16} color={theme.textTertiary} />
        <ThemedText style={[styles.infoText, { color: theme.textTertiary }]}>
          Configure PCAPdroid to export traffic using the UDP exporter feature, pointing to this device on port {port}.
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  portRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  portLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  portInfo: {
    flex: 1,
  },
  portInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  portInput: {
    width: 80,
    height: 36,
    textAlign: "center",
    borderRadius: BorderRadius.xs,
    fontSize: 14,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
});
