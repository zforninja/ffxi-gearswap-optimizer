-- Original: Motenten / Modified: Arislan
-- GearSwap Lua for PLD
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
    state.Buff['Sentinel'] = buffactive['Sentinel'] or false
    state.Buff['Palisade'] = buffactive['Palisade'] or false
    state.Buff['Majesty'] = buffactive['Majesty'] or false
    state.Buff['Divine Emblem'] = buffactive['Divine Emblem'] or false
    state.Buff['Reprisal'] = buffactive['Reprisal'] or false
    state.Buff['Cover'] = buffactive['Cover'] or false
    state.Buff['Invincible'] = buffactive['Invincible'] or false
    state.Buff['Crusade'] = buffactive['Crusade'] or false
    state.Buff['Enlight'] = buffactive['Enlight'] or false

    -- Cure spells (enmity + cure potency focus)
    cure_spells = S{'Cure', 'Cure II', 'Cure III', 'Cure IV'}
    -- Divine damage spells
    divine_damage = S{'Banish', 'Banish II', 'Banishga', 'Holy', 'Holy II'}
    -- Enlight (add light damage to attacks)
    enlight_spells = S{'Enlight', 'Enlight II'}
    -- Protect spells
    protect_spells = S{'Protect', 'Protect II', 'Protect III', 'Protect IV', 'Protect V'}
    -- Shell spells
    shell_spells = S{'Shell', 'Shell II', 'Shell III', 'Shell IV', 'Shell V'}
    -- Spells primarily for enmity generation
    enmity_spells = S{'Flash', 'Crusade'}

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
    state.IdleMode:options('Normal', 'DT', 'Refresh', 'Regen')
    state.CastingMode:options('Normal', 'SIRD')
    state.PhysicalDefenseMode:options('PDT', 'HP', 'Block', 'Enmity')
    state.MagicalDefenseMode:options('MDT', 'MEVA')

    state.MagicBurst = M(false, 'Magic Burst')

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
    gear.PLD_FC_Cape = { name="Rudianos's Mantle", augments={'Fast Cast +10%'} }
    gear.PLD_WS_Cape = { name="Rudianos's Mantle", augments={'Weapon skill damage +10%'} }
    gear.PLD_Nuke_Cape = { name="Rudianos's Mantle", augments={'INT+20','Mag. Acc+20 /Mag. Dmg.+20','"Mag.Atk.Bns."+10'} }
    gear.PLD_TP_Cape = { name="Rudianos's Mantle", augments={'DEX+20','Accuracy+20 Attack+20','"Dbl.Atk."+10'} }


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

    -- Flash FC (FC + Enmity)
    sets.precast.FC.Flash = {
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

    -- Cure FC (Quick Magic)
    sets.precast.FC.Cure = {
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

    -- Enhancing FC
    sets.precast.FC.Enhancing = {
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

    -- Invincible (enmity + duration)
    sets.precast.JA['Invincible'] = {
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

    -- Sentinel (damage reduction + enmity)
    sets.precast.JA['Sentinel'] = {
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

    -- Shield Bash (stun + enmity)
    sets.precast.JA['Shield Bash'] = {
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

    -- Rampart (party defense + enmity)
    sets.precast.JA['Rampart'] = {
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

    -- Cover (duration)
    sets.precast.JA['Cover'] = {
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

    -- Palisade (block rate)
    sets.precast.JA['Palisade'] = {
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

    -- Holy Circle (undead killer)
    sets.precast.JA['Holy Circle'] = {
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

    -- Divine Emblem (enhance divine magic)
    sets.precast.JA['Divine Emblem'] = {
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

    -- Fealty (resistance)
    sets.precast.JA['Fealty'] = {
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

    -- Chivalry (TP to MP)
    sets.precast.JA['Chivalry'] = {
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

    -- Sepulcher (undead killer buff)
    sets.precast.JA['Sepulcher'] = {
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

    -- Intervene (shield attack)
    sets.precast.JA['Intervene'] = {
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

    -- Provoke (/WAR sub, enmity)
    sets.precast.JA['Provoke'] = {
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
    ---------------------------------------- Enhancing Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Enhancing Magic base
    sets.midcast['Enhancing Magic'] = {
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

    -- Enhancing duration (Protect, Shell, etc.)
    sets.midcast.EnhancingDuration = {
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

    -- Phalanx potency
    sets.midcast.Phalanx = {
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

    -- Reprisal (duration + HP for damage)
    sets.midcast.Reprisal = {
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

    -- Crusade (enmity buff)
    sets.midcast.Crusade = {
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
    ---------------------------------------- Healing Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Cure (enmity + potency)
    sets.midcast.Cure = {
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

    -- Cure with Spell Interruption Down
    sets.midcast.Cure.SIRD = set_combine(sets.midcast.Cure, {
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

    -- Cure with Majesty (potency focus, instant)
    sets.midcast.Cure.Majesty = {
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
    ---------------------------------------- Divine Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Divine Magic base
    sets.midcast['Divine Magic'] = {
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

    -- Banish/Holy damage
    sets.midcast.DivineDamage = {
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

    -- Enlight potency (Divine skill)
    sets.midcast.Enlight = {
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

    -- Doom (Holy Water, cursna received)
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

    -- Divine Emblem active
    sets.buff.DivineEmblem = {
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

    -- Cover active (extra DT)
    sets.buff.Cover = {
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

    -- Default idle (DT + Refresh)
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

    -- Idle max DT
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

    -- Idle with Refresh focus
    sets.idle.Refresh = {
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

    -- Idle with HP Regen
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


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Engaged Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Base engaged (balanced TP/DT)
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

    -- Accuracy focused
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

    -- Max DT while engaged
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

    -- Physical DT focus
    sets.engaged.PDT = {
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

    -- Magical DT focus
    sets.engaged.MDT = {
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

    -- Max HP while engaged
    sets.engaged.HP = {
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

    -- Accuracy + DT
    sets.engaged.Acc.DT = set_combine(sets.engaged.Acc, {
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


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Defense Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Physical DT set
    sets.defense.PDT = {
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

    -- Magical DT set
    sets.defense.MDT = {
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

    -- Magic evasion set
    sets.defense.MEVA = {
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

    -- Max HP set
    sets.defense.HP = {
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

    -- Max block rate
    sets.defense.Block = {
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

    -- Enmity tanking set
    sets.defense.Enmity = {
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
    ---------------------------------------- Enmity Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Base enmity set for JAs and spells
    sets.midcast.Enmity = {
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

    -- Flash (enmity focus)
    sets.midcast.Flash = set_combine(sets.midcast.Enmity, {
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


    ------------------------------------------------------------------------------------------------
    ---------------------------------------- Movement Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Movement speed for kiting
    sets.Kiting = {
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

    -- Atonement
    sets.precast.WS['Atonement'] = set_combine(sets.precast.WS, {
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

    -- Black Halo
    sets.precast.WS['Black Halo'] = set_combine(sets.precast.WS, {
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

    -- Chant du Cygne
    sets.precast.WS['Chant du Cygne'] = set_combine(sets.precast.WS, {
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

    -- Knights of Round
    sets.precast.WS['Knights of Round'] = set_combine(sets.precast.WS, {
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

    -- Realmrazer
    sets.precast.WS['Realmrazer'] = set_combine(sets.precast.WS, {
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

    -- Requiescat
    sets.precast.WS['Requiescat'] = set_combine(sets.precast.WS, {
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

    -- Resolution
    sets.precast.WS['Resolution'] = set_combine(sets.precast.WS, {
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

    -- Savage Blade
    sets.precast.WS['Savage Blade'] = set_combine(sets.precast.WS, {
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
-- Job-specific hooks for spell mapping.
-------------------------------------------------------------------------------------------------------------------

-- Return custom spell map for spells not in default Mote mappings.
function job_get_spell_map(spell, default_spell_map)
    -- Cure spells need enmity + cure potency gear
    if cure_spells:contains(spell.english) then
        return 'Cure'
    end
    -- Divine damage spells (MAB + Divine skill)
    if divine_damage:contains(spell.english) then
        return 'DivineDamage'
    end
    -- Enlight potency from Divine Magic skill
    if enlight_spells:contains(spell.english) then
        return 'Enlight'
    end
    -- Enmity-focused spells
    if enmity_spells:contains(spell.english) then
        return 'Enmity'
    end

    return default_spell_map
end

-------------------------------------------------------------------------------------------------------------------
-- Job-specific hooks for standard casting events.
-------------------------------------------------------------------------------------------------------------------

-- Set eventArgs.handled to true if we don't want any automatic gear equipping to be done.
-- Set eventArgs.useMidcastGear to true if we want midcast gear equipped on precast.
function job_precast(spell, action, spellMap, eventArgs)
    -- Flash with fast cast + enmity
    if spell.english == 'Flash' then
        equip(sets.precast.FC.Flash)
    end

end

-- Run after default midcast() is done.
-- Use to apply additional gear on top of what Mote selected.
function job_post_midcast(spell, action, spellMap, eventArgs)
    if spell.skill == 'Divine Magic' then
        -- Divine Emblem enhances divine magic damage
        if state.Buff['Divine Emblem'] then
            equip(sets.buff.DivineEmblem)
        end
    end

    if spell.skill == 'Healing Magic' then
        -- Majesty: Cure is instant, focus on potency
        if cure_spells:contains(spell.english) and state.Buff['Majesty'] then
            equip(sets.midcast.Cure.Majesty)
        end
    end

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
