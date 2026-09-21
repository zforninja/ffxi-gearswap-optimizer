-- Runs GearExport.lua against the mock Windower environment.
-- Usage (from GearExport/):  lua5.1 test/run_tests.lua
-- Prints PASS/FAIL lines and exits non-zero on failure.

local here = arg and arg[0] and arg[0]:match('^(.*)/[^/]*$') or 'test'
local root = here .. '/..'
package.path = here .. '/?.lua;' .. package.path

local mock = require('mock_windower')
mock.install(root .. '/')

local failures = 0
local function check(cond, label)
    if cond then print('PASS  ' .. label) else failures = failures + 1; print('FAIL  ' .. label) end
end

local function last_chat()
    return mock.chat[#mock.chat] and mock.chat[#mock.chat].msg or ''
end

local function chat_has(pattern)
    for _, c in ipairs(mock.chat) do
        if c.msg:find(pattern) then return true end
    end
    return false
end

local function read_file(p)
    local f = io.open(p, 'r'); if not f then return nil end
    local s = f:read('*a'); f:close(); return s
end

-- Resources: a weapon, a body piece, a ring, a consumable, a Currency.
mock.resources.items = {
    [21621] = { en = 'Naegling', category = 'Weapon', jobs = 2209777, slots = 3, level = 99, item_level = 119 },
    [10240] = { en = 'Hexed Haubert', category = 'Armor', jobs = 8641, slots = 32, level = 99, item_level = 0 },
    [28540] = { english = 'Ilabrat Ring', category = 'Armor', jobs = 8388606, slots = 24576, level = 99, item_level = 0 },
    [4112]  = { en = 'Potion', category = 'Usable', slots = 0 },
    [65535] = { en = 'Gil', category = 'Currency' },
    -- Old resource build: no category string, only slots bitmask.
    [12345] = { name = 'Legacy Helm', slots = 16, jobs = 1, level = 50 },
}

-- Bags
mock.bag_info = {
    [0]  = { count = 4, max = 80, enabled = true },
    [8]  = { count = 2, max = 80, enabled = true },
    [13] = { count = 1, max = 80, enabled = false },  -- wardrobe5 flag lags
    [14] = { count = 0, max = 80, enabled = false },  -- wardrobe6 truly empty/off
    [5]  = { count = 1, max = 80, enabled = true },
    [1]  = { count = 0, max = 0,  enabled = false },  -- safe: not in mog house
}
mock.bags = {
    [0]  = { max = 80,
        [1] = { id = 21621, count = 1, status = 1 },
        [2] = { id = 4112,  count = 12, status = 0 },
        [3] = { id = 65535, count = 1000, status = 0 },
        [7] = { id = 12345, count = 1, status = 0 },
    },
    [8]  = { max = 80,
        [1] = { id = 10240, count = 1, status = 1 },
        [2] = { id = 99999, count = 1, status = 0 },  -- unknown id in a wardrobe
    },
    [13] = { max = 80, [5] = { id = 28540, count = 1, status = 0 } },
    [14] = { max = 80 },
    [5]  = { max = 80, [1] = { id = 4112, count = 1, status = 0 } },
}
-- Satchel is available, but make get_items throw for it to test recovery.
mock.fail_bags[5] = true

-- Load the addon
local chunk, err = loadfile(root .. '/GearExport.lua')
assert(chunk, err)
chunk()

check(_addon.name == 'GearExport', '_addon.name set')
check(_addon.commands[1] == 'gearexport' and _addon.commands[2] == 'ge', 'commands registered')
check(type(mock.events['load']) == 'function', 'load event registered')
check(type(mock.events['addon command']) == 'function', 'addon command event registered')

mock.events['load']()
check(last_chat():find('loaded'), 'load message printed')

-- Not logged in
mock.logged_in = false
mock.events['addon command']()
check(last_chat():find('Not logged in'), 'refuses when not logged in')
mock.logged_in = true

-- Export
mock.chat = {}
mock.events['addon command']()
check(chat_has('Could not read Satchel'), 'bag read failure reported as warning')
check(chat_has('Exported 5 equipment items for Testchar %(WAR/SAM%)'), 'summary line correct')

local path = root .. '/data/Testchar.json'
local text = read_file(path)
check(text ~= nil, 'JSON file written to data/')

-- Keep a copy for the strict structural check done by test/check_export.py.
local keep = io.open(root .. '/test/last_export.json', 'w')
keep:write(text); keep:close()

-- Fallback job id lookup when the build lacks main_job_id
mock.player = { name = 'Legacy', main_job = 'RUN', sub_job = 'BLU', main_job_level = 99 }
mock.chat = {}
mock.events['addon command']()
local t2 = read_file(root .. '/data/Legacy.json') or ''
check(t2:find('"mainJobId": 22') and t2:find('"subJobId": 16'), 'job ids derived from abbreviations')
check(t2:find('"subJobLevel": 0'), 'missing sub job level defaults to 0')

-- Help and unknown commands
mock.chat = {}
mock.events['addon command']('help')
check(chat_has('//ge'), 'help output')
mock.chat = {}
mock.events['addon command']('bogus')
check(chat_has('Unknown command: bogus'), 'unknown command reported')

-- Player not available
mock.player = nil
mock.chat = {}
mock.events['addon command']()
check(chat_has('Player data is not available'), 'missing player handled')

os.remove(root .. '/data/Testchar.json')
os.remove(root .. '/data/Legacy.json')

print(failures == 0 and 'ALL TESTS PASSED' or (failures .. ' TEST(S) FAILED'))
os.exit(failures == 0 and 0 or 1)
