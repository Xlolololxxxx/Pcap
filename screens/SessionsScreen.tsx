import React, { useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { SessionsStackParamList } from "@/navigation/SessionsStackNavigator";
import { HostSession } from "@/store/types";

type SessionsScreenProps = {
  navigation: NativeStackNavigationProp<SessionsStackParamList, "Sessions">;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: HostSession;
  onPress: () => void;
  onDelete: () => void;
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
          <View style={[styles.icon, { backgroundColor: Colors.dark.accentYellow + "20" }]}>
            <Feather name="key" size={18} color={Colors.dark.accentYellow} />
          </View>
          <View style={styles.info}>
            <ThemedText style={styles.host} numberOfLines={1}>
              {session.host}
            </ThemedText>
            <ThemedText style={[styles.lastUpdated, { color: theme.textTertiary }]}>
              Updated {formatTime(session.lastUpdated)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: Colors.dark.accentRed + "20", opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onDelete}
          >
            <Feather name="trash-2" size={14} color={Colors.dark.accentRed} />
          </Pressable>
          <Feather name="chevron-right" size={18} color={theme.textTertiary} />
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.dark.accentYellow + "20" }]}>
            <Feather name="shield" size={12} color={Colors.dark.accentYellow} />
          </View>
          <ThemedText style={[styles.statText, { color: theme.textSecondary }]}>
            {session.authTokens.length} auth tokens
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.dark.accentBlue + "20" }]}>
            <Feather name="database" size={12} color={Colors.dark.accentBlue} />
          </View>
          <ThemedText style={[styles.statText, { color: theme.textSecondary }]}>
            {Object.keys(session.cookies).length} cookies
          </ThemedText>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: Colors.dark.accent + "20" }]}>
            <Feather name="list" size={12} color={Colors.dark.accent} />
          </View>
          <ThemedText style={[styles.statText, { color: theme.textSecondary }]}>
            {Object.keys(session.headers).length} headers
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function SessionsScreen({ navigation }: SessionsScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { sessions, loadData, clearSessions, clearHostSession } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sessionsList = Object.values(sessions).sort(
    (a, b) => b.lastUpdated - a.lastUpdated
  );

  const handleClearAll = () => {
    if (Platform.OS === "web") {
      if (confirm("Clear all session data? This cannot be undone.")) {
        clearSessions();
      }
    } else {
      Alert.alert(
        "Clear All Sessions",
        "This will delete all stored credentials and session data. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
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

  const handleDeleteSession = (host: string) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete session data for ${host}?`)) {
        clearHostSession(host);
      }
    } else {
      Alert.alert(
        "Delete Session",
        `Delete all session data for ${host}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              clearHostSession(host);
            },
          },
        ]
      );
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: HostSession }) => (
      <SessionCard
        session={item}
        onPress={() => navigation.navigate("SessionDetail", { host: item.host })}
        onDelete={() => handleDeleteSession(item.host)}
      />
    ),
    [navigation]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="key" size={64} color={theme.textTertiary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        No session data stored
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
        Credentials and headers are captured automatically from requests
      </ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <ThemedText style={[styles.headerTitle, { color: theme.textSecondary }]}>
        {sessionsList.length} host{sessionsList.length !== 1 ? "s" : ""} with session data
      </ThemedText>
      {sessionsList.length > 0 ? (
        <Pressable
          style={({ pressed }) => [
            styles.clearAllButton,
            { backgroundColor: Colors.dark.accentRed + "20", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleClearAll}
        >
          <Feather name="trash-2" size={12} color={Colors.dark.accentRed} />
          <ThemedText style={[styles.clearAllText, { color: Colors.dark.accentRed }]}>
            Clear All
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sessionsList}
        renderItem={renderItem}
        keyExtractor={(item) => item.host}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl, paddingTop: headerHeight + Spacing.lg },
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
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 13,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "500",
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
    marginBottom: Spacing.md,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  host: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  lastUpdated: {
    fontSize: 12,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardStats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
