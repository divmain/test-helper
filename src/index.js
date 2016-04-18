import jsdom from "jsdom";

import Interlock from "interlock";
import compile from "interlock/lib/compile";


export const getFilesFromConfig = config => {
  const { options } = new Interlock(config);
  return compile(options)
    .then(({ bundles }) =>
      Object.keys(bundles).reduce((memo, filepath) => {
        memo[filepath] = bundles[filepath].raw;
        return memo;
      }, {})
    );
};

export const constructEnv = files => {
  const virtualConsole = jsdom.createVirtualConsole();

  const config = {
    virtualConsole,
    resourceLoader: (resource, cb) => {
      if (resource.url.pathname in files) {
        return cb(null, files[resource.url.pathname]);
      }
      return cb(new Error(`Could not find resource: ${resource.url.pathname}`));
    }
  };

  const document = jsdom.jsdom("<html><head></head><body></body></html>", config);
  const window = document.defaultView;
  const loaded = new Promise(_loaded => window.addEventListener("load", _loaded));

  const insertScript = filepath => {
    const scriptEl = document.createElement("script");
    scriptEl.src = filepath;
    document.body.appendChild(scriptEl);
  };

  const testResult = new Promise((resolve, reject) => {
    virtualConsole.on("jsdomError", reject);

    window.testResult = (err, result) => {
      if (err) { return reject(err); }
      return resolve(result);
    };
  });

  return { document, window, loaded, insertScript, testResult };
};
