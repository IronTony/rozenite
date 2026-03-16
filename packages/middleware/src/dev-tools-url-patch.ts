import path from 'node:path';
import { createRequire } from 'node:module';
import { getDevMiddlewarePath } from './resolve.js';
import { RozeniteConfig } from './index.js';

const require = createRequire(import.meta.url);

const patchSingleModule = (modulePath: string): boolean => {
  try {
    const mod = require(modulePath);
    if (typeof mod.default !== 'function') return false;
    const original = mod.default;
    mod.default = (
      experiments: unknown,
      webSocketDebuggerUrl: string,
      devServerUrl: string,
      opts: unknown
    ) => {
      const originalUrl = original(
        experiments,
        webSocketDebuggerUrl,
        devServerUrl,
        opts
      );
      return originalUrl.replace('/debugger-frontend/', '/rozenite/');
    };
    return true;
  } catch {
    return false;
  }
};

export const patchDevtoolsFrontendUrl = (options: RozeniteConfig): void => {
  const primaryPath = path.dirname(getDevMiddlewarePath(options));
  patchSingleModule(
    path.join(primaryPath, '/utils/getDevToolsFrontendUrl')
  );

  const additionalPaths: string[] = [];

  try {
    const expoPath = require.resolve('expo', {
      paths: [options.projectRoot],
    });
    const expoCliPath = require.resolve('@expo/cli', {
      paths: [path.dirname(expoPath)],
    });
    const expoDevMiddleware = require.resolve(
      '@react-native/dev-middleware',
      { paths: [expoCliPath] }
    );
    additionalPaths.push(
      path.join(
        path.dirname(expoDevMiddleware),
        '/utils/getDevToolsFrontendUrl'
      )
    );
  } catch {
    // expo not installed
  }

  try {
    const rnPath = require.resolve('react-native', {
      paths: [options.projectRoot],
    });
    const communityCliPlugin = require.resolve(
      '@react-native/community-cli-plugin',
      { paths: [path.dirname(rnPath)] }
    );
    const rnDevMiddleware = require.resolve(
      '@react-native/dev-middleware',
      { paths: [communityCliPlugin] }
    );
    additionalPaths.push(
      path.join(
        path.dirname(rnDevMiddleware),
        '/utils/getDevToolsFrontendUrl'
      )
    );
  } catch {
    // community-cli-plugin not available
  }

  try {
    const topLevel = require.resolve('@react-native/dev-middleware', {
      paths: [options.projectRoot],
    });
    additionalPaths.push(
      path.join(path.dirname(topLevel), '/utils/getDevToolsFrontendUrl')
    );
  } catch {
    // not hoisted
  }

  for (const p of additionalPaths) {
    patchSingleModule(p);
  }
};
