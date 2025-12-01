import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScannerScreen from "@/screens/ScannerScreen";
import ScanResultDetailScreen from "@/screens/ScanResultDetailScreen";
import RequestDetailScreen from "@/screens/RequestDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ScannerStackParamList = {
  Scanner: undefined;
  ScanResultDetail: { matchId: string };
  RequestDetail: { requestId: string };
};

const Stack = createNativeStackNavigator<ScannerStackParamList>();

export default function ScannerStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Secret Scanner" />,
        }}
      />
      <Stack.Screen
        name="ScanResultDetail"
        component={ScanResultDetailScreen}
        options={{ title: "Finding Details" }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{ title: "Request Details" }}
      />
    </Stack.Navigator>
  );
}
