# Control Total

App móvil (React Native 0.86) para administrar **Mi Arepita Querida**. Es
multiempresa y tiene tres niveles de acceso: superadmin, admin y empleado.

## Requisitos

- Node >= 22.11
- Entorno de React Native: <https://reactnative.dev/docs/set-up-your-environment>
- Backend de Control Total (API REST con JWT)

## Instalación

```sh
npm install
# solo iOS
cd ios && bundle install && bundle exec pod install && cd ..
```

## Ejecutar

```sh
npm start          # Metro
npm run android    # en otra terminal
npm run ios
```

### Apuntar a un backend local

En `src/api/client.js` cambia `API_URL`:

```js
// const API_URL = 'https://apicontroltotal.vidriospelaez.com.co/api/'; // Producción
const API_URL = 'http://10.0.2.2:3000/api/'; // Desarrollo (emulador Android)
```

`10.0.2.2` es el `localhost` del emulador de Android. En iOS usa
`http://localhost:3000/api/`. **No subas el cambio a producción.**

## Scripts

| Comando        | Qué hace              |
| -------------- | --------------------- |
| `npm test`     | Pruebas con Jest      |
| `npm run lint` | ESLint                |

## Estructura

```
src/
  api/         cliente axios (token e interceptor de sesión expirada)
  components/  FiltroPeriodo, ModalAnular, FormScroll, KeyboardView, ...
  navigation/  AppNavigator (Login -> SelectEmpresa -> Main con tabs por rol)
  screens/     pantallas
  store/       sesión en AsyncStorage (token, usuario, empresa, rol)
  theme/       colores
  utils/       formato, validaciones, fechas, errores, safe area, sesión
__tests__/     pruebas
```

## Flujo de sesión

1. `Login`
2. `CambiarPassword` si la clave es temporal
3. `SelectEmpresa` (o `Superadmin` si no tiene empresas)
4. `Main`: tabs según el rol (admin ve Insumos; empleado no)

Si el servidor responde 401 (o 403 "Sin acceso a esta empresa") el
interceptor limpia la sesión y vuelve a `Login`.

## Convenciones

- Fechas en hora de Colombia (UTC-5), ver `src/utils/date.js`.
- Dinero con `aDinero` (el punto es separador de miles, la coma es decimal) y
  cantidades con `aNumero`, ver `src/utils/validar.js`.
- Commits: `fix`, `feat`, `refactor`, `style`, `chore`, `test`, `docs`.
