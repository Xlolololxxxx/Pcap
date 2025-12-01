import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { CaptureStackParamList } from "@/navigation/CaptureStackNavigator";

type RequestDetailScreenProps = {
  navigation: NativeStackNavigationProp<CaptureStackParamList, "RequestDetail">;
  route: RouteProp<CaptureStackParamList, "RequestDetail">;
};

type TabType = "request" | "headers" | "body" | "session";

export default function RequestDetailScreen({
  navigation,
  route,
}: RequestDetailScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { getRequestById, sessions } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>("request");

  const request = getRequestById(route.params.requestId);
  const hostSession = request ? sessions[request.host] : null;

  const tabs: { key: TabType; label: string }[] = [
    { key: "request", label: "Request" },
    { key: "headers", label: "Headers" },
    { key: "body", label: "Body" },
    { key: "session", label: "Session" },
  ];

  const handleShare = async () => {
    if (!request) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const shareData = {
      method: request.method,
      url: `${request.protocol.toLowerCase()}://${request.host}${request.path}`,
      headers: request.headers,
      body: request.body,
    };

    try {
      await Share.share({
        message: JSON.stringify(shareData, null, 2),
        title: `${request.method} ${request.host}${request.path}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  if (!request) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFound}>
          <ThemedText>Request not found</ThemedText>
        </View>
      </ThemedView>
    );
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

  const renderRequestTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          URL
        </ThemedText>
        <View style={[styles.codeBlock, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={[styles.codeText, { fontFamily: Fonts?.mono }]}>
            {`${request.protocol.toLowerCase()}://${request.host}${request.path}`}
          </ThemedText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: theme.textTertiary }]}>
            Method
          </ThemedText>
          <View style={[styles.methodBadge, { backgroundColor: getMethodColor(request.method) }]}>
            <ThemedText style={styles.methodText}>{request.method}</ThemedText>
          </View>
        </View>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: theme.textTertiary }]}>
            Protocol
          </ThemedText>
          <ThemedText style={styles.infoValue}>{request.protocol}</ThemedText>
        </View>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: theme.textTertiary }]}>
            IP Address
          </ThemedText>
          <ThemedText style={[styles.infoValue, { fontFamily: Fonts?.mono }]}>
            {request.ip}
          </ThemedText>
        </View>
        <View style={styles.infoItem}>
          <ThemedText style={[styles.infoLabel, { color: theme.textTertiary }]}>
            Port
          </ThemedText>
          <ThemedText style={[styles.infoValue, { fontFamily: Fonts?.mono }]}>
            {request.port}
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
          Timestamp
        </ThemedText>
        <ThemedText style={[styles.timestamp, { fontFamily: Fonts?.mono }]}>
          {new Date(request.timestamp).toLocaleString()}
        </ThemedText>
      </View>
    </View>
  );

  const renderHeadersTab = () => (
    <View style={styles.tabContent}>
      {Object.entries(request.headers).length > 0 ? (
        Object.entries(request.headers).map(([key, value]) => (
          <View
            key={key}
            style={[styles.headerItem, { borderBottomColor: theme.backgroundSecondary }]}
          >
            <ThemedText style={[styles.headerKey, { color: Colors.dark.accent }]}>
              {key}
            </ThemedText>
            <ThemedText
              style={[styles.headerValue, { fontFamily: Fonts?.mono }]}
              numberOfLines={3}
            >
              {value}
            </ThemedText>
          </View>
        ))
      ) : (
        <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
          No headers
        </ThemedText>
      )}
    </View>
  );

  const renderBodyTab = () => (
    <View style={styles.tabContent}>
      {request.body ? (
        <View style={[styles.codeBlock, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={[styles.codeText, { fontFamily: Fonts?.mono }]}>
            {(() => {
              try {
                return JSON.stringify(JSON.parse(request.body), null, 2);
              } catch {
                return request.body;
              }
            })()}
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
          No request body
        </ThemedText>
      )}
    </View>
  );

  const renderSessionTab = () => (
    <View style={styles.tabContent}>
      {hostSession ? (
        <>
          {hostSession.authTokens.length > 0 ? (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
                Auth Tokens
              </ThemedText>
              {hostSession.authTokens.map((token, index) => (
                <View
                  key={index}
                  style={[styles.codeBlock, { backgroundColor: theme.backgroundSecondary, marginBottom: Spacing.sm }]}
                >
                  <ThemedText style={[styles.codeText, { fontFamily: Fonts?.mono }]} numberOfLines={3}>
                    {token}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {Object.keys(hostSession.cookies).length > 0 ? (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
                Cookies
              </ThemedText>
              {Object.entries(hostSession.cookies).map(([key, value]) => (
                <View
                  key={key}
                  style={[styles.headerItem, { borderBottomColor: theme.backgroundSecondary }]}
                >
                  <ThemedText style={[styles.headerKey, { color: Colors.dark.accentBlue }]}>
                    {key}
                  </ThemedText>
                  <ThemedText style={[styles.headerValue, { fontFamily: Fonts?.mono }]} numberOfLines={2}>
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {Object.keys(hostSession.headers).length > 0 ? (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: Colors.dark.accent }]}>
                Stored Headers
              </ThemedText>
              {Object.entries(hostSession.headers).map(([key, value]) => (
                <View
                  key={key}
                  style={[styles.headerItem, { borderBottomColor: theme.backgroundSecondary }]}
                >
                  <ThemedText style={[styles.headerKey, { color: Colors.dark.accentYellow }]}>
                    {key}
                  </ThemedText>
                  <ThemedText style={[styles.headerValue, { fontFamily: Fonts?.mono }]} numberOfLines={2}>
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
          No session data for this host
        </ThemedText>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.headerTop}>
          <View style={[styles.methodBadgeLarge, { backgroundColor: getMethodColor(request.method) }]}>
            <ThemedText style={styles.methodTextLarge}>{request.method}</ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleShare}
          >
            <Feather name="share-2" size={18} color={theme.text} />
          </Pressable>
        </View>
        <ThemedText style={styles.hostText} numberOfLines={1}>
          {request.host}
        </ThemedText>
        <ThemedText
          style={[styles.pathText, { color: theme.textSecondary, fontFamily: Fonts?.mono }]}
          numberOfLines={2}
        >
          {request.path}
        </ThemedText>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.backgroundDefault }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: Colors.dark.accent },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? Colors.dark.accent : theme.textTertiary },
              ]}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {activeTab === "request" && renderRequestTab()}
        {activeTab === "headers" && renderHeadersTab()}
        {activeTab === "body" && renderBodyTab()}
        {activeTab === "session" && renderSessionTab()}
      </ScrollView>
    </ThemedView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  methodBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  methodTextLarge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hostText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  pathText: {
    fontSize: 13,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSecondary,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  tabContent: {},
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  codeBlock: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  codeText: {
    fontSize: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.xl,
  },
  infoItem: {
    width: "50%",
    marginBottom: Spacing.lg,
  },
  infoLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: 14,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  methodText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  timestamp: {
    fontSize: 13,
  },
  headerItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerKey: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerValue: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
