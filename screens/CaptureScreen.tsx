import React, { useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { RequestListItem } from "@/components/RequestListItem";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { CaptureStackParamList } from "@/navigation/CaptureStackNavigator";
import { NetworkRequest } from "@/store/types";

type CaptureScreenProps = {
  navigation: NativeStackNavigationProp<CaptureStackParamList, "Capture">;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CaptureScreen({ navigation }: CaptureScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const fabScale = useSharedValue(1);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  const {
    requests,
    isCapturing,
    port,
    filters,
    loadData,
    setCapturing,
    addRequest,
    getFilteredRequests,
  } = useAppStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateMockRequest = useCallback((): NetworkRequest => {
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const hosts = [
      "api.example.com",
      "auth.service.io",
      "cdn.images.net",
      "payments.stripe.com",
      "analytics.google.com",
      "api.github.com",
      "graph.facebook.com",
    ];
    const paths = [
      "/api/v1/users",
      "/api/v2/auth/login",
      "/api/products",
      "/api/orders",
      "/webhook/callback",
      "/graphql",
      "/api/search",
      "/api/notifications",
    ];
    const protocols = ["HTTPS", "HTTP"];

    const method = methods[Math.floor(Math.random() * methods.length)];
    const host = hosts[Math.floor(Math.random() * hosts.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];

    return {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      method,
      host,
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      port: protocol === "HTTPS" ? 443 : 80,
      path,
      protocol,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PCAPdroid/1.0",
        "Accept": "application/json",
        ...(Math.random() > 0.5 ? { "Authorization": `Bearer ${Math.random().toString(36).substr(2, 32)}` } : {}),
        ...(Math.random() > 0.7 ? { "Cookie": `session_id=${Math.random().toString(36).substr(2, 16)}; user_token=${Math.random().toString(36).substr(2, 24)}` } : {}),
      },
      body: method !== "GET" ? JSON.stringify({ data: "sample" }) : "",
    };
  }, []);

  const toggleCapture = useCallback(() => {
    if (isCapturing) {
      setCapturing(false);
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
      }
    } else {
      setCapturing(true);
      simulationInterval.current = setInterval(() => {
        addRequest(generateMockRequest());
      }, 1500 + Math.random() * 2000);
    }
  }, [isCapturing, setCapturing, addRequest, generateMockRequest]);

  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const filteredRequests = getFilteredRequests();
  const activeFiltersCount =
    filters.ipAddresses.length +
    filters.hostnames.length +
    filters.protocols.length +
    filters.endpoints.length +
    filters.methods.length;

  const renderItem = useCallback(
    ({ item }: { item: NetworkRequest }) => (
      <RequestListItem
        request={item}
        onPress={() => navigation.navigate("RequestDetail", { requestId: item.id })}
      />
    ),
    [navigation]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="radio" size={64} color={theme.textTertiary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {isCapturing ? "Waiting for requests..." : "Start capturing to see network requests"}
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
        Configure PCAPdroid to export to port {port}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: isCapturing ? Colors.dark.methodGet : theme.backgroundSecondary,
            marginTop: headerHeight,
          },
        ]}
      >
        <View style={styles.statusContent}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isCapturing ? "#fff" : theme.textTertiary },
              ]}
            />
            <ThemedText
              style={[
                styles.statusText,
                { color: isCapturing ? "#fff" : theme.text },
              ]}
            >
              {isCapturing ? `Listening on port ${port}` : "Not capturing"}
            </ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: theme.backgroundTertiary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => navigation.navigate("Filters")}
          >
            <Feather name="filter" size={16} color={theme.text} />
            {activeFiltersCount > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: Colors.dark.accent }]}>
                <ThemedText style={styles.filterBadgeText}>{activeFiltersCount}</ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 80 },
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <AnimatedPressable
        style={[
          styles.fab,
          {
            backgroundColor: isCapturing ? Colors.dark.accentRed : Colors.dark.accent,
            bottom: tabBarHeight + Spacing.xl,
          },
          fabAnimatedStyle,
        ]}
        onPress={toggleCapture}
        onPressIn={handleFabPressIn}
        onPressOut={handleFabPressOut}
      >
        <Feather
          name={isCapturing ? "pause" : "play"}
          size={24}
          color={isCapturing ? "#fff" : "#000"}
        />
      </AnimatedPressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  filterBadge: {
    marginLeft: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#000",
  },
  listContent: {
    paddingTop: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
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
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
