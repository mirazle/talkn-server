local cjson = require "cjson"
-- local http = require "resty.http"

local function load_routing_table()
    local filepath = "./contracts.json"
    local file, err = io.open(filepath, "r")
    if not file then
        ngx.log(ngx.ERR, "Failed to open file: ", err)
        return nil
    end
    local content = file:read("*a")
    file:close()
    return cjson.decode(content)
end

local function dynamic_routing()
    local routing_table = load_routing_table()
    if not routing_table then
        ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
    end
    local uri = ngx.var.uri
    for _, contract in ipairs(routing_table.contracts) do
        if uri:find(contract.location) then
            ngx.var.target = contract.proxy_pass
            break
        end
    end

    if ngx.var.target then
        ngx.req.set_header("Host", ngx.var.host)
        ngx.log(ngx.ERR, "@ DEBUG ", ngx.var.target)
        -- ngx.proxy_pass = ngx.var.target
        -- ngx.redirect(ngx.var.target)
        ngx.exec('@proxy')
    else
        ngx.say("No matching proxy_pass configuration found")
    end
end

dynamic_routing()
