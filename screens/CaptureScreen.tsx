import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Alert,
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
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

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

  const connectWebSocket = useCallback(() => {
    setWsStatus("connecting");
    try {
      const wsUrl = Platform.OS === "web" ? "ws://127.0.0.1:5001" : "ws://127.0.0.1:5001";
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "request" && msg.data) {
            addRequest(msg.data);
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WS error:", e);
        setWsStatus("disconnected");
        Alert.alert(
          "Connection Error",
          "Could not connect to PCAPdroid listener. Make sure it's running on port 5001."
        );
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WS connect error:", e);
      setWsStatus("disconnected");
    }
  }, [addRequest]);

  const toggleCapture = useCallback(() => {
    if (isCapturing) {
      setCapturing(false);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus("disconnected");
    } else {
      setCapturing(true);
      connectWebSocket();
    }
  }, [isCapturing, setCapturing, connectWebSocket]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
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
