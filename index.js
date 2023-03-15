// By ExponentialWorkload
/* eslint-disable no-extra-parens */

const { createHash } = require('crypto');

// Core Bundler, just a minimally stripped version of expo's
module.exports = (prefixStr = '', srcdir = 'CWD-SRC', cfgdir = 'CWD-CFG', win32require = false, initScriptName = 'index', handleVararg = true) => {
  const fs = require('fs'), path = require('path');
  if (srcdir === 'CWD-SRC')
    srcdir = path.join(process.cwd(), 'src');
  if (cfgdir === 'CWD-CFG')
    cfgdir = path.join(process.cwd(), 'bundler-config');
  const { performance } = require('perf_hooks'), start = performance.now();
  if (!fs.existsSync(cfgdir)) {
    fs.mkdirSync(cfgdir);
  }
  if (!fs.existsSync(`${cfgdir}/prefix.lua`))
    fs.writeFileSync(`${cfgdir}/prefix.lua`, `-- Expo's Bundler Prefix Script
-- Copyright (c) 2023 ExponentialWorkload.
-- MIT License

local null = nil -- null is better than nil, change my mind
local modules = {} -- we will assign modules to here later
local oldRequire = require;
local require = function(...) -- handle loading modules
  local requested, returned = { ... }, {}
  for _, filepath in pairs(requested) do
    if not modules[filepath] then
      local fallbackMod;
      pcall(function()fallbackMod=oldRequire(filepath);end)
      if typeof(fallbackMod)~='nil' then return fallbackMod;end;
      error('[blb] no such module \\'' .. filepath .. '\\'');
    end
    local module = modules[filepath]
    if module.isCached then
      table.insert(returned, module.cache)
    else
      local moduleValue = module.load()
      module.cache = moduleValue
      module.isCached = true
      table.insert(returned, module.cache)
    end
  end
  return table.unpack(returned)
end
`);
  if (!fs.existsSync(`${cfgdir}/postfix.lua`))
    fs.writeFileSync(`${cfgdir}/postfix.lua`, `return require '${initScriptName}'`);
  const prefix = `${prefixStr}
return (function(oldRequire,...) -- put everything in a seperate closure${handleVararg ? `
local vararg = {...};` : ''}
${fs.readFileSync(path.resolve(cfgdir, 'prefix.lua'), 'utf-8')}`, postfix = `${fs.readFileSync(path.resolve(cfgdir, 'postfix.lua'), 'utf-8')}
end)(require or function()end${fs.existsSync(path.resolve(cfgdir, '.novararg')) ? '' : ',...'});`;

  // https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search (too lazy to reimplement a recursive readdir)
  const walk = (dir, done) => {
    let results = [];
    fs.readdir(dir, (err, list) => {
      if (err)
        return done(err);
      let pending = list.length;
      if (!pending)
        return done(null, results);
      list.forEach((file) => {
        file = path.resolve(dir, file);
        fs.stat(file, (err, stat) => {
          if (stat && stat.isDirectory())
            walk(file, (err, res) => {
              results = results.concat(res);
              if (!--pending)
                done(null, results);
            });
          else {
            results.push(file);
            if (!--pending)
              done(null, results);
          }
        });
      });
    });
  };

  // proper promisified variant of walk();
  const walkPromise = (dir) => new Promise((resolve, reject) => walk(dir, (err, res) => (err ? reject(err) : resolve(res.sort()))));

  // main code
  return (async () => {
    // Find all lua files
    const baseDir = srcdir;
    const dirFiles = await walkPromise(baseDir);
    const luaFiles = dirFiles.filter(v => v.toLowerCase().endsWith('.lua'));
    const relativeFiles = luaFiles.map(v => path.relative(baseDir, v).replace(/\\/gu, '/'));
    // Add each source file to a list of definitions
    const definitions = relativeFiles.map(file => {
      const dirSplit = file.split('/');
      const fileName = dirSplit.pop();
      const dir = dirSplit.join('/');
      const fcont = fs.readFileSync(path.join(baseDir, file), 'utf-8');
      const fhash = createHash('sha512').update(fcont)
        .digest('hex');
      return `modules['${file}'] = {};
modules['${file}'].load = function()
local __just_filename = '${fileName}';
local __filename = '${file}';
local __dirname = '${dir}';
local __hash = '${fhash}';
${handleVararg ? `return (function(...)
${fcont}
end)(unpack(vararg))` : fcont}
end;
modules['${file}'].cache = null;
modules['${file}'].isCached = false;`;
    }).join('\n\n----\n\n');
    // Define a function to get all equivalent paths
    const getEquivalent = (p) => [
      p.replace('.lua', ''),
      ...win32require ? [
        p.replace(/\//gu, '\\\\'), p.replace(/\//gu, '\\\\').replace('.lua', '')
      ] : [],
      ...p.startsWith('packages/') ? getEquivalent(p.replace('packages/', '')) : [],
      ...p.endsWith('/index.lua') ? getEquivalent(p.replace('/index.lua', '')) : [],
      ...!p.startsWith('/') ? getEquivalent(`/${p}`) : [],
    ];
    // For each file, assign it's equivalents to the right thing
    const equivalentDefinitions = relativeFiles.map(file => getEquivalent(file).map(file2 => `modules['${file2}'] = modules['${file}'];`)
      .join('\n')).join('\n\n----\n\n');
    // Produce a final output
    const final = `${prefix}

--> BEGIN Initial Module Definitions <--

${definitions}

--> END Initial Module Definitions <--


--> BEGIN Alias/Equivalent Module Path Definitions <--

${equivalentDefinitions}

--> END Alias/Equivalent Module Path Definitions <--


${postfix}
`;
    const end = performance.now();
    console.log(`Bundled ${relativeFiles.length} Lua files in ${Math.floor((end - start) * 10) / 10}ms | Node has been running for ${Math.floor(end)}ms`);
    return final; // i dont care anymore
  })();
};
