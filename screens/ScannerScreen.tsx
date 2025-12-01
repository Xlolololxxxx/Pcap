import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { ScannerStackParamList } from "@/navigation/ScannerStackNavigator";
import { scanForSecrets, SecretMatch, SECRET_PATTERNS } from "@/store/secretPatterns";

type ScannerScreenProps = {
  navigation: NativeStackNavigationProp<ScannerStackParamList, "Scanner">;
};

type FilterType = "all" | "critical" | "high" | "medium" | "low";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SEVERITY_COLORS = {
  critical: Colors.dark.accentRed,
  high: Colors.dark.accentOrange || "#FF9800",
  medium: Colors.dark.accentYellow,
  low: Colors.dark.accentBlue,
};

const CATEGORY_ICONS: Record<string, string> = {
  api_key: "key",
  password: "lock",
  token: "shield",
  certificate: "file-text",
  credential: "user",
  config: "settings",
  cloud: "cloud",
  database: "database",
};

function SeverityBadge({ severity }: { severity: SecretMatch["severity"] }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <View style={[styles.severityBadge, { backgroundColor: color }]}>
      <ThemedText style={styles.severityText}>
        {severity.toUpperCase()}
      </ThemedText>
    </View>
  );
}

function MatchCard({
  match,
  onPress,
}: {
  match: SecretMatch;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const icon = CATEGORY_ICONS[match.category] || "alert-circle";
  const severityColor = SEVERITY_COLORS[match.severity];

  return (
    <AnimatedPressable
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: severityColor + "20" }]}>
            <Feather name={icon as any} size={18} color={severityColor} />
          </View>
          <View style={styles.cardInfo}>
            <ThemedText style={styles.patternName} numberOfLines={1}>
              {match.patternName}
            </ThemedText>
            <ThemedText style={[styles.host, { color: theme.textTertiary }]} numberOfLines={1}>
              {match.host}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardRight}>
          <SeverityBadge severity={match.severity} />
          <Feather name="chevron-right" size={18} color={theme.textTertiary} />
        </View>
      </View>

      <View style={[styles.matchPreview, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText
          style={[styles.matchText, { fontFamily: Fonts?.mono }]}
          numberOfLines={2}
        >
          {match.match}
        </ThemedText>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.locationBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={[styles.locationText, { color: theme.textSecondary }]}>
            {match.location.replace("_", " ")}
          </ThemedText>
        </View>
        <ThemedText style={[styles.timestamp, { color: theme.textTertiary }]}>
          {new Date(match.timestamp).toLocaleTimeString()}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

function FilterChip({
  label,
  count,
  isActive,
  color,
  onPress,
}: {
  label: string;
  count: number;
  isActive: boolean;
  color?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive
            ? (color || Colors.dark.accent) + "30"
            : theme.backgroundDefault,
          borderColor: isActive ? color || Colors.dark.accent : theme.backgroundSecondary,
        },
      ]}
      onPress={onPress}
    >
      <ThemedText
        style={[
          styles.filterChipText,
          { color: isActive ? color || Colors.dark.accent : theme.textSecondary },
        ]}
      >
        {label}
      </ThemedText>
      <View
        style={[
          styles.filterChipCount,
          { backgroundColor: isActive ? color || Colors.dark.accent : theme.backgroundSecondary },
        ]}
      >
        <ThemedText
          style={[styles.filterChipCountText, { color: isActive ? "#000" : theme.textSecondary }]}
        >
          {count}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function ScannerScreen({ navigation }: ScannerScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { requests } = useAppStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [isScanning, setIsScanning] = useState(false);

  const allMatches = useMemo(() => {
    setIsScanning(true);
    const matches: SecretMatch[] = [];

    requests.forEach((request) => {
      const headersString = Object.entries(request.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      matches.push(
        ...scanForSecrets(headersString, "headers", request.id, request.host, request.timestamp)
      );

      if (request.body) {
        matches.push(
          ...scanForSecrets(request.body, "body", request.id, request.host, request.timestamp)
        );
      }

      if (request.path) {
        matches.push(
          ...scanForSecrets(request.path, "path", request.id, request.host, request.timestamp)
        );
      }

      if (request.response) {
        const respHeadersString = Object.entries(request.response.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        matches.push(
          ...scanForSecrets(
            respHeadersString,
            "response_headers",
            request.id,
            request.host,
            request.timestamp
          )
        );

        if (request.response.body) {
          matches.push(
            ...scanForSecrets(
              request.response.body,
              "response_body",
              request.id,
              request.host,
              request.timestamp
            )
          );
        }
      }
    });

    setIsScanning(false);
    return matches.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.timestamp - a.timestamp;
    });
  }, [requests]);

  const stats = useMemo(() => {
    return {
      critical: allMatches.filter((m) => m.severity === "critical").length,
      high: allMatches.filter((m) => m.severity === "high").length,
      medium: allMatches.filter((m) => m.severity === "medium").length,
      low: allMatches.filter((m) => m.severity === "low").length,
    };
  }, [allMatches]);

  const filteredMatches = useMemo(() => {
    if (filter === "all") return allMatches;
    return allMatches.filter((m) => m.severity === filter);
  }, [allMatches, filter]);

  const renderItem = useCallback(
    ({ item }: { item: SecretMatch }) => (
      <MatchCard
        match={item}
        onPress={() => navigation.navigate("ScanResultDetail", { matchId: item.id })}
      />
    ),
    [navigation]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: SEVERITY_COLORS.critical }]} />
            <ThemedText style={[styles.statValue, { color: SEVERITY_COLORS.critical }]}>
              {stats.critical}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
              Critical
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: SEVERITY_COLORS.high }]} />
            <ThemedText style={[styles.statValue, { color: SEVERITY_COLORS.high }]}>
              {stats.high}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
              High
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: SEVERITY_COLORS.medium }]} />
            <ThemedText style={[styles.statValue, { color: SEVERITY_COLORS.medium }]}>
              {stats.medium}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
              Medium
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: SEVERITY_COLORS.low }]} />
            <ThemedText style={[styles.statValue, { color: SEVERITY_COLORS.low }]}>
              {stats.low}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
              Low
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FilterChip
          label="All"
          count={allMatches.length}
          isActive={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <FilterChip
          label="Critical"
          count={stats.critical}
          isActive={filter === "critical"}
          color={SEVERITY_COLORS.critical}
          onPress={() => setFilter("critical")}
        />
        <FilterChip
          label="High"
          count={stats.high}
          isActive={filter === "high"}
          color={SEVERITY_COLORS.high}
          onPress={() => setFilter("high")}
        />
        <FilterChip
          label="Medium"
          count={stats.medium}
          isActive={filter === "medium"}
          color={SEVERITY_COLORS.medium}
          onPress={() => setFilter("medium")}
        />
      </View>

      <View style={styles.infoRow}>
        <Feather name="shield" size={14} color={theme.textTertiary} />
        <ThemedText style={[styles.infoText, { color: theme.textTertiary }]}>
          Scanning {requests.length} requests with {SECRET_PATTERNS.length} patterns
        </ThemedText>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isScanning ? (
        <>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            Scanning requests...
          </ThemedText>
        </>
      ) : requests.length === 0 ? (
        <>
          <Feather name="shield" size={64} color={theme.textTertiary} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            No requests to scan
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            Capture network traffic to detect secrets
          </ThemedText>
        </>
      ) : (
        <>
          <Feather name="check-circle" size={64} color={Colors.dark.accent} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            No secrets detected
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            Your traffic appears clean
          </ThemedText>
        </>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={filteredMatches}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl, paddingTop: headerHeight + Spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.md,
  },
  statsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingLeft: Spacing.sm,
    paddingRight: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterChipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 12,
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  patternName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  host: {
    fontSize: 12,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  matchPreview: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  matchText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationText: {
    fontSize: 10,
    textTransform: "capitalize",
  },
  timestamp: {
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
