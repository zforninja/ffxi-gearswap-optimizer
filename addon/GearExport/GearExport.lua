--[[
    GearExport — export your equipment inventory to JSON for Windower 4.

    Commands (//gearexport or //ge):
        (none)      scan every accessible bag and write data/<CharName>.json
        help        show this list

    The export contains every equippable item found in Inventory, all Mog
    Wardrobes, Satchel, Sack, Case, Safe, Safe 2 and Locker, along with the
    character's current jobs. Feed the resulting file to the gear optimizer.

    This addon only reads. It never moves, equips or otherwise touches items.

    Lua 5.1 notes: Windower has no bitwise operators, so bitmask work uses
    math.floor / modulo. Every Windower API call is wrapped in pcall so a
    missing bag or an odd resources build cannot crash the addon.
]]

_addon.name = 'GearExport'
_addon.author = 'GearExport contributors'
_addon.version = '1.1.0'
_addon.commands = { 'gearexport', 'ge' }

local res = require('resources')

-- Windower's extdata library decodes the 24-byte per-item blob that carries
-- augments (Herculean/Odyssey/Ambuscade/Reisenjima gear, JSE capes, ...).
local extdata_ok, extdata = pcall(require, 'extdata')
if not extdata_ok then extdata = nil end

local INFO, WARN, GOOD = 207, 123, 204

local function say(msg, color)
    windower.add_to_chat(color or INFO, 'GearExport: ' .. tostring(msg))
end

-- ---------------------------------------------------------------------------
-- Static tables
-- ---------------------------------------------------------------------------

-- Bags to scan, in export order. `name` matches what the web app expects.
-- Bag 2 (Furniture Storage) and bag 3 (Temporary) are skipped: neither can
-- hold equipment the optimizer cares about.
local BAGS = {
    { id = 0,  key = 'inventory', name = 'Inventory'  },
    { id = 8,  key = 'wardrobe',  name = 'Wardrobe'   },
    { id = 10, key = 'wardrobe2', name = 'Wardrobe 2' },
    { id = 11, key = 'wardrobe3', name = 'Wardrobe 3' },
    { id = 12, key = 'wardrobe4', name = 'Wardrobe 4' },
    { id = 13, key = 'wardrobe5', name = 'Wardrobe 5' },
    { id = 14, key = 'wardrobe6', name = 'Wardrobe 6' },
    { id = 15, key = 'wardrobe7', name = 'Wardrobe 7' },
    { id = 16, key = 'wardrobe8', name = 'Wardrobe 8' },
    { id = 5,  key = 'satchel',   name = 'Satchel'    },
    { id = 6,  key = 'sack',      name = 'Sack'       },
    { id = 7,  key = 'case',      name = 'Case'       },
    { id = 1,  key = 'safe',      name = 'Safe'       },
    { id = 9,  key = 'safe2',     name = 'Safe 2'     },
    { id = 4,  key = 'locker',    name = 'Locker'     },
}

-- Wardrobes only ever hold equipment, so an item there with no resource entry
-- is still exported (as Unknown) rather than dropped.
local EQUIPMENT_ONLY_BAGS = {
    [8] = true, [10] = true, [11] = true, [12] = true,
    [13] = true, [14] = true, [15] = true, [16] = true,
}

-- Job ids as used by the game, FFXI resources and the gear database
-- (WAR = 1 ... GEO = 21, RUN = 22). Used only as a fallback when get_player()
-- does not expose main_job_id / sub_job_id on the installed Windower build.
local JOB_IDS = {
    NON = 0,  WAR = 1,  MNK = 2,  WHM = 3,  BLM = 4,  RDM = 5,  THF = 6,
    PLD = 7,  DRK = 8,  BST = 9,  BRD = 10, RNG = 11, SAM = 12, NIN = 13,
    DRG = 14, SMN = 15, BLU = 16, COR = 17, PUP = 18, DNC = 19, SCH = 20,
    GEO = 21, RUN = 22,
}

-- Item status values reported by get_items entries.
local STATUS_EQUIPPED = 1

-- ---------------------------------------------------------------------------
-- Bit helpers (Lua 5.1 has no bitwise operators)
-- ---------------------------------------------------------------------------

local function has_bit(value, bit)
    if type(value) ~= 'number' then return false end
    return math.floor(value / (2 ^ bit)) % 2 == 1
end

-- ---------------------------------------------------------------------------
-- Minimal JSON encoder
-- ---------------------------------------------------------------------------
-- Windower's bundled json library only decodes, so we carry a small encoder.
-- Objects are emitted with keys in a fixed order (when provided) so the file
-- is stable and easy to diff; arrays are 1..n tables.

local ESCAPES = {
    ['"'] = '\\"', ['\\'] = '\\\\', ['\b'] = '\\b', ['\f'] = '\\f',
    ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t',
}

local function encode_string(s)
    s = s:gsub('[%c\\"]', function(c)
        return ESCAPES[c] or string.format('\\u%04x', string.byte(c))
    end)
    return '"' .. s .. '"'
end

local function encode_number(n)
    if n ~= n or n == math.huge or n == -math.huge then return '0' end
    if math.floor(n) == n and math.abs(n) < 1e15 then
        return string.format('%d', n)
    end
    return string.format('%.14g', n)
end

local function is_array(t)
    local n = 0
    for k in pairs(t) do
        if type(k) ~= 'number' or k <= 0 or math.floor(k) ~= k then return false end
        if k > n then n = k end
    end
    for i = 1, n do
        if t[i] == nil then return false end
    end
    return true, n
end

local encode_value

-- `order` is an optional list of keys giving the emit order for an object.
-- Keys not in the list are appended alphabetically. Tables may carry their
-- own order under the `__order` field.
local function encode_table(t, indent)
    local pad = string.rep('  ', indent)
    local pad_in = string.rep('  ', indent + 1)
    local arr, n = is_array(t)

    if arr then
        if n == 0 then return '[]' end
        local parts = {}
        for i = 1, n do
            parts[i] = pad_in .. encode_value(t[i], indent + 1)
        end
        return '[\n' .. table.concat(parts, ',\n') .. '\n' .. pad .. ']'
    end

    local keys, seen = {}, {}
    if type(t.__order) == 'table' then
        for _, k in ipairs(t.__order) do
            if t[k] ~= nil and not seen[k] then
                keys[#keys + 1] = k
                seen[k] = true
            end
        end
    end
    local rest = {}
    for k in pairs(t) do
        if k ~= '__order' and not seen[k] and (type(k) == 'string' or type(k) == 'number') then
            rest[#rest + 1] = k
        end
    end
    table.sort(rest, function(a, b) return tostring(a) < tostring(b) end)
    for _, k in ipairs(rest) do keys[#keys + 1] = k end

    if #keys == 0 then return '{}' end
    local parts = {}
    for _, k in ipairs(keys) do
        parts[#parts + 1] = pad_in .. encode_string(tostring(k)) .. ': '
            .. encode_value(t[k], indent + 1)
    end
    return '{\n' .. table.concat(parts, ',\n') .. '\n' .. pad .. '}'
end

function encode_value(v, indent)
    indent = indent or 0
    local t = type(v)
    if v == nil then return 'null'
    elseif t == 'boolean' then return v and 'true' or 'false'
    elseif t == 'number' then return encode_number(v)
    elseif t == 'string' then return encode_string(v)
    elseif t == 'table' then return encode_table(v, indent)
    end
    return 'null'
end

local function json_encode(value)
    return encode_value(value, 0)
end

-- ---------------------------------------------------------------------------
-- Game state helpers (every Windower call is pcall-wrapped)
-- ---------------------------------------------------------------------------

local function safe_call(fn, ...)
    if type(fn) ~= 'function' then return nil end
    local ok, result = pcall(fn, ...)
    if ok then return result end
    return nil
end

local function logged_in()
    local info = safe_call(windower.ffxi.get_info)
    return type(info) == 'table' and info.logged_in and true or false
end

local function get_player()
    local p = safe_call(windower.ffxi.get_player)
    if type(p) ~= 'table' then return nil end
    return p
end

-- Windower stores English names under `en` on modern builds; older builds and
-- some forks use `english` or `name`. Try each.
local function english(r)
    return r.en or r.english or r.name
end

local function bag_info(bag_id)
    local info = safe_call(windower.ffxi.get_bag_info, bag_id)
    if type(info) == 'table' then
        return {
            count   = tonumber(info.count) or 0,
            max     = tonumber(info.max) or 0,
            enabled = info.enabled and true or false,
        }
    end
    return { count = 0, max = 0, enabled = false }
end

-- Inventory is always available. Other bags follow the game's `enabled`
-- flag, but that flag is known to lag for Wardrobes 5-8, so any bag that
-- reports items is treated as available too.
local function bag_available(bag_id, info)
    if bag_id == 0 then return true end
    return info.enabled or info.count > 0
end

-- ---------------------------------------------------------------------------
-- Item metadata from resources
-- ---------------------------------------------------------------------------

-- Returns a table describing the item, or nil when the id is unknown to the
-- installed resources build.
local function item_meta(id)
    local r = res and res.items and res.items[id]
    if type(r) ~= 'table' then return nil end

    local slots = tonumber(r.slots) or 0
    local category = tostring(r.category or '')
    local equippable = slots > 0 or category == 'Weapon' or category == 'Armor'

    if category == '' then
        if slots > 0 then
            -- Main/Sub/Ranged/Ammo are bits 0-3; anything else is armor.
            local weapon = has_bit(slots, 0) or has_bit(slots, 1)
                or has_bit(slots, 2) or has_bit(slots, 3)
            category = weapon and 'Weapon' or 'Armor'
        else
            category = 'General'
        end
    end

    return {
        name       = english(r) or ('Item ' .. tostring(id)),
        jobs       = tonumber(r.jobs) or 0,
        slots      = slots,
        level      = tonumber(r.level) or 0,
        item_level = tonumber(r.item_level) or 0,
        category   = category,
        equippable = equippable,
    }
end

-- ---------------------------------------------------------------------------
-- Scanning
-- ---------------------------------------------------------------------------

local ITEM_ORDER = {
    'id', 'name', 'bag', 'bagId', 'slotIndex', 'equipped',
    'jobs', 'slots', 'level', 'iLevel', 'category', 'augments',
}

-- Decode augments for a get_items entry. Returns a list of strings such as
-- "STR+10", "Accuracy+15", "\"Store TP\"+5", "Path: A", "Rank: 15".
-- Returns an empty list when the item has no augments or decoding fails.
local function item_augments(e)
    if not extdata or type(e) ~= 'table' or not e.extdata then return {} end
    local ok, decoded = pcall(extdata.decode, e)
    if not ok or type(decoded) ~= 'table' then return {} end
    local out = {}
    local augs = decoded.augments
    if type(augs) == 'table' then
        for _, a in ipairs(augs) do
            local txt = tostring(a or '')
            if txt ~= '' and txt:lower() ~= 'none' then out[#out + 1] = txt end
        end
    end
    -- Odyssey / Su5 gear expose path and rank separately in some builds
    if decoded.path and decoded.path ~= '' then out[#out + 1] = 'Path: ' .. tostring(decoded.path) end
    if decoded.rank and tonumber(decoded.rank) and tonumber(decoded.rank) > 0 then out[#out + 1] = 'Rank: ' .. tostring(decoded.rank) end
    return out
end

-- Read one bag. Returns a list of exported items and a per-bag summary.
-- Returns nil when the bag is not accessible right now, or nil plus an error
-- string when the bag should be readable but get_items failed.
local function scan_bag(def)
    local info = bag_info(def.id)
    if not bag_available(def.id, info) then return nil end

    local ok, raw = pcall(windower.ffxi.get_items, def.id)
    if not ok then return nil, tostring(raw) end
    if type(raw) ~= 'table' then return nil, 'get_items returned no data' end

    local max = tonumber(raw.max) or info.max
    if not max or max <= 0 then max = 80 end

    local items, total = {}, 0
    for slot = 1, max do
        local e = raw[slot]
        if type(e) == 'table' and tonumber(e.id) and e.id ~= 0 then
            total = total + 1
            local id = tonumber(e.id)
            local meta = item_meta(id)
            local include = false

            if meta then
                include = meta.equippable
            elseif EQUIPMENT_ONLY_BAGS[def.id] then
                -- Wardrobes only hold equipment; keep the item even without
                -- resource data so nothing silently vanishes from the export.
                include = true
                meta = {
                    name = 'Unknown (' .. tostring(id) .. ')',
                    jobs = 0, slots = 0, level = 0, item_level = 0,
                    category = 'Unknown',
                }
            end

            if include then
                local status = tonumber(e.status) or 0
                items[#items + 1] = {
                    __order   = ITEM_ORDER,
                    id        = id,
                    name      = meta.name,
                    bag       = def.name,
                    bagId     = def.id,
                    slotIndex = slot,
                    equipped  = (status == STATUS_EQUIPPED),
                    jobs      = meta.jobs,
                    slots     = meta.slots,
                    level     = meta.level,
                    iLevel    = meta.item_level,
                    category  = meta.category,
                    augments  = item_augments(e),
                }
            end
        end
    end

    return items, {
        __order   = { 'name', 'bagId', 'max', 'itemCount', 'equipmentCount' },
        name      = def.name,
        bagId     = def.id,
        max       = max,
        itemCount = total,
        equipmentCount = #items,
    }
end

local function job_id(abbr, explicit)
    local n = tonumber(explicit)
    if n then return n end
    return JOB_IDS[tostring(abbr or ''):upper()] or 0
end

local function character_info(player)
    local main = tostring(player.main_job or 'NON'):upper()
    local sub  = tostring(player.sub_job or 'NON'):upper()
    return {
        __order = { 'name', 'mainJob', 'subJob', 'mainJobLevel', 'subJobLevel',
                    'mainJobId', 'subJobId' },
        name         = tostring(player.name or 'Unknown'),
        mainJob      = main,
        subJob       = sub,
        mainJobLevel = tonumber(player.main_job_level) or 0,
        subJobLevel  = tonumber(player.sub_job_level) or 0,
        mainJobId    = job_id(main, player.main_job_id),
        subJobId     = job_id(sub, player.sub_job_id),
    }
end

-- Build the full export table. Returns the table plus a list of warnings.
local function build_export()
    local player = get_player()
    if not player or not player.name then
        return nil, { 'Player data is not available yet. Try again in a moment.' }
    end

    local export = {
        __order    = { 'character', 'exportDate', 'addonVersion', 'bags', 'items' },
        character  = character_info(player),
        exportDate = os.date('%Y-%m-%dT%H:%M:%S'),
        addonVersion = _addon.version,
        bags       = {},
        items      = {},
    }

    local warnings = {}
    for _, def in ipairs(BAGS) do
        local ok, items, summary = pcall(scan_bag, def)
        if not ok or (items == nil and summary ~= nil) then
            -- `items` holds the error message when pcall itself failed;
            -- `summary` holds it when scan_bag returned nil, err.
            local reason = ok and summary or items
            warnings[#warnings + 1] = ('Could not read %s: %s'):format(def.name, tostring(reason))
        elseif items then
            export.bags[#export.bags + 1] = summary
            for _, it in ipairs(items) do
                export.items[#export.items + 1] = it
            end
        end
    end

    return export, warnings
end

-- ---------------------------------------------------------------------------
-- File output
-- ---------------------------------------------------------------------------

local function data_dir()
    local base = windower.addon_path or ''
    if base ~= '' and base:sub(-1) ~= '/' and base:sub(-1) ~= '\\' then
        base = base .. '/'
    end
    return base .. 'data/'
end

local function ensure_dir(path)
    if windower.dir_exists and windower.create_dir then
        local exists = safe_call(windower.dir_exists, path)
        if not exists then
            safe_call(windower.create_dir, path)
        end
    end
end

-- File names must be safe on Windows; character names already are, but a
-- defensive strip costs nothing.
local function safe_filename(name)
    return (tostring(name):gsub('[^%w%-_]', '_'))
end

local function write_file(path, text)
    local fh, err = io.open(path, 'w')
    if not fh then return false, err end
    local ok, werr = fh:write(text)
    fh:close()
    if not ok then return false, werr end
    return true
end

-- ---------------------------------------------------------------------------
-- Commands
-- ---------------------------------------------------------------------------

local function do_export()
    if not logged_in() then
        say('Not logged in.', WARN)
        return
    end

    local export, warnings = build_export()
    if not export then
        for _, w in ipairs(warnings or {}) do say(w, WARN) end
        return
    end

    local dir = data_dir()
    ensure_dir(dir)
    local path = dir .. safe_filename(export.character.name) .. '.json'

    local ok_enc, text = pcall(json_encode, export)
    if not ok_enc then
        say('Could not encode export: ' .. tostring(text), WARN)
        return
    end

    local ok, err = write_file(path, text)
    if not ok then
        say('Could not write ' .. path .. ': ' .. tostring(err), WARN)
        return
    end

    for _, w in ipairs(warnings) do say(w, WARN) end

    local c = export.character
    say(('Exported %d equipment items for %s (%s/%s)'):format(
        #export.items, c.name, c.mainJob, c.subJob), GOOD)
    say(('Scanned %d bag(s). File: %s'):format(#export.bags, path))
end

local function show_help()
    say('Commands:')
    say('  //ge          export equipment from all accessible bags to data/<CharName>.json')
    say('  //ge help     show this help')
    say('Note: Safe, Safe 2 and Locker are only readable inside your Mog House.')
end

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

windower.register_event('load', function()
    say(('v%s loaded. Type "//ge" to export your gear.'):format(_addon.version))
end)

windower.register_event('addon command', function(cmd, ...)
    cmd = tostring(cmd or ''):lower()
    if cmd == '' or cmd == 'export' or cmd == 'go' or cmd == 'run' then
        local ok, err = pcall(do_export)
        if not ok then say('Error: ' .. tostring(err), WARN) end
    elseif cmd == 'help' or cmd == '?' then
        show_help()
    else
        say('Unknown command: ' .. cmd, WARN)
        show_help()
    end
end)
