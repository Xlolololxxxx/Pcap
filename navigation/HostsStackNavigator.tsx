import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HostsScreen from "@/screens/HostsScreen";
import HostDetailScreen from "@/screens/HostDetailScreen";
import RequestDetailScreen from "@/screens/RequestDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type HostsStackParamList = {
  Hosts: undefined;
  HostDetail: { host: string };
  RequestDetail: { requestId: string };
};

const Stack = createNativeStackNavigator<HostsStackParamList>();

export default function HostsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Hosts"
        component={HostsScreen}
        options={{ headerTitle: "Hosts" }}
      />
      <Stack.Screen
        name="HostDetail"
        component={HostDetailScreen}
        options={{ headerTitle: "Host Requests" }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{
          headerTitle: "Request Details",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
