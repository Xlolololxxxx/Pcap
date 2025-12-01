import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CaptureScreen from "@/screens/CaptureScreen";
import RequestDetailScreen from "@/screens/RequestDetailScreen";
import FiltersScreen from "@/screens/FiltersScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type CaptureStackParamList = {
  Capture: undefined;
  RequestDetail: { requestId: string };
  Filters: undefined;
};

const Stack = createNativeStackNavigator<CaptureStackParamList>();

export default function CaptureStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Capture"
        component={CaptureScreen}
        options={{
          headerTitle: () => <HeaderTitle title="PCAPdroid Analyzer" />,
        }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{
          headerTitle: "Request Details",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Filters"
        component={FiltersScreen}
        options={{
          headerTitle: "Filters",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
