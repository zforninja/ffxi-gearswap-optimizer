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
    -- Unity Ranking rings (Wanted-battle gear); ids from UNITY_ITEM_IDS in GearExport.lua.
    [10768] = { en = 'Gelatinous Ring', category = 'Armor', jobs = 8388606, slots = 24576, level = 99, item_level = 0 },
    [10770] = { en = 'Cacoethic Ring', category = 'Armor', jobs = 8388606, slots = 24576, level = 99, item_level = 0 },
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
        -- Stale cache: 24 zero bytes (a real item's extdata header is never all-zero).
        -- Windower never actually synced this slot this session - see docs/CSV_IMPORT.md.
        [3] = { id = 10768, count = 1, status = 0, extdata = string.rep(string.char(0), 24) },
        -- Synced fine: non-zero header bytes, no augments decoded (no real `extdata` lib
        -- in this plain-Lua harness) - must NOT be flagged stale.
        [4] = { id = 10770, count = 1, status = 0, extdata = string.char(1, 1, 0, 136) .. string.rep(string.char(0), 20) },
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
check(chat_has('Exported 7 equipment items for Testchar %(WAR/SAM%)'), 'summary line correct')
check(chat_has('1 Unity item%(s%) had no augment data'), 'stale Unity item reported as warning')
check(chat_has('Gelatinous Ring %(Wardrobe slot 3%)'), 'stale Unity warning names the item and slot')
check(not chat_has('Cacoethic'), 'synced Unity item is not flagged stale')

local path = root .. '/data/Testchar.json'
local text = read_file(path)
check(text ~= nil, 'JSON file written to data/')
check(text:find('"id": 10768') and text:find('"stale": true'), 'stale flag present in JSON for the un-synced item')
check(text:find('"id": 10770') and text:find('"stale": false'), 'synced item marked stale: false in JSON')

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

-- --------------------------------------------------------------------------
-- Native augment resolution (windower.ffxi.get_item_augments) and //ge probe
-- --------------------------------------------------------------------------
-- This harness never has a real `extdata` library (require('extdata') fails under plain Lua), so every prior
-- assertion above already exercises the "can't resolve at all" path - GearExport.lua must fall back cleanly,
-- which it does. This block instead simulates a Windower build where the native API *is* present, to check it
-- gets used, deduped correctly, and doesn't leave a stale Path/Rank fallback marker behind when it succeeds.
mock.player = { name = 'Testchar', main_job = 'WAR', sub_job = 'SAM', main_job_level = 99, sub_job_level = 49, main_job_id = 1, sub_job_id = 12 }
_G.windower.ffxi.get_item_augments = function(x)
    -- Only resolves Cacoethic Ring (10770); everything else (including by-id calls for it) returns nil, like a
    -- real client that only knows about items it can currently render a tooltip for.
    if x == 10770 or (type(x) == 'table' and x.id == 10770) then
        return { 'Accuracy+40', 'All Attr.+10', '"Triple Attack"+4%' }
    end
    return nil
end

local chunk2, err2 = loadfile(root .. '/GearExport.lua')
assert(chunk2, err2)
chunk2()

mock.chat = {}
mock.events['addon command']()
local t3 = read_file(root .. '/data/Testchar.json') or ''
check(t3:find('"id": 10770') and t3:find('Accuracy%+40') and t3:find('All Attr%.%+10'), 'native get_item_augments result merged into export for the resolved item')
check(not t3:find('"id": 10770[^}]*Rank:'), 'Path/Rank fallback marker suppressed once native resolution succeeded')
check(t3:find('"id": 10768') ~= nil, 'unresolved Unity item (native fn returns nil) still exported')

mock.chat = {}
local pok = pcall(mock.events['addon command'], 'probe', 8, 4)
check(pok, 'probe command does not error')
check(chat_has('get_item_augments exists: true'), 'probe reports native fn presence')
check(chat_has('Accuracy%+40'), 'probe shows the resolved augment text')
local probe_text = read_file(root .. '/data/probe.txt')
check(probe_text ~= nil and probe_text:find('Cacoethic'), 'probe.txt written with item name')
check(read_file(root .. '/data/Testchar.json') == t3, 'probe does not modify the real export file')

mock.chat = {}
local pok2 = pcall(mock.events['addon command'], 'probe')
check(pok2, 'probe with no args does not error')
check(chat_has('Usage: //ge probe'), 'probe with missing args prints usage')

os.remove(root .. '/data/Testchar.json')
os.remove(root .. '/data/probe.txt')
os.remove(root .. '/data/Legacy.json')

print(failures == 0 and 'ALL TESTS PASSED' or (failures .. ' TEST(S) FAILED'))
os.exit(failures == 0 and 0 or 1)
