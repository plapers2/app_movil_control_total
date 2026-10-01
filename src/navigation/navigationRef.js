import {
  createNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const resetTo = (name, params) => {
  if (!navigationRef.isReady()) return;
  if (navigationRef.getCurrentRoute()?.name === name) return;
  navigationRef.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name, params }] }),
  );
};
