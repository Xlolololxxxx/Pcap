import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RequestListItem } from "@/components/RequestListItem";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { HostsStackParamList } from "@/navigation/HostsStackNavigator";
import { NetworkRequest } from "@/store/types";

type HostDetailScreenProps = {
  navigation: NativeStackNavigationProp<HostsStackParamList, "HostDetail">;
  route: RouteProp<HostsStackParamList, "HostDetail">;
};

export default function HostDetailScreen({
  navigation,
  route,
}: HostDetailScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { requests, sessions } = useAppStore();
  const host = route.params.host;

  const hostRequests = useMemo(
    () => requests.filter((r) => r.host === host).sort((a, b) => b.timestamp - a.timestamp),
    [requests, host]
  );

  const hostSession = sessions[host];

  const stats = useMemo(() => {
    const methods: Record<string, number> = {};
    const protocols: Record<string, number> = {};

    hostRequests.forEach((r) => {
      methods[r.method] = (methods[r.method] || 0) + 1;
      protocols[r.protocol] = (protocols[r.protocol] || 0) + 1;
    });

    return { methods, protocols };
  }, [hostRequests]);

  const renderItem = useCallback(
    ({ item }: { item: NetworkRequest }) => (
      <RequestListItem
        request={item}
        onPress={() => navigation.navigate("RequestDetail", { requestId: item.id })}
      />
    ),
    [navigation]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: Colors.dark.accent }]}>
              {hostRequests.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
              Requests
            </ThemedText>
          </View>
          {hostSession ? (
            <>
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.dark.accentYellow }]}>
                  {hostSession.authTokens.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
                  Auth Tokens
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: Colors.dark.accentBlue }]}>
                  {Object.keys(hostSession.cookies).length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textTertiary }]}>
                  Cookies
                </ThemedText>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.badgesContainer}>
        <View style={styles.badgeSection}>
          <ThemedText style={[styles.badgeSectionTitle, { color: theme.textTertiary }]}>
            Protocols
          </ThemedText>
          <View style={styles.badgeRow}>
            {Object.entries(stats.protocols).map(([protocol, count]) => (
              <View
                key={protocol}
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      protocol === "HTTPS"
                        ? Colors.dark.accent + "20"
                        : Colors.dark.accentYellow + "20",
                  },
                ]}
              >
                <Feather
                  name={protocol === "HTTPS" ? "lock" : "unlock"}
                  size={12}
                  color={protocol === "HTTPS" ? Colors.dark.accent : Colors.dark.accentYellow}
                />
                <ThemedText
                  style={[
                    styles.badgeText,
                    { color: protocol === "HTTPS" ? Colors.dark.accent : Colors.dark.accentYellow },
                  ]}
                >
                  {protocol} ({count})
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.badgeSection}>
          <ThemedText style={[styles.badgeSectionTitle, { color: theme.textTertiary }]}>
            Methods
          </ThemedText>
          <View style={styles.badgeRow}>
            {Object.entries(stats.methods).map(([method, count]) => {
              const color =
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
                <View key={method} style={[styles.methodBadge, { backgroundColor: color }]}>
                  <ThemedText style={styles.methodBadgeText}>
                    {method} ({count})
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <ThemedText style={[styles.listTitle, { color: theme.textSecondary }]}>
        All Requests
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
        No requests for this host
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={hostRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl, paddingTop: headerHeight },
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
    flexGrow: 1,
  },
  header: {
    padding: Spacing.lg,
  },
  statsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.md,
  },
  badgesContainer: {
    marginBottom: Spacing.lg,
  },
  badgeSection: {
    marginBottom: Spacing.md,
  },
  badgeSectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  methodBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  listTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
  },
});
