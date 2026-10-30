import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

// Minimal stack navigator written in plain JS so it needs no native modules.
// Every route in the stack stays mounted (hidden) so going back keeps state.

export type Params = Record<string, unknown> | undefined;
export type ScreenProps = { params: Params };
export type ScreenMap = Record<string, React.ComponentType<ScreenProps>>;

type Route = { key: string; name: string; params?: Params };

type Nav = {
  push: (name: string, params?: Params) => void;
  replace: (name: string, params?: Params) => void;
  reset: (name: string, params?: Params) => void;
  pop: () => void;
  popTo: (name: string) => void;
  canGoBack: boolean;
};

const NavContext = createContext<Nav | null>(null);
const RouteContext = createContext<{ route: Route; focused: boolean } | null>(
  null,
);

let keySeq = 0;
const makeRoute = (name: string, params?: Params): Route => ({
  key: `${name}-${++keySeq}`,
  name,
  params,
});

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) {
    throw new Error('useNav must be used inside <Navigator>');
  }
  return nav;
}

export function useRouteInfo() {
  const r = useContext(RouteContext);
  if (!r) {
    throw new Error('useRouteInfo must be used inside a screen');
  }
  return r;
}

export function useParam<T>(name: string, fallback: T): T {
  const r = useContext(RouteContext);
  const v = r?.route.params?.[name];
  return v === undefined ? fallback : (v as T);
}

// Runs `handler` on the Android back button while this screen is on top.
// Return true from the handler to consume the press.
export function useBackHandler(handler: () => boolean) {
  const r = useContext(RouteContext);
  const focused = r?.focused ?? true;
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!focused) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () =>
      ref.current(),
    );
    return () => sub.remove();
  }, [focused]);
}

export function Navigator({
  screens,
  initial,
}: {
  screens: ScreenMap;
  initial: string;
}) {
  const [stack, setStack] = useState<Route[]>(() => [makeRoute(initial)]);

  const push = useCallback((name: string, params?: Params) => {
    if (!screens[name]) {
      console.warn(`Unknown screen: ${name}`);
      return;
    }
    setStack(s => [...s, makeRoute(name, params)]);
  }, [screens]);
  const replace = useCallback((name: string, params?: Params) => {
    setStack(s => [...s.slice(0, -1), makeRoute(name, params)]);
  }, []);
  const reset = useCallback((name: string, params?: Params) => {
    setStack([makeRoute(name, params)]);
  }, []);
  const pop = useCallback(() => {
    setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  const popTo = useCallback((name: string) => {
    setStack(s => {
      const i = s.map(r => r.name).lastIndexOf(name);
      return i >= 0 ? s.slice(0, i + 1) : s;
    });
  }, []);

  const canGoBack = stack.length > 1;
  const nav = useMemo(
    () => ({ push, replace, reset, pop, popTo, canGoBack }),
    [push, replace, reset, pop, popTo, canGoBack],
  );

  // Registered once, before any screen, so screen-level handlers
  // (registered later) always run first.
  const canGoBackRef = useRef(canGoBack);
  canGoBackRef.current = canGoBack;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pop]);

  return (
    <NavContext.Provider value={nav}>
      {stack.map((route, i) => {
        const Screen = screens[route.name];
        const focused = i === stack.length - 1;
        return (
          <RouteContext.Provider key={route.key} value={{ route, focused }}>
            <View
              style={[StyleSheet.absoluteFill, !focused && styles.hidden]}
              pointerEvents={focused ? 'auto' : 'none'}
            >
              <Screen params={route.params} />
            </View>
          </RouteContext.Provider>
        );
      })}
    </NavContext.Provider>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
});
