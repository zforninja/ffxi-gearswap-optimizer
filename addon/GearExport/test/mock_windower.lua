-- Test harness: fakes the Windower 4 environment well enough to load
-- GearExport.lua under a plain Lua 5.1 interpreter and drive its commands.
-- Not shipped as part of the addon; run from the repo with the test script.

local M = {}

M.chat = {}
M.events = {}
M.player = {
    name = 'Testchar', main_job = 'WAR', sub_job = 'SAM',
    main_job_level = 99, sub_job_level = 49, main_job_id = 1, sub_job_id = 12,
}
M.logged_in = true
M.bags = {}          -- bag_id -> { max = n, [slot] = { id, count, status } }
M.bag_info = {}      -- bag_id -> { count, max, enabled }
M.fail_bags = {}     -- bag_id -> true to make get_items throw
M.resources = { items = {} }

local function bag_items(bag_id)
    if M.fail_bags[bag_id] then error('simulated get_items failure') end
    return M.bags[bag_id]
end

function M.install(addon_path)
    _G._addon = {}
    _G.windower = {
        addon_path = addon_path,
        add_to_chat = function(color, msg) M.chat[#M.chat + 1] = { color = color, msg = msg } end,
        register_event = function(name, fn) M.events[name] = fn end,
        dir_exists = function(p) local f = io.open(p .. '/.probe', 'w'); if f then f:close(); os.remove(p .. '/.probe'); return true end return false end,
        create_dir = function(p) os.execute('mkdir -p "' .. p .. '"') end,
        ffxi = {
            get_info = function() return { logged_in = M.logged_in } end,
            get_player = function() return M.player end,
            get_bag_info = function(id) return M.bag_info[id] end,
            get_items = function(id) return bag_items(id) end,
        },
    }
    package.loaded['resources'] = M.resources
end

return M
