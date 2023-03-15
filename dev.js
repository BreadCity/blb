#!/usr/bin/env node
const express = require('express');
const { writeFileSync, existsSync, mkdirSync, readFileSync } = require('fs');
if (!existsSync(process.cwd()+'/bundler-config')) mkdirSync(process.cwd()+'/bundler-config')
const toggleFlag = existsSync(process.cwd()+'/bundler-config/toggle-flag.md');
if (toggleFlag) writeFileSync(process.cwd()+'/bundler-config/toggle-flag.md',`<!--
  Reading this in a text editor?
  Visit https://github.com/BreadCity/create-blb/blob/main/templateFiles/all/bundler-config/toggle-flag.md in a browser to see this rendered as markdown
-->

> If this file isn't present, \`-- toggle prod/dev only mode\` will no longer toggle code removal.
>
> An example of this functionality is provided below:

### Example input

\`\`\`lua
print 'a'
-- toggle prod only mode
print 'b'
-- toggle prod only mode
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
\`\`\`

### Example output in dev with \`toggle-flag.md\`:

\`\`\`lua
print 'a'
-- removed prod-only code
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
\`\`\`

### Example output in prod with \`toggle-flag.md\`:

\`\`\`lua
print 'a'
-- removed prod-only code
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
\`\`\`

### Example output in dev/prod without \`toggle-flag.md\`:

\`\`\`lua
print 'a'
-- toggle prod only mode
print 'b'
-- toggle prod only mode
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
\`\`\`
`)
if (!existsSync(process.cwd()+'/bundler-config/dev-prefix.lua')) writeFileSync(process.cwd()+'/bundler-config/dev-prefix.lua','-- This file (bundler-config/dev-prefix.lua) is prepended to the output file\n')
const devPrefix = readFileSync(process.cwd()+'/bundler-config/dev-prefix.lua','utf-8')
const bundle = require('.');
const app = express();
app.all('/*.lua', async (_, rs) => {
  let final = await bundle(`-- Built at ${new Date} / Development --
${devPrefix}`);
  final=`local dev,prod=false,true;${final}`
  if (process.argv.includes('--prod-replace-flag') || process.argv.includes('--replace-flag') || toggleFlag)
    final=final.split('-- toggle prod only mode').filter((v,idx)=>idx%2===0).join('-- removed prod-only code')
  rs.set('content-type', 'text/plain; charset=utf-8').send(final);
  writeFileSync('out.lua', final);
});
app.listen(16969, () => console.log(`> Listening on port 16969 <
Load Using:
- Roblox Executor:
    loadstring(game:HttpGetAsync'http://127.0.0.1:16969/build.lua','devbuild.rbx')(); ${/* as provided by expo's code */ ''}
- ComputerCraft Lua:
    (function(rq)loadstring(rq.readAll(),'devbuild-wrapper')();rq.close();end)(http.get('https://github.com/BreadCity/blb/raw/main/.cc-devloader.lua'));
    --> requires changing config/computercraft.cfg to allow 127.0.0.0
- ComputerCraft Shell:
    wget run http://127.0.0.1:16969/build.lua`));
