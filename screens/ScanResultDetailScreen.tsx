import React, { useMemo } from "react";
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
import * as Haptics from "expo-haptics";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { ScannerStackParamList } from "@/navigation/ScannerStackNavigator";
import { scanForSecrets, SecretMatch, SECRET_PATTERNS } from "@/store/secretPatterns";

type ScanResultDetailScreenProps = {
  navigation: NativeStackNavigationProp<ScannerStackParamList, "ScanResultDetail">;
  route: RouteProp<ScannerStackParamList, "ScanResultDetail">;
};

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

export default function ScanResultDetailScreen({
  navigation,
  route,
}: ScanResultDetailScreenProps) {
  const { theme } = useTheme();
  const { requests } = useAppStore();
  const matchId = route.params.matchId;

  const match = useMemo(() => {
    for (const request of requests) {
      const headersString = Object.entries(request.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      const headerMatches = scanForSecrets(
        headersString,
        "headers",
        request.id,
        request.host,
        request.timestamp
      );
      const found = headerMatches.find((m) => m.id === matchId);
      if (found) return { match: found, request };

      if (request.body) {
        const bodyMatches = scanForSecrets(
          request.body,
          "body",
          request.id,
          request.host,
          request.timestamp
        );
        const foundBody = bodyMatches.find((m) => m.id === matchId);
        if (foundBody) return { match: foundBody, request };
      }

      if (request.path) {
        const pathMatches = scanForSecrets(
          request.path,
          "path",
          request.id,
          request.host,
          request.timestamp
        );
        const foundPath = pathMatches.find((m) => m.id === matchId);
        if (foundPath) return { match: foundPath, request };
      }

      if (request.response) {
        const respHeadersString = Object.entries(request.response.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        const respHeaderMatches = scanForSecrets(
          respHeadersString,
          "response_headers",
          request.id,
          request.host,
          request.timestamp
        );
        const foundRespHeaders = respHeaderMatches.find((m) => m.id === matchId);
        if (foundRespHeaders) return { match: foundRespHeaders, request };

        if (request.response.body) {
          const respBodyMatches = scanForSecrets(
            request.response.body,
            "response_body",
            request.id,
            request.host,
            request.timestamp
          );
          const foundRespBody = respBodyMatches.find((m) => m.id === matchId);
          if (foundRespBody) return { match: foundRespBody, request };
        }
      }
    }
    return null;
  }, [requests, matchId]);

  const pattern = useMemo(() => {
    if (!match) return null;
    return SECRET_PATTERNS.find((p) => p.id === match.match.patternId);
  }, [match]);

  const handleShare = async () => {
    if (!match) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const reportData = {
      finding: match.match.patternName,
      severity: match.match.severity,
      category: match.match.category,
      host: match.match.host,
      location: match.match.location,
      matchedValue: match.match.match,
      context: match.match.context,
      timestamp: new Date(match.match.timestamp).toISOString(),
    };

    try {
      await Share.share({
        message: JSON.stringify(reportData, null, 2),
        title: `Security Finding - ${match.match.patternName}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  if (!match) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={48} color={theme.textTertiary} />
          <ThemedText style={[styles.notFoundText, { color: theme.textSecondary }]}>
            Finding not found
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const { match: finding, request } = match;
  const severityColor = SEVERITY_COLORS[finding.severity];
  const icon = CATEGORY_ICONS[finding.category] || "alert-circle";

  return (
    <ScreenScrollView>
      <View style={[styles.header, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.iconContainer, { backgroundColor: severityColor + "20" }]}>
          <Feather name={icon as any} size={32} color={severityColor} />
        </View>
        <ThemedText style={styles.title}>{finding.patternName}</ThemedText>
        <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
          <ThemedText style={styles.severityText}>
            {finding.severity.toUpperCase()}
          </ThemedText>
        </View>
        {pattern ? (
          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
            {pattern.description}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: severityColor }]}>
          Matched Value
        </ThemedText>
        <View style={[styles.codeBlock, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={[styles.codeText, { fontFamily: Fonts?.mono }]} selectable>
            {finding.match}
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: severityColor }]}>
          Context
        </ThemedText>
        <View style={[styles.codeBlock, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText
            style={[styles.contextText, { fontFamily: Fonts?.mono, color: theme.textSecondary }]}
          >
            ...{finding.context}...
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: severityColor }]}>
          Details
        </ThemedText>
        <View style={[styles.detailsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.detailRow, { borderBottomColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.detailLabel, { color: theme.textTertiary }]}>
              Category
            </ThemedText>
            <ThemedText style={styles.detailValue}>{finding.category}</ThemedText>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.detailLabel, { color: theme.textTertiary }]}>
              Location
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {finding.location.replace("_", " ")}
            </ThemedText>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: theme.backgroundSecondary }]}>
            <ThemedText style={[styles.detailLabel, { color: theme.textTertiary }]}>
              Host
            </ThemedText>
            <ThemedText style={styles.detailValue}>{finding.host}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: theme.textTertiary }]}>
              Detected
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {new Date(finding.timestamp).toLocaleString()}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: Colors.dark.accent, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => navigation.navigate("RequestDetail", { requestId: request.id })}
        >
          <Feather name="eye" size={18} color="#000" />
          <ThemedText style={styles.actionButtonText}>View Request</ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleShare}
        >
          <Feather name="share-2" size={18} color={theme.text} />
          <ThemedText style={[styles.actionButtonText, { color: theme.text }]}>
            Export Finding
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.warningCard, { backgroundColor: severityColor + "15" }]}>
        <Feather name="alert-triangle" size={20} color={severityColor} />
        <View style={styles.warningContent}>
          <ThemedText style={[styles.warningTitle, { color: severityColor }]}>
            Security Recommendation
          </ThemedText>
          <ThemedText style={[styles.warningText, { color: theme.textSecondary }]}>
            {finding.severity === "critical" || finding.severity === "high"
              ? "This secret should be rotated immediately and removed from any exposed locations. Consider using environment variables or a secrets manager."
              : "Review this finding to ensure sensitive data is not being exposed unintentionally. Consider masking or encrypting sensitive values."}
          </ThemedText>
        </View>
      </View>
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
    padding: Spacing.xl,
  },
  notFoundText: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
  header: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  severityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  description: {
    fontSize: 13,
    textAlign: "center",
  },
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
  contextText: {
    fontSize: 11,
  },
  detailsCard: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  warningCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
