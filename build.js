#!/usr/bin/env node
const lib = require('.');
const fs = require('fs');
const luamin = require('luamin');
const toggleFlag = fs.existsSync(process.cwd()+'/bundler-config/toggle-flag.md');
lib('').then(res => {
  res=`local dev,prod=false,true;${res}`
  if (process.argv.includes('--dev-replace-flag') || process.argv.includes('--replace-flag') || toggleFlag)
    res=res.split('-- toggle dev only mode').filter((v,idx)=>idx%2===0).join('-- removed dev-only code')
  if (!process.argv.includes('--no-minify'))
    try {
      res = luamin.minify(res);
    } catch (e) {
      console.warn('Error occurred while minifying:\n', e, '\nDisable minifying using --no-minify');
    }
  fs.writeFileSync('out.lua', `-- Built at ${new Date} / Production --
${res}`);
});
