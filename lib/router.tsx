import React, { createContext, useContext, useState, useEffect, ReactNode, Children, isValidElement } from 'react';

interface RouterContextType {
  path: string;
  navigate: (path: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType>({ path: '/', navigate: () => {}, params: {} });

export const MemoryRouter = ({ children }: { children: ReactNode }) => {
  const [path, setPath] = useState('/');
  // Handle initial path if needed, but for blob/memory it starts at /

  const navigate = (to: string) => {
    setPath(to);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ path, navigate, params: {} }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Routes = ({ children }: { children: ReactNode }) => {
  const { path } = useContext(RouterContext);
  let match: ReactNode = null;

  Children.forEach(children, child => {
    if (match) return;
    if (!isValidElement(child)) return;

    const { path: routePath, element } = child.props as { path: string, element: ReactNode };

    if (routePath === '*') {
      match = element;
      return;
    }

    if (routePath === path) {
      match = element;
      return;
    }

    // Simple param matching for /tournament/:id
    if (routePath.includes(':')) {
      const routeParts = routePath.split('/');
      const currentParts = path.split('/');
      if (routeParts.length === currentParts.length) {
        const params: Record<string, string> = {};
        let isMatch = true;
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = currentParts[i];
          } else if (routeParts[i] !== currentParts[i]) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          match = <ParamProvider params={params}>{element}</ParamProvider>;
        }
      }
    }
  });

  return <>{match}</>;
};

const ParamProvider = ({ params, children }: { params: Record<string, string>, children: ReactNode }) => {
  const ctx = useContext(RouterContext);
  return <RouterContext.Provider value={{ ...ctx, params }}>{children}</RouterContext.Provider>;
};

export const Route = ({ path, element }: { path: string, element: ReactNode }) => {
  return <>{element}</>;
};

export const Link = ({ to, children, className }: { to: string, children: ReactNode, className?: string }) => {
  const { navigate } = useContext(RouterContext);
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className={className}
    >
      {children}
    </a>
  );
};

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};

export const useLocation = () => {
  const { path } = useContext(RouterContext);
  return { pathname: path };
};

export const useParams = () => {
  const { params } = useContext(RouterContext);
  return params;
};

export const Navigate = ({ to }: { to: string }) => {
  const { navigate } = useContext(RouterContext);
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return null;
};
