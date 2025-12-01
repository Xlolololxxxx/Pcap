import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
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
import { HostsStackParamList } from "@/navigation/HostsStackNavigator";

type HostsScreenProps = {
  navigation: NativeStackNavigationProp<HostsStackParamList, "Hosts">;
};

interface HostData {
  host: string;
  requests: any[];
  lastActivity: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function HostCard({
  item,
  onPress,
  hasSession,
}: {
  item: HostData;
  onPress: () => void;
  hasSession: boolean;
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

  const protocols = new Set(item.requests.map((r) => r.protocol));
  const methods = new Set(item.requests.map((r) => r.method));

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

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
          <View style={[styles.hostIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="server" size={18} color={Colors.dark.accent} />
          </View>
          <View style={styles.hostInfo}>
            <ThemedText style={styles.hostname} numberOfLines={1}>
              {item.host}
            </ThemedText>
            <ThemedText style={[styles.lastActivity, { color: theme.textTertiary }]}>
              {formatTime(item.lastActivity)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardRight}>
          {hasSession ? (
            <View style={[styles.sessionBadge, { backgroundColor: Colors.dark.accentYellow }]}>
              <Feather name="key" size={10} color="#000" />
            </View>
          ) : null}
          <View style={[styles.countBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={styles.countText}>{item.requests.length}</ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textTertiary} />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.badges}>
          {Array.from(protocols).map((protocol) => (
            <View
              key={protocol}
              style={[
                styles.protocolBadge,
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
                size={10}
                color={protocol === "HTTPS" ? Colors.dark.accent : Colors.dark.accentYellow}
              />
              <ThemedText
                style={[
                  styles.protocolText,
                  { color: protocol === "HTTPS" ? Colors.dark.accent : Colors.dark.accentYellow },
                ]}
              >
                {protocol}
              </ThemedText>
            </View>
          ))}
          {Array.from(methods)
            .slice(0, 3)
            .map((method) => {
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
                <View
                  key={method}
                  style={[styles.methodBadge, { backgroundColor: color }]}
                >
                  <ThemedText style={styles.methodText}>{method}</ThemedText>
                </View>
              );
            })}
          {methods.size > 3 ? (
            <ThemedText style={[styles.moreText, { color: theme.textTertiary }]}>
              +{methods.size - 3}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function HostsScreen({ navigation }: HostsScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { loadData, getHostsWithRequests, sessions } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hosts = getHostsWithRequests();

  const filteredHosts = searchQuery
    ? hosts.filter((h) =>
        h.host.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : hosts;

  const renderItem = useCallback(
    ({ item }: { item: HostData }) => (
      <HostCard
        item={item}
        onPress={() => navigation.navigate("HostDetail", { host: item.host })}
        hasSession={!!sessions[item.host]}
      />
    ),
    [navigation, sessions]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="server" size={64} color={theme.textTertiary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        No hosts captured yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
        Start capturing to see hosts
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.backgroundDefault, marginTop: headerHeight },
        ]}
      >
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="search" size={16} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search hosts..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={16} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredHosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.host}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 14,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
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
  hostIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  hostInfo: {
    flex: 1,
  },
  hostname: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  lastActivity: {
    fontSize: 12,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sessionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardFooter: {
    marginTop: Spacing.sm,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  protocolBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  protocolText: {
    fontSize: 10,
    fontWeight: "600",
  },
  methodBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  methodText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  moreText: {
    fontSize: 11,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: Spacing.xl,
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
