import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { getToken, getEmpresa, getRol } from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import SelectEmpresaScreen from '../screens/SelectEmpresaScreen';
import HomeScreen from '../screens/HomeScreen';
import VentasScreen from '../screens/VentasScreen';
import InsumosScreen from '../screens/InsumosScreen';
import ProductosScreen from '../screens/ProductosScreen';
import ProduccionScreen from '../screens/ProduccionScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ClientesInactivosScreen from '../screens/ClientesInactivosScreen';
import CajaScreen from '../screens/CajaScreen';
import DeudasScreen from '../screens/DeudasScreen';
import UsuariosScreen from '../screens/UsuariosScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Ventas: 'point-of-sale',
  Insumos: 'inventory',
  Productos: 'fastfood',
  Produccion: 'factory',
  Clientes: 'people',
  Caja: 'account-balance-wallet',
};

const tabOptions = ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: '#E63946',
  tabBarInactiveTintColor: '#888',
  tabBarStyle: { backgroundColor: '#fff' },
  tabBarIcon: ({ color, size }) => (
    <Icon name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
  ),
});

// Admin: acceso total
const AdminTabs = () => (
  <Tab.Navigator screenOptions={tabOptions}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: 'Inicio' }}
    />
    <Tab.Screen
      name="Ventas"
      component={VentasScreen}
      options={{ title: 'Ventas' }}
    />
    <Tab.Screen
      name="Insumos"
      component={InsumosScreen}
      options={{ title: 'Insumos' }}
    />
    <Tab.Screen
      name="Productos"
      component={ProductosScreen}
      options={{ title: 'Productos' }}
    />
    <Tab.Screen
      name="Produccion"
      component={ProduccionScreen}
      options={{ title: 'Producción' }}
    />
    <Tab.Screen
      name="Clientes"
      component={ClientesScreen}
      options={{ title: 'Clientes' }}
    />
    <Tab.Screen
      name="Caja"
      component={CajaScreen}
      options={{ title: 'Caja' }}
    />
  </Tab.Navigator>
);

// Empleado: sin Insumos, Productos es solo lectura (lo maneja la pantalla)
const EmpleadoTabs = () => (
  <Tab.Navigator screenOptions={tabOptions}>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: 'Inicio' }}
    />
    <Tab.Screen
      name="Ventas"
      component={VentasScreen}
      options={{ title: 'Ventas' }}
    />
    <Tab.Screen
      name="Productos"
      component={ProductosScreen}
      options={{ title: 'Productos' }}
    />
    <Tab.Screen
      name="Produccion"
      component={ProduccionScreen}
      options={{ title: 'Producción' }}
    />
    <Tab.Screen
      name="Clientes"
      component={ClientesScreen}
      options={{ title: 'Clientes' }}
    />
    <Tab.Screen
      name="Caja"
      component={CajaScreen}
      options={{ title: 'Caja' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [rol, setRol] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const token = await getToken();
      const empresa = await getEmpresa();
      const rolGuardado = await getRol();
      if (token && empresa) {
        setRol(rolGuardado);
        setInitialRoute('Main');
      } else if (token) {
        setInitialRoute('SelectEmpresa');
      } else {
        setInitialRoute('Login');
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SelectEmpresa" component={SelectEmpresaScreen} />
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {({ route }) => {
            const rolActual = route.params?.rol || rol;
            return rolActual === 'admin' ? <AdminTabs /> : <EmpleadoTabs />;
          }}
        </Stack.Screen>
        <Stack.Screen name="Deudas" component={DeudasScreen} />
        <Stack.Screen
          name="ClientesInactivos"
          component={ClientesInactivosScreen}
        />
        <Stack.Screen name="Usuarios" component={UsuariosScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
