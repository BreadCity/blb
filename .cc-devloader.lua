---@diagnostic disable: deprecated
-- ComputerCraft Development Loader
local _http_url = 'http://127.0.0.1:16969/build.lua';
(function(rq)
  if not rq then
    ---@diagnostic disable-next-line: undefined-global
    local checkSuccess, checkException = http.checkURL(_http_url)
    if not checkSuccess then
      error(
        'HTTP URL Check failed with: '
          .. checkException
          .. '\nYou may need to tweak your computercraft config (.minecraft/config/computercraft.cfg for local) to allow 127.0.0.0'
      )
    end
    error 'HTTP Failed - Unknown Reason. Check that the server is accessible.'
  end
  (loadstring or load)(rq.readAll(), 'devbuild.cc')()
  rq.close()
  ---@diagnostic disable-next-line: undefined-global
end)(http.get(_http_url))
