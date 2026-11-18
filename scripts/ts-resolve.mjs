// Lets `node --experimental-strip-types` load lib/ files, whose imports omit the ".ts" extension
// (Next's bundler adds it; plain Node doesn't). Used by `npm test`.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (e) {
      if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw e;
    }
  },
});
