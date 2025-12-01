import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import CaptureStackNavigator from "@/navigation/CaptureStackNavigator";
import HostsStackNavigator from "@/navigation/HostsStackNavigator";
import SessionsStackNavigator from "@/navigation/SessionsStackNavigator";
import ScannerStackNavigator from "@/navigation/ScannerStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  CaptureTab: undefined;
  HostsTab: undefined;
  SessionsTab: undefined;
  ScannerTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="CaptureTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundDefault,
          }),
          borderTopWidth: 1,
          borderTopColor: theme.backgroundSecondary,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="CaptureTab"
        component={CaptureStackNavigator}
        options={{
          title: "Capture",
          tabBarIcon: ({ color, size }) => (
            <Feather name="radio" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HostsTab"
        component={HostsStackNavigator}
        options={{
          title: "Hosts",
          tabBarIcon: ({ color, size }) => (
            <Feather name="server" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SessionsTab"
        component={SessionsStackNavigator}
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => (
            <Feather name="key" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScannerTab"
        component={ScannerStackNavigator}
        options={{
          title: "Scanner",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shield" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
