-- Original: Motenten / Modified: Arislan
-- GearSwap Lua for DRK
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
    state.Buff['Last Resort'] = buffactive['Last Resort'] or false
    state.Buff['Souleater'] = buffactive['Souleater'] or false
    state.Buff['Blood Weapon'] = buffactive['Blood Weapon'] or false
    state.Buff['Endark'] = buffactive['Endark'] or false
    state.Buff['Dread Spikes'] = buffactive['Dread Spikes'] or false
    state.Buff['Nether Void'] = buffactive['Nether Void'] or false
    state.Buff['Dark Seal'] = buffactive['Dark Seal'] or false

    -- Absorb spells (steal stats from enemy)
    absorb_spells = S{'Absorb-STR', 'Absorb-DEX', 'Absorb-VIT', 'Absorb-AGI', 'Absorb-INT', 'Absorb-MND', 'Absorb-CHR', 'Absorb-ACC', 'Absorb-TP', 'Absorb-Attri'}
    -- Drain spells (HP drain)
    drain_spells = S{'Drain', 'Drain II', 'Drain III'}
    -- Aspir spells (MP drain)
    aspir_spells = S{'Aspir', 'Aspir II', 'Aspir III'}
    -- Endark (add dark damage to attacks)
    endark_spells = S{'Endark', 'Endark II'}

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
    state.CastingMode:options('Normal', 'Resistant')
    state.PhysicalDefenseMode:options('PDT')
    state.MagicalDefenseMode:options('MDT')

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
    gear.DRK_FC_Cape = { name="Ankou's Mantle", augments={'Fast Cast +10%'} }
    gear.DRK_WS_Cape = { name="Ankou's Mantle", augments={'Weapon skill damage +10%'} }
    gear.DRK_Nuke_Cape = { name="Ankou's Mantle", augments={'INT+20','Mag. Acc+20 /Mag. Dmg.+20','"Mag.Atk.Bns."+10'} }
    gear.DRK_TP_Cape = { name="Ankou's Mantle", augments={'DEX+20','Accuracy+20 Attack+20','"Dbl.Atk."+10'} }


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

    -- Impact FC (Twilight Cloak body, no head)
    sets.precast.FC.Impact = {
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

    -- Blood Weapon (attacks drain HP)
    sets.precast.JA['Blood Weapon'] = {
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

    -- Last Resort (attack up)
    sets.precast.JA['Last Resort'] = {
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

    -- Souleater (HP to damage)
    sets.precast.JA['Souleater'] = {
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

    -- Diabolic Eye (accuracy boost)
    sets.precast.JA['Diabolic Eye'] = {
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

    -- Nether Void (enhance next Absorb)
    sets.precast.JA['Nether Void'] = {
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

    -- Dark Seal (enhance next Dark Magic)
    sets.precast.JA['Dark Seal'] = {
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

    -- Arcane Circle (arcana killer party buff)
    sets.precast.JA['Arcane Circle'] = {
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

    -- Soul Enslavement (intimidate undead)
    sets.precast.JA['Soul Enslavement'] = {
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

    -- Weapon Bash (stun)
    sets.precast.JA['Weapon Bash'] = {
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

    -- Consume Mana (MP to TP)
    sets.precast.JA['Consume Mana'] = {
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
    ---------------------------------------- Elemental Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Elemental Magic
    sets.midcast['Elemental Magic'] = {
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

    -- Magic Burst
    sets.midcast['Elemental Magic'].MB = set_combine(sets.midcast['Elemental Magic'], {
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
    ---------------------------------------- Dark Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Dark Magic base (skill + macc)
    sets.midcast['Dark Magic'] = {
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

    -- Absorb spells (duration + potency)
    sets.midcast.Absorb = {
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

    -- Absorb accuracy focus
    sets.midcast.Absorb.Resistant = set_combine(sets.midcast.Absorb, {
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

    -- Drain potency (Dark skill + INT)
    sets.midcast.Drain = {
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

    -- Drain accuracy focus
    sets.midcast.Drain.Resistant = set_combine(sets.midcast.Drain, {
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

    -- Aspir potency
    sets.midcast.Aspir = set_combine(sets.midcast.Drain, {
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

    -- Stun (fast recast + macc)
    sets.midcast.Stun = {
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

    -- Endark potency (Dark skill)
    sets.midcast.Endark = {
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

    -- Dread Spikes (HP for max spikes)
    sets.midcast.DreadSpikes = {
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

    -- Impact (Twilight Cloak required)
    sets.midcast.Impact = {
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

    -- Nether Void active (Absorb enhancement)
    sets.buff.NetherVoid = {
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

    -- Dark Seal active (Dark Magic enhancement)
    sets.buff.DarkSeal = {
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

    -- Last Resort active (may want DT)
    sets.buff.LastResort = {
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

    -- Souleater active
    sets.buff.Souleater = {
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

    -- Idle with Regen (recover Souleater HP)
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

    -- With Last Resort (extra DT to offset)
    sets.engaged.LastResort = {
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
    ---------------------------------------- Defense Sets ------------------------------------------
    ------------------------------------------------------------------------------------------------

    -- Physical DT
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

    -- Magical DT
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

    -- Catastrophe
    sets.precast.WS['Catastrophe'] = set_combine(sets.precast.WS, {
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

    -- Cross Reaper
    sets.precast.WS['Cross Reaper'] = set_combine(sets.precast.WS, {
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

    -- Entropy
    sets.precast.WS['Entropy'] = set_combine(sets.precast.WS, {
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

    -- Ground Strike
    sets.precast.WS['Ground Strike'] = set_combine(sets.precast.WS, {
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

    -- Infernal Scythe
    sets.precast.WS['Infernal Scythe'] = set_combine(sets.precast.WS, {
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

    -- Insurgency
    sets.precast.WS['Insurgency'] = set_combine(sets.precast.WS, {
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

    -- Quietus
    sets.precast.WS['Quietus'] = set_combine(sets.precast.WS, {
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

    -- Torcleaver
    sets.precast.WS['Torcleaver'] = set_combine(sets.precast.WS, {
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
    -- Absorb spells benefit from Dark Magic skill and Nether Void
    if absorb_spells:contains(spell.english) then
        return 'Absorb'
    end
    -- Drain spells benefit from Dark Magic skill
    if drain_spells:contains(spell.english) then
        return 'Drain'
    end
    -- Aspir spells benefit from Dark Magic skill
    if aspir_spells:contains(spell.english) then
        return 'Aspir'
    end
    -- Endark potency from Dark Magic skill
    if endark_spells:contains(spell.english) then
        return 'Endark'
    end

    return default_spell_map
end

-------------------------------------------------------------------------------------------------------------------
-- Job-specific hooks for standard casting events.
-------------------------------------------------------------------------------------------------------------------

-- Set eventArgs.handled to true if we don't want any automatic gear equipping to be done.
-- Set eventArgs.useMidcastGear to true if we want midcast gear equipped on precast.
function job_precast(spell, action, spellMap, eventArgs)
    -- Impact requires Twilight Cloak (no head slot)
    if spell.english == 'Impact' then
        equip(sets.precast.FC.Impact)
    end

end

-- Run after default midcast() is done.
-- Use to apply additional gear on top of what Mote selected.
function job_post_midcast(spell, action, spellMap, eventArgs)
    if spell.skill == 'Dark Magic' then
        -- Nether Void enhances Absorb spell potency
        if absorb_spells:contains(spell.english) and state.Buff['Nether Void'] then
            equip(sets.buff.NetherVoid)
        end
        -- Dark Seal enhances Dark Magic accuracy/potency
        if state.Buff['Dark Seal'] then
            equip(sets.buff.DarkSeal)
        end
    end

    if spell.skill == 'Elemental Magic' then
        -- Magic Burst for elemental spells
        if state.MagicBurst.value then
            equip(sets.midcast['Elemental Magic'].MB)
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
