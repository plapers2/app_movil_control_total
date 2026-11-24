import { Platform, StatusBar } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

// Alturas medidas una vez al abrir la app (la app es vertical).
const topReal =
  initialWindowMetrics?.insets.top ??
  (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 47);

export const TOP_INSET = topReal;
export const BOTTOM_INSET = initialWindowMetrics?.insets.bottom ?? 0;

// Alto superior de un header: barra de estado + aire
export const HEADER_TOP = TOP_INSET + 16;
