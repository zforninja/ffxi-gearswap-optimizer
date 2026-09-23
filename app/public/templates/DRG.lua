-- Original: Motenten / Modified: Arislan
-- GearSwap Lua for DRG
-- Player: Player
-- Generated: 2026-01-22 01:53

-------------------------------------------------------------------------------------------------------------------
-- Default Keybinds (from Mote-Globals.lua)
-------------------------------------------------------------------------------------------------------------------
-- These are the default keybinds set up by Mote-Include. You can use these to swap modes in-game.
--
-- F9          = Cycle Offense Mode (Normal > Acc > STP, etc.)
-- Ctrl+F9     = Cycle Hybrid Mode (Normal > DT, etc.)
-- Alt+F9      = Cycle Ranged Mode
-- Win+F9      = Cycle Weaponskill Mode (Normal > Acc, etc.)
--
-- F10         = Set Defense Mode to Physical
-- Ctrl+F10    = Cycle Physical Defense Mode
-- Alt+F10     = Toggle Kiting Mode (movement speed gear)
--
-- F11         = Set Defense Mode to Magical
-- Ctrl+F11    = Cycle Casting Mode (Normal > Resistant, etc.)
--
-- F12         = Update gear and display current state
-- Ctrl+F12    = Cycle Idle Mode (Normal > DT > Regen, etc.)
-- Alt+F12     = Reset Defense Mode to None
--
-- To use: Press the key in-game, or type commands like:
--   //gs c cycle OffenseMode
--   //gs c set HybridMode DT
--   //gs c toggle Kiting
-------------------------------------------------------------------------------------------------------------------

-------------------------------------------------------------------------------------------------------------------
-- Setup functions for this job. Generally should not be modified.
-------------------------------------------------------------------------------------------------------------------

-- Initialization function for this job file.
function get_sets()
    mote_include_version = 2

    -- Load and initialize the include file.
    include('Mote-Include.lua')
end

-- Setup vars that are user-independent. state.Buff vars initialized here will automatically be tracked.
function job_setup()
    state.Buff['Deep Breathing'] = buffactive['Deep Breathing'] or false
    state.Buff['Spirit Surge'] = buffactive['Spirit Surge'] or false
    state.Buff['Fly High'] = buffactive['Fly High'] or false

    -- Gear that should not be swapped
    no_swap_gear = S{"Warp Ring", "Dim. Ring (Dem)", "Dim. Ring (Holla)", "Dim. Ring (Mea)",
        "Trizek Ring", "Echad Ring", "Facility Ring", "Capacity Ring"}

end

-------------------------------------------------------------------------------------------------------------------
-- User setup functions for this job. Recommend that these be overridden in a sidecar file.
-------------------------------------------------------------------------------------------------------------------

-- Setup vars that are user-dependent. Can override this function in a sidecar file.
function user_setup()
    state.OffenseMode:options('Normal', 'Acc', 'STP')
    state.HybridMode:options('Normal', 'DT')
    state.IdleMode:options('Normal', 'DT', 'Regen')
    state.WeaponskillMode:options('Normal', 'Acc')

    state.WeaponLock = M(false, 'Weapon Lock')

    -- Additional local binds
    -- include('Global-Binds.lua') -- OK to remove this line

    -- Default macro book/set
    set_macro_page(1, 1)
end

function user_unload()
    -- Unbind keys here if needed
end

-- Define sets and vars used by this job file.
function init_gear_sets()

    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Gear Variables ----------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Augmented gear variables - define your augmented gear here
    gear.DRG_FC_Cape = { name="Brigantia's Mantle", augments={'Fast Cast +10%'} }
    gear.DRG_WS_Cape = { name="Brigantia's Mantle", augments={'Weapon skill damage +10%'} }
    gear.DRG_TP_Cape = { name="Brigantia's Mantle", augments={'DEX+20','Accuracy+20 Attack+20','"Dbl.Atk."+10'} }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Precast Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Fast Cast
    sets.precast.FC = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- JA Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Jump (VIT mod, benefits from jump gear)
    sets.precast.JA['Jump'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- High Jump (VIT mod, enmity reduction)
    sets.precast.JA['High Jump'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Super Jump (enmity reset)
    sets.precast.JA['Super Jump'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Spirit Jump (uses wyvern, effect varies)
    sets.precast.JA['Spirit Jump'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Soul Jump (uses wyvern, TP drain)
    sets.precast.JA['Soul Jump'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Call Wyvern (wyvern HP/stats)
    sets.precast.JA['Call Wyvern'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Spirit Link (HP transfer to wyvern)
    sets.precast.JA['Spirit Link'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Deep Breathing (enhances breath)
    sets.precast.JA['Deep Breathing'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Angon (defense down on target)
    sets.precast.JA['Angon'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Ancient Circle (dragon killer party buff)
    sets.precast.JA['Ancient Circle'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Fly High (reduces Jump recast)
    sets.precast.JA['Fly High'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Spirit Surge (merge with wyvern)
    sets.precast.JA['Spirit Surge'] = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Midcast Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Spell Interrupt Rate Down
    sets.midcast.SpellInterrupt = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Pet Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Wyvern Breath potency
    sets.pet.Breath = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Buff Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Doom (Holy Water)
    sets.buff.Doom = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Idle Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Default idle
    sets.idle = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Idle DT
    sets.idle.DT = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Idle with Regen focus
    sets.idle.Regen = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Idle with wyvern out
    sets.idle.Pet = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Engaged Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Base engaged
    sets.engaged = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Accuracy focus
    sets.engaged.Acc = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Store TP focus
    sets.engaged.STP = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- DT while engaged
    sets.engaged.DT = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Acc + DT
    sets.engaged.Acc.DT = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- STP + DT
    sets.engaged.STP.DT = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    ------------------------------------------------------------------------------------------------
    ------------------------------------- Weapon Skill Sets ----------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Default WS set
    sets.precast.WS = {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    }

    -- Camlann's Torment
    sets.precast.WS['Camlann's Torment'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Drakesbane
    sets.precast.WS['Drakesbane'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Geirskogul
    sets.precast.WS['Geirskogul'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Impulse Drive
    sets.precast.WS['Impulse Drive'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Leg Sweep
    sets.precast.WS['Leg Sweep'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Penta Thrust
    sets.precast.WS['Penta Thrust'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Sonic Thrust
    sets.precast.WS['Sonic Thrust'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Stardiver
    sets.precast.WS['Stardiver'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

    -- Wheeling Thrust
    sets.precast.WS['Wheeling Thrust'] = set_combine(sets.precast.WS, {
        --main="",
        --sub="",
        --range="",
        --ammo="",
        --head="",
        --neck="",
        --ear1="",
        --ear2="",
        --body="",
        --hands="",
        --ring1="",
        --ring2="",
        --back="",
        --waist="",
        --legs="",
        --feet="",
    })

end

-------------------------------------------------------------------------------------------------------------------
-- Job-specific hooks for standard casting events.
-------------------------------------------------------------------------------------------------------------------

-- Set eventArgs.handled to true if we don't want any automatic gear equipping to be done.
-- Set eventArgs.useMidcastGear to true if we want midcast gear equipped on precast.
function job_precast(spell, action, spellMap, eventArgs)
    -- Most precast is handled automatically by Mote-Include
end

-- Run after default midcast() is done.
-- Use to apply additional gear on top of what Mote selected.
function job_post_midcast(spell, action, spellMap, eventArgs)
    -- Add conditional gear here
end

function job_aftercast(spell, action, spellMap, eventArgs)
    -- Aftercast is mainly handled by Mote-Include (returns to idle/engaged)
end

-------------------------------------------------------------------------------------------------------------------
-- Job-specific hooks for non-casting events.
-------------------------------------------------------------------------------------------------------------------

function job_buff_change(buff, gain)
    -- Update tracked buffs and re-equip gear if needed
    if state.Buff[buff] ~= nil then
        state.Buff[buff] = gain
        if not midaction() then
            handle_equipping_gear(player.status)
        end
    end

    -- Doom handling
    if buff == 'Doom' then
        if gain then
            equip(sets.buff.Doom)
            send_command('@input /p Doomed.')
            disable('ring1', 'ring2', 'waist')
        else
            enable('ring1', 'ring2', 'waist')
            handle_equipping_gear(player.status)
        end
    end
end

function job_state_change(stateField, newValue, oldValue)
    -- Handle Weapon Lock toggle
    if stateField == 'Weapon Lock' then
        if newValue == true then
            disable('main', 'sub', 'range')
        else
            enable('main', 'sub', 'range')
        end
    end
end

-------------------------------------------------------------------------------------------------------------------
-- User code that supplements standard library decisions.
-------------------------------------------------------------------------------------------------------------------

function job_handle_equipping_gear(playerStatus, eventArgs)
    check_rings()
    check_moving()
end

-- Prevent swapping out special rings
function check_rings()
    if no_swap_gear:contains(player.equipment.ring1) then
        disable('ring1')
    else
        enable('ring1')
    end
    if no_swap_gear:contains(player.equipment.ring2) then
        disable('ring2')
    else
        enable('ring2')
    end
end

-- Movement speed gear
function check_moving()
    if state.DefenseMode.value == 'None' and state.Kiting.value then
        equip(sets.Kiting)
    end
end
