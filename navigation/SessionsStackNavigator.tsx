import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SessionsScreen from "@/screens/SessionsScreen";
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type SessionsStackParamList = {
  Sessions: undefined;
  SessionDetail: { host: string };
};

const Stack = createNativeStackNavigator<SessionsStackParamList>();

export default function SessionsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{ headerTitle: "Session Data" }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ headerTitle: "Session Details" }}
      />
    </Stack.Navigator>
  );
}
