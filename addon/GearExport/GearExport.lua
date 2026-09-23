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
_addon.version = '1.3.0'
_addon.commands = { 'gearexport', 'ge' }

local res = require('resources')

-- Windower's extdata library decodes the 24-byte per-item blob that carries
-- augments (Herculean/Odyssey/Ambuscade/Reisenjima gear, JSE capes, ...).
local extdata_ok, extdata = pcall(require, 'extdata')
if not extdata_ok then extdata = nil end

-- Item IDs known to carry a Unity Ranking bonus (Wanted-battle gear). Generated from the optimizer's own
-- gear_database.json (public/data/gear_database.json -> items where `unity` is set); regenerate the same way if
-- the gear DB adds more. Used only to flag when one of these came back with no augment data this session, since
-- a real Unity item can never have a zero bonus - it always carries a Path/Rank or ranked-stat augment.
local UNITY_ITEM_IDS = {
    [10768]='Gelatinous Ring',
    [10769]='Gelatinous Ring +1',
    [10770]='Cacoethic Ring',
    [10771]='Cacoethic Ring +1',
    [20507]='Comeuppances',
    [20508]='Comeuppances +1',
    [20521]='Emeici',
    [20522]='Emeici +1',
    [20527]='Fists of Fury',
    [20528]='Fists of Fury +1',
    [20603]='Ternion Dagger',
    [20604]='Ternion Dagger +1',
    [20606]='Anathema Harpe',
    [20607]='Anathema Harpe +1',
    [20608]='Jugo Kukri',
    [20609]='Jugo Kukri +1',
    [20611]='Sangarius',
    [20612]='Sangarius +1',
    [20613]='Pukulatmuj',
    [20614]='Pukulatmuj +1',
    [20679]='Tanmogayi',
    [20680]='Tanmogayi +1',
    [20681]='Flyssa',
    [20682]='Flyssa +1',
    [20696]='Combuster',
    [20697]='Combuster +1',
    [20708]='Demersal Degen',
    [20709]='Demers. Degen +1',
    [20799]='Mdomo Axe',
    [20800]='Mdomo Axe +1',
    [20804]='Perun',
    [20805]='Perun +1',
    [20806]='Buramgh',
    [20807]='Buramgh +1',
    [20851]='Aizkora',
    [20852]='Aizkora +1',
    [20853]='Beheader',
    [20854]='Beheader +1',
    [20898]='Triska Scythe',
    [20899]='Triska Scythe +1',
    [20942]='Gae Derg',
    [20943]='Gae Derg +1',
    [20980]='Raicho',
    [20981]='Raicho +1',
    [20987]='Tancho',
    [20988]='Tancho +1',
    [21029]='Norifusa',
    [21030]='Norifusa +1',
    [21034]='Kunimune',
    [21035]='Kunimune +1',
    [21075]='Septoptic',
    [21076]='Septoptic +1',
    [21090]='Loxotic Mace',
    [21091]='Loxotic Mace +1',
    [21099]='Magesmasher',
    [21100]='Magesmasher +1',
    [21159]='Marin Staff',
    [21160]='Marin Staff +1',
    [21162]='Pouwhenua',
    [21163]='Pouwhenua +1',
    [21164]='Ababinili',
    [21165]='Ababinili +1',
    [21219]='Paloma Bow',
    [21220]='Paloma Bow +1',
    [21222]='Mengado',
    [21223]='Mengado +1',
    [21329]='Stinger Bullet',
    [21343]='Ghastly Tathlum',
    [21344]='Ghastly Tathlum +1',
    [21349]='Wingcutter',
    [21350]='Wingcutter +1',
    [21416]='Refined Grip',
    [21417]='Refined Grip +1',
    [21418]='Rigorous Grip',
    [21419]='Rigorous Grip +1',
    [21483]='Malison',
    [21484]='Malison +1',
    [21688]='Montante',
    [21689]='Montante +1',
    [21690]='Ushenzi',
    [21691]='Ushenzi +1',
    [21695]='Nullis',
    [21696]='Nullis +1',
    [21702]='Kladenets',
    [21703]='Kladenets +1',
    [21748]='Habilitator',
    [21749]='Habilitator +1',
    [21805]='Pixquizpan',
    [21806]='Pixquizpan +1',
    [22058]='Contemplator +1',
    [22120]='Imati',
    [22121]='Imati +1',
    [22266]='Antitail',
    [22267]='Antitail +1',
    [25601]='Blistering Sallet',
    [25602]='Blistering Sallet +1',
    [25635]='Loess Barbuta',
    [25636]='Loess Barbuta +1',
    [25680]='Cohort Cloak',
    [25681]='Cohort Cloak +1',
    [25709]='Obviation Cuirass',
    [25710]='Obviat. Cuirass +1',
    [25732]='Tatena. Haramaki',
    [25733]='Tatena. Harama. +1',
    [25855]='Tatena. Haidate',
    [25856]='Tatena. Haidate +1',
    [25923]='Tatena. Sune.',
    [25924]='Tatena. Sune. +1',
    [26001]='Loricate Torque',
    [26002]='Loricate Torque +1',
    [26021]='Vim Torque',
    [26022]='Vim Torque +1',
    [26401]='Forfend',
    [26402]='Forfend +1',
    [26709]='Imp. Wing Hairpin',
    [26710]='Imp. Wing Hair. +1',
    [26714]='Adorned Helm',
    [26715]='Adorned Helm +1',
    [26731]='Stinger Helm',
    [26732]='Stinger Helm +1',
    [26784]='Hike Khat',
    [26785]='Hike Khat +1',
    [26786]='Alhazen Hat',
    [26787]='Alhazen Hat +1',
    [26868]='Rosette Jaseran',
    [26869]='Ros. Jaseran +1',
    [26870]='Emet Harness',
    [26871]='Emet Harness +1',
    [26872]='Hime Domaru',
    [26873]='Hime Domaru +1',
    [26887]='Shomonjijoe',
    [26888]='Shomonjijoe +1',
    [26896]='Lugra Cloak',
    [26897]='Lugra Cloak +1',
    [26942]='Agony Jerkin',
    [26943]='Agony Jerkin +1',
    [27050]='Kachimusha Kote',
    [27051]='Kachi. Kote +1',
    [27107]='Asteria Mitts +1',
    [27108]='Lamassu Mitts',
    [27109]='Lamassu Mitts +1',
    [27148]='Tatena. Gote',
    [27149]='Tatena. Gote +1',
    [27150]='Gazu Bracelets',
    [27151]='Gazu Bracelets +1',
    [27230]='Zoar Subligar',
    [27231]='Zoar Subligar +1',
    [27407]='Hygieia Clogs',
    [27408]='Hygieia Clogs +1',
    [27409]='Hippomenes Socks',
    [27410]='Hippo. Socks +1',
    [27504]='Warder\'s Charm',
    [27505]='Warder\'s Charm +1',
    [27508]='Unmoving Collar',
    [27509]='Unmoving Collar +1',
    [27517]='Bathy Choker',
    [27518]='Bathy Choker +1',
    [27532]='Zwazo Earring',
    [27533]='Zwazo Earring +1',
    [27542]='Dominance Earring',
    [27543]='Domin. Earring +1',
    [27548]='Odnowa Earring',
    [27549]='Odnowa Earring +1',
    [27558]='Mephitas\'s Ring',
    [27559]='Mephitas\'s Ring +1',
    [27560]='Apeile Ring',
    [27561]='Apeile Ring +1',
    [27562]='Metamorph Ring',
    [27563]='Metamor. Ring +1',
    [27601]='Grounded Mantle',
    [27602]='Ground. Mantle +1',
    [27609]='Fi Follet Cape',
    [27610]='Fi Follet Cape +1',
    [27619]='Aurist\'s Cape',
    [27620]='Aurist\'s Cape +1',
    [27636]='Evalach',
    [27637]='Evalach +1',
    [27638]='Ajax',
    [27639]='Ajax +1',
    [27640]='Deliverance',
    [27641]='Deliverance +1',
    [27993]='Macabre Gaunt.',
    [27994]='Macabre Gaunt. +1',
    [27995]='Shigure Tekko',
    [27996]='Shigure Tekko +1',
    [28135]='Assid. Pants +1',
    [28136]='Augury Cuisses',
    [28137]='Augury Cuisses +1',
    [28273]='Regal Pumps',
    [28274]='Regal Pumps +1',
    [28275]='Jute Boots',
    [28276]='Jute Boots +1',
    [28352]='Canto Necklace',
    [28353]='Canto Necklace +1',
    [28412]='Kentarch Belt',
    [28413]='Kentarch Belt +1',
    [28427]='Sailfi Belt',
    [28428]='Sailfi Belt +1',
    [28429]='Acuity Belt',
    [28430]='Acuity Belt +1',
    [28481]='Lugra Earring',
    [28482]='Lugra Earring +1',
    [28490]='Handler\'s Earring',
    [28491]='Handler\'s Earring +1'
}

-- True when `blob` (the raw extdata byte string) is present but every byte is zero. A real item's extdata still
-- carries a non-zero header (creator/serial bytes) even with zero augments, so an all-zero blob means Windower
-- never actually received this slot's item data this session - not that the item has no augments. This happens
-- most often on wardrobes rarely opened in-game: some servers only push a container's full item data once
-- you've viewed its tab in the current session. See docs/CSV_IMPORT.md for the investigation that found this.
local function extdata_all_zero(blob)
    if type(blob) ~= 'string' or blob == '' then return false end
    for i = 1, #blob do
        if blob:byte(i) ~= 0 then return false end
    end
    return true
end

-- Raw extdata as a hex string, for `//ge probe`. Not used by the normal export (which stores real stats, not
-- raw bytes), only for the diagnostic dump.
local function extdata_to_hex(blob)
    if type(blob) ~= 'string' or blob == '' then return '(none)' end
    local parts = {}
    for i = 1, #blob do parts[#parts + 1] = ('%02X'):format(blob:byte(i)) end
    return table.concat(parts)
end

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
    'jobs', 'slots', 'level', 'iLevel', 'category', 'augments', 'stale',
}

-- Decode augments for a get_items entry. Returns a list of strings such as
-- "STR+10", "Accuracy+15", "\"Store TP\"+5", "Path: A", "Rank: 15".
-- Returns an empty list when the item has no augments or decoding fails.
-- Some gear (Unity Concord path augments, Dynamis-D, Su5, some JSE necks - the community calls this
-- "Augment System 4") cannot be decoded by the standard extdata library at all: extdata.decode() returns only
-- the Path/Rank markers, never the real stat lines, on ANY Windower build (confirmed: Windower/Issues#1032,
-- ffxiah.com/forum/topic/53404). A newer client API, windower.ffxi.get_item_augments(), is reported by a
-- third-party addon (BalladOfWorms/OmniWatch) to resolve these to the exact lines the in-game item window
-- shows, on Windower builds that have it - but I could not find it in Windower's own published function list,
-- so this is a best-effort probe, not a confirmed fix. It fails silently (returns {}) if the function doesn't
-- exist, doesn't accept these arguments, or returns something this code doesn't recognise.
-- Use `//ge probe <bagId> <slot>` to see exactly what this returns on YOUR Windower build for one item.
local NATIVE_AUGMENTS_FN = type(windower.ffxi) == 'table' and windower.ffxi.get_item_augments or nil

-- Best-effort: pull any string-looking values out of an unknown/undocumented return shape (a flat array of
-- strings is the most likely shape; a table with a nested list is the fallback).
local function strings_from(t, out, depth)
    if type(t) ~= 'table' or depth > 2 then return end
    for _, v in pairs(t) do
        if type(v) == 'string' and v ~= '' and v:lower() ~= 'none' then
            out[#out + 1] = v
        elseif type(v) == 'table' then
            strings_from(v, out, depth + 1)
        end
    end
end

local function try_native_augments(item_id, e)
    if not NATIVE_AUGMENTS_FN then return {} end
    -- Try the two most plausible calling conventions; keep whichever doesn't error and returns a table.
    local ok, result = pcall(NATIVE_AUGMENTS_FN, item_id)
    if not (ok and type(result) == 'table') then
        ok, result = pcall(NATIVE_AUGMENTS_FN, e)
    end
    if not (ok and type(result) == 'table') then return {} end
    local out = {}
    strings_from(result, out, 0)
    return out
end

local function item_augments(e, item_id)
    local out = {}
    local seen = {}
    local function add(txt)
        txt = tostring(txt or '')
        if txt ~= '' and txt:lower() ~= 'none' and not seen[txt] then
            seen[txt] = true
            out[#out + 1] = txt
        end
    end

    -- See try_native_augments above: fills in the real stat lines for Unity/Dynamis-D/Su5/JSE-neck gear when
    -- (and only when) this Windower build supports it. Tried first so the Path:/Rank: fallback below can tell
    -- whether it's actually needed.
    for _, a in ipairs(try_native_augments(item_id, e)) do add(a) end
    local resolved = #out > 0

    if extdata and type(e) == 'table' and e.extdata then
        local ok, decoded = pcall(extdata.decode, e)
        if ok and type(decoded) == 'table' then
            local augs = decoded.augments
            if type(augs) == 'table' then
                for _, a in ipairs(augs) do add(a) end
            end
            -- Odyssey / Su5 gear expose path and rank separately in some builds. Only worth recording as a
            -- fallback marker (the app then warns "stats come from the base row, not your chosen path") when
            -- nothing above already resolved this item to real stats - otherwise it's just noise.
            if not resolved then
                if decoded.path and decoded.path ~= '' then add('Path: ' .. tostring(decoded.path)) end
                if decoded.rank and tonumber(decoded.rank) and tonumber(decoded.rank) > 0 then add('Rank: ' .. tostring(decoded.rank)) end
            end
        end
    end

    return out
end

-- Read one bag. Returns a list of exported items, a per-bag summary, and a
-- list of Unity items in this bag whose extdata came back stale (see
-- extdata_all_zero above). Returns nil when the bag is not accessible right
-- now, or nil plus an error string when the bag should be readable but
-- get_items failed.
local function scan_bag(def)
    local info = bag_info(def.id)
    if not bag_available(def.id, info) then return nil end

    local ok, raw = pcall(windower.ffxi.get_items, def.id)
    if not ok then return nil, tostring(raw) end
    if type(raw) ~= 'table' then return nil, 'get_items returned no data' end

    local max = tonumber(raw.max) or info.max
    if not max or max <= 0 then max = 80 end

    local items, total, stale_unity = {}, 0, {}
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
                -- A known-Unity item always carries an augment, so no extdata at
                -- all (nil) is just as suspicious here as an all-zero blob.
                local unity_name = UNITY_ITEM_IDS[id]
                if unity_name and (e.extdata == nil or extdata_all_zero(e.extdata)) then
                    stale_unity[#stale_unity + 1] = { name = unity_name, slot = slot }
                end
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
                    augments  = item_augments(e, id),
                    stale     = extdata_all_zero(e.extdata),
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
    }, stale_unity
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
    local stale_unity_total = {}
    for _, def in ipairs(BAGS) do
        local ok, items, summary, stale_unity = pcall(scan_bag, def)
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
            for _, s in ipairs(stale_unity or {}) do
                stale_unity_total[#stale_unity_total + 1] = ('%s (%s slot %d)'):format(s.name, def.name, s.slot)
            end
        end
    end

    if #stale_unity_total > 0 then
        local shown = {}
        for i = 1, math.min(#stale_unity_total, 8) do shown[#shown + 1] = stale_unity_total[i] end
        local extra = #stale_unity_total - #shown
        warnings[#warnings + 1] = ('%d Unity item(s) had no augment data this session (stale cache), their bonus exported as zero: %s%s. Open each bag in your in-game Items menu once, then //ge again.')
            :format(#stale_unity_total, table.concat(shown, ', '), extra > 0 and (' +' .. extra .. ' more') or '')
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

-- Recursively renders a Lua value as text, for `//ge probe`. Small, depth-limited: this is a debug dump, not a
-- general serializer (json_encode already covers real export needs).
local function dump_value(v, indent, depth)
    indent = indent or ''
    depth = depth or 0
    if depth > 4 then return indent .. '...\n' end
    if type(v) ~= 'table' then
        return indent .. tostring(v) .. ' (' .. type(v) .. ')\n'
    end
    local out = {}
    local any = false
    for k, val in pairs(v) do
        any = true
        out[#out + 1] = indent .. '[' .. tostring(k) .. '] = ' .. dump_value(val, indent .. '  ', depth + 1)
    end
    if not any then return indent .. '{} (empty table)\n' end
    return table.concat(out)
end

-- `//ge probe <bagId> <slot>` - diagnostic only, writes nothing to data/. Dumps everything this addon can see
-- about one item (raw extdata hex, what extdata.decode() returns, and what windower.ffxi.get_item_augments()
-- returns if it exists on this Windower build) to a log file and prints a summary to chat. Meant for figuring
-- out, on a real client, what a Unity/Dynamis-D/Su5/JSE-neck path-augmented item actually looks like - see the
-- comment above try_native_augments. Point this at an item you know has a chosen Path/Rank augment on it.
local function probe_item(bag_id, slot)
    bag_id = tonumber(bag_id)
    slot = tonumber(slot)
    if not bag_id or not slot then
        say('Usage: //ge probe <bagId> <slot>  (e.g. //ge probe 0 5 for inventory slot 5)', WARN)
        return
    end
    local ok, raw = pcall(windower.ffxi.get_items, bag_id)
    if not ok or type(raw) ~= 'table' or type(raw[slot]) ~= 'table' or not raw[slot].id or raw[slot].id == 0 then
        say(('probe: no item at bag %d slot %d'):format(bag_id, slot), WARN)
        return
    end
    local e = raw[slot]
    local id = tonumber(e.id)
    local meta = item_meta(id)
    local lines = {}
    lines[#lines + 1] = ('probe: %s (id %d), bag %d slot %d'):format(meta and meta.name or ('id ' .. id), id, bag_id, slot)
    lines[#lines + 1] = 'raw extdata (hex): ' .. extdata_to_hex(e.extdata)
    lines[#lines + 1] = 'stale (all-zero extdata): ' .. tostring(extdata_all_zero(e.extdata))
    lines[#lines + 1] = ''
    lines[#lines + 1] = 'extdata.decode(item) ->'
    if extdata and e.extdata then
        local dok, decoded = pcall(extdata.decode, e)
        lines[#lines + 1] = dok and dump_value(decoded) or ('  error: ' .. tostring(decoded))
    else
        lines[#lines + 1] = '  (extdata library not available, or item has no extdata)'
    end
    lines[#lines + 1] = ''
    lines[#lines + 1] = 'windower.ffxi.get_item_augments exists: ' .. tostring(NATIVE_AUGMENTS_FN ~= nil)
    if NATIVE_AUGMENTS_FN then
        local nok, nresult = pcall(NATIVE_AUGMENTS_FN, id)
        lines[#lines + 1] = 'get_item_augments(id) ->'
        lines[#lines + 1] = nok and dump_value(nresult) or ('  error: ' .. tostring(nresult))
        local nok2, nresult2 = pcall(NATIVE_AUGMENTS_FN, e)
        lines[#lines + 1] = 'get_item_augments(item) ->'
        lines[#lines + 1] = nok2 and dump_value(nresult2) or ('  error: ' .. tostring(nresult2))
    end
    lines[#lines + 1] = ''
    lines[#lines + 1] = 'item_augments() (what a normal export would write) -> ' .. table.concat(item_augments(e, id), ' | ')

    local text = table.concat(lines, '\n')
    local dir = data_dir()
    ensure_dir(dir)
    local path = dir .. '/probe.txt'
    write_file(path, text)
    say('probe written to ' .. path .. ' - please paste that file back.', GOOD)
    for _, l in ipairs(lines) do say(l) end
end

local function show_help()
    say('Commands:')
    say('  //ge                    export equipment from all accessible bags to data/<CharName>.json')
    say('  //ge probe <bag> <slot> diagnostic dump of one item (see docs/UNITY_PATH_AUGMENTS.md); writes nothing to your export')
    say('  //ge help               show this help')
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
    elseif cmd == 'probe' then
        local a, b = ...
        local ok, err = pcall(probe_item, a, b)
        if not ok then say('Error: ' .. tostring(err), WARN) end
    else
        say('Unknown command: ' .. cmd, WARN)
        show_help()
    end
end)
