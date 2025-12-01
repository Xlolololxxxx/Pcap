import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { NetworkRequest } from "@/store/types";

interface RequestListItemProps {
  request: NetworkRequest;
  onPress: () => void;
}

const getMethodColor = (method: string): string => {
  switch (method.toUpperCase()) {
    case "GET":
      return Colors.dark.methodGet;
    case "POST":
      return Colors.dark.methodPost;
    case "PUT":
      return Colors.dark.methodPut;
    case "DELETE":
      return Colors.dark.methodDelete;
    case "PATCH":
      return Colors.dark.methodPatch;
    default:
      return Colors.dark.textSecondary;
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export function RequestListItem({ request, onPress }: RequestListItemProps) {
  const { theme } = useTheme();
  const hasAuth = request.headers["authorization"] || request.headers["Authorization"];
  const hasCookie = request.headers["cookie"] || request.headers["Cookie"];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.backgroundTertiary : theme.backgroundDefault,
          borderBottomColor: theme.backgroundSecondary,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.leftContent}>
        <View style={styles.topRow}>
          <View
            style={[
              styles.methodBadge,
              { backgroundColor: getMethodColor(request.method) },
            ]}
          >
            <ThemedText style={styles.methodText}>{request.method}</ThemedText>
          </View>
          <View style={styles.badges}>
            {request.protocol === "HTTPS" ? (
              <Feather name="lock" size={12} color={Colors.dark.accent} style={styles.icon} />
            ) : (
              <Feather name="unlock" size={12} color={Colors.dark.accentYellow} style={styles.icon} />
            )}
            {hasAuth ? (
              <View style={[styles.badge, { backgroundColor: Colors.dark.accentYellow + "30" }]}>
                <ThemedText style={[styles.badgeText, { color: Colors.dark.accentYellow }]}>AUTH</ThemedText>
              </View>
            ) : null}
            {hasCookie ? (
              <View style={[styles.badge, { backgroundColor: Colors.dark.accentBlue + "30" }]}>
                <ThemedText style={[styles.badgeText, { color: Colors.dark.accentBlue }]}>COOKIE</ThemedText>
              </View>
            ) : null}
          </View>
        </View>
        <ThemedText
          style={[styles.host, { color: theme.text }]}
          numberOfLines={1}
        >
          {request.host}
        </ThemedText>
        <ThemedText
          style={[styles.path, { color: theme.textSecondary, fontFamily: Fonts?.mono }]}
          numberOfLines={1}
        >
          {request.path}
        </ThemedText>
      </View>
      <View style={styles.rightContent}>
        <ThemedText style={[styles.timestamp, { color: theme.textTertiary }]}>
          {formatTimestamp(request.timestamp)}
        </ThemedText>
        <Feather name="chevron-right" size={16} color={theme.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  leftContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  methodText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  host: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  path: {
    fontSize: 12,
  },
  rightContent: {
    alignItems: "flex-end",
  },
  timestamp: {
    fontSize: 11,
    marginBottom: 4,
  },
});
