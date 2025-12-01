import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Share,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { SessionsStackParamList } from "@/navigation/SessionsStackNavigator";

type SessionDetailScreenProps = {
  navigation: NativeStackNavigationProp<SessionsStackParamList, "SessionDetail">;
  route: RouteProp<SessionsStackParamList, "SessionDetail">;
};

export default function SessionDetailScreen({
  navigation,
  route,
}: SessionDetailScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sessions } = useAppStore();
  const host = route.params.host;
  const session = sessions[host];

  const handleExport = async () => {
    if (!session) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const exportData = {
      host: session.host,
      lastUpdated: new Date(session.lastUpdated).toISOString(),
      authTokens: session.authTokens,
      cookies: session.cookies,
      headers: session.headers,
    };

    try {
      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: `Session Data - ${host}`,
      });
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  if (!session) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFound}>
          <ThemedText>Session not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const renderSection = (
    title: string,
    icon: string,
    color: string,
    content: React.ReactNode
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon as any} size={14} color={color} />
        </View>
        <ThemedText style={[styles.sectionTitle, { color }]}>{title}</ThemedText>
      </View>
      {content}
    </View>
  );

  return (
    <ScreenScrollView>
      <View style={[styles.header, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.hostRow}>
          <View style={[styles.hostIcon, { backgroundColor: Colors.dark.accentYellow + "20" }]}>
            <Feather name="key" size={24} color={Colors.dark.accentYellow} />
          </View>
          <View style={styles.hostInfo}>
            <ThemedText style={styles.hostText} numberOfLines={2}>
              {session.host}
            </ThemedText>
            <ThemedText style={[styles.updateText, { color: theme.textTertiary }]}>
              Last updated: {new Date(session.lastUpdated).toLocaleString()}
            </ThemedText>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.exportButton,
            { backgroundColor: Colors.dark.accent, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleExport}
        >
          <Feather name="share-2" size={16} color="#000" />
          <ThemedText style={styles.exportText}>Export</ThemedText>
        </Pressable>
      </View>

      {session.authTokens.length > 0
        ? renderSection(
            "Auth Tokens",
            "shield",
            Colors.dark.accentYellow,
            <View style={styles.tokenList}>
              {session.authTokens.map((token, index) => (
                <View
                  key={index}
                  style={[styles.tokenCard, { backgroundColor: theme.backgroundDefault }]}
                >
                  <View style={styles.tokenHeader}>
                    <ThemedText style={[styles.tokenIndex, { color: theme.textTertiary }]}>
                      Token {index + 1}
                    </ThemedText>
                    <Pressable
                      style={({ pressed }) => [
                        styles.copyButton,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={async () => {
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        try {
                          await Share.share({ message: token });
                        } catch {}
                      }}
                    >
                      <Feather name="copy" size={14} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                  <ThemedText
                    style={[styles.tokenValue, { fontFamily: Fonts?.mono }]}
                    numberOfLines={4}
                  >
                    {token}
                  </ThemedText>
                </View>
              ))}
            </View>
          )
        : null}

      {Object.keys(session.cookies).length > 0
        ? renderSection(
            "Cookies",
            "database",
            Colors.dark.accentBlue,
            <View style={[styles.dataCard, { backgroundColor: theme.backgroundDefault }]}>
              {Object.entries(session.cookies).map(([key, value]) => (
                <View
                  key={key}
                  style={[styles.dataRow, { borderBottomColor: theme.backgroundSecondary }]}
                >
                  <ThemedText style={[styles.dataKey, { color: Colors.dark.accentBlue }]}>
                    {key}
                  </ThemedText>
                  <ThemedText
                    style={[styles.dataValue, { fontFamily: Fonts?.mono }]}
                    numberOfLines={2}
                  >
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>
          )
        : null}

      {Object.keys(session.headers).length > 0
        ? renderSection(
            "Stored Headers",
            "list",
            Colors.dark.accent,
            <View style={[styles.dataCard, { backgroundColor: theme.backgroundDefault }]}>
              {Object.entries(session.headers).map(([key, value]) => (
                <View
                  key={key}
                  style={[styles.dataRow, { borderBottomColor: theme.backgroundSecondary }]}
                >
                  <ThemedText style={[styles.dataKey, { color: Colors.dark.accent }]}>
                    {key}
                  </ThemedText>
                  <ThemedText
                    style={[styles.dataValue, { fontFamily: Fonts?.mono }]}
                    numberOfLines={2}
                  >
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>
          )
        : null}

      {session.authTokens.length === 0 &&
      Object.keys(session.cookies).length === 0 &&
      Object.keys(session.headers).length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={theme.textTertiary} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            No session data stored for this host
          </ThemedText>
        </View>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  hostIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  hostInfo: {
    flex: 1,
  },
  hostText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  updateText: {
    fontSize: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  exportText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tokenList: {
    gap: Spacing.sm,
  },
  tokenCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  tokenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  tokenIndex: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  copyButton: {
    padding: Spacing.xs,
  },
  tokenValue: {
    fontSize: 12,
  },
  dataCard: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  dataRow: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  dataKey: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
