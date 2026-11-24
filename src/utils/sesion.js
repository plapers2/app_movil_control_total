import { Alert } from 'react-native';
import { navigationRef, resetTo } from '../navigation/navigationRef';
import { clearSession } from '../store/authStore';

export const cerrarSesion = () => {
  Alert.alert('Cerrar sesión', '¿Quieres salir de la app?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Salir',
      style: 'destructive',
      onPress: async () => {
        await clearSession();
        resetTo('Login');
      },
    },
  ]);
};

// El token actual sigue siendo válido: SelectEmpresa pide /auth/me y,
// al elegir, el backend entrega un token nuevo para esa empresa.
export const cambiarEmpresa = () => {
  if (navigationRef.isReady())
    navigationRef.navigate('SelectEmpresa', { desdeCambio: true });
};

export const abrirMenuCuenta = () => {
  Alert.alert('Cuenta', undefined, [
    { text: 'Cambiar de empresa', onPress: cambiarEmpresa },
    { text: 'Cerrar sesión', style: 'destructive', onPress: cerrarSesion },
    { text: 'Cancelar', style: 'cancel' },
  ]);
};
