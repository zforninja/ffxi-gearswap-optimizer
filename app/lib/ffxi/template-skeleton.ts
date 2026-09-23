/**
 * Generic Mote-Include GearSwap skeleton.
 *
 * Used for jobs that do not have a vendored community template. The layout mirrors the
 * Masin-M/Gearswap_generator templates so the same `fillTemplate` parser understands it:
 * every `sets.*` block lists commented-out slot lines that the optimizer fills in.
 */

import { JOB_NAMES } from './constants';

const SLOT_LINES = ['main', 'sub', 'range', 'ammo', 'head', 'neck', 'ear1', 'ear2', 'body', 'hands', 'ring1', 'ring2', 'back', 'waist', 'legs', 'feet'];

/** Common job abilities per job – emitted as empty `sets.precast.JA[...]` blocks for the player to fill by hand. */
const JOB_ABILITIES: Record<string, string[]> = {
  WAR: ['Berserk', 'Warcry', 'Aggressor', 'Restraint', 'Blood Rage', 'Mighty Strikes', 'Provoke'],
  MNK: ['Boost', 'Dodge', 'Focus', 'Chakra', 'Chi Blast', 'Counterstance', 'Footwork', 'Impetus', 'Mantra', 'Hundred Fists'],
  WHM: ['Benediction', 'Afflatus Solace', 'Afflatus Misery', 'Divine Seal', 'Devotion', 'Asylum'],
  BLM: ['Manafont', 'Elemental Seal', 'Mana Wall', 'Manawell', 'Enmity Douse'],
  RDM: ['Chainspell', 'Convert', 'Composure', 'Saboteur', 'Stymie'],
  THF: ['Steal', 'Mug', 'Despoil', 'Sneak Attack', 'Trick Attack', 'Flee', 'Conspirator', 'Collaborator', 'Accomplice', 'Perfect Dodge'],
  PLD: ['Invincible', 'Sentinel', 'Shield Bash', 'Holy Circle', 'Rampart', 'Fealty', 'Chivalry', 'Divine Emblem', 'Palisade', 'Intervene', 'Cover'],
  DRK: ['Blood Weapon', 'Last Resort', 'Souleater', 'Arcane Circle', 'Weapon Bash', 'Dark Seal', 'Diabolic Eye', 'Nether Void', 'Scarlet Delirium'],
  BST: ['Familiar', 'Reward', 'Charm', 'Call Beast', 'Bestial Loyalty', 'Killer Instinct', 'Spur', 'Feral Howl', 'Unleash'],
  BRD: ['Soul Voice', 'Pianissimo', 'Nightingale', 'Troubadour', 'Marcato', 'Tenuto', 'Clarion Call'],
  RNG: ['Eagle Eye Shot', 'Sharpshot', 'Scavenge', 'Camouflage', 'Barrage', 'Shadowbind', 'Velocity Shot', 'Double Shot', 'Decoy Shot', 'Bounty Shot', 'Flashy Shot', 'Unlimited Shot'],
  SAM: ['Meikyo Shisui', 'Meditate', 'Third Eye', 'Hasso', 'Seigan', 'Warding Circle', 'Sekkanoki', 'Sengikori', 'Hamanoha', 'Konzen-ittai', 'Shikikoyo'],
  NIN: ['Mijin Gakure', 'Yonin', 'Innin', 'Futae', 'Issekigan', 'Sange'],
  DRG: ['Spirit Surge', 'Call Wyvern', 'Ancient Circle', 'Jump', 'High Jump', 'Super Jump', 'Spirit Jump', 'Soul Jump', 'Angon', 'Spirit Link', 'Deep Breathing', 'Steady Wing', 'Fly High'],
  SMN: ['Astral Flow', 'Elemental Siphon', 'Mana Cede', 'Apogee', 'Astral Conduit'],
  BLU: ['Azure Lore', 'Burst Affinity', 'Chain Affinity', 'Efflux', 'Diffusion', 'Convergence', 'Unbridled Learning', 'Unbridled Wisdom'],
  COR: ['Wild Card', 'Phantom Roll', 'Quick Draw', 'Random Deal', 'Snake Eye', 'Fold', 'Triple Shot', 'Cutting Cards', 'Crooked Cards'],
  PUP: ['Overdrive', 'Activate', 'Repair', 'Deus Ex Automata', 'Maintenance', 'Deactivate', 'Ventriloquy', 'Role Reversal', 'Tactical Switch', 'Cooldown', 'Heady Artifice'],
  DNC: ['Trance', 'Sambas', 'Waltz', 'Jig', 'Steps', 'Flourishes I', 'Flourishes II', 'Flourishes III', 'Fan Dance', 'Saber Dance', 'Climactic Flourish', 'Presto', 'Contradance', 'No Foot Rise', 'Grand Pas'],
  SCH: ['Tabula Rasa', 'Light Arts', 'Dark Arts', 'Sublimation', 'Enlightenment', 'Modus Veritas', 'Libra', 'Caper Emissarius'],
  GEO: ['Bolster', 'Life Cycle', 'Blaze of Glory', 'Dematerialize', 'Theurgic Focus', 'Concentric Pulse', 'Mending Halation', 'Radial Arcana', 'Full Circle', 'Ecliptic Attrition', 'Lasting Emanation', 'Collimated Fervor', 'Entrust', 'Widened Compass'],
  RUN: ['Elemental Sforzo', 'Swordplay', 'Embolden', 'Vivacious Pulse', 'Vallation', 'Valiance', 'Pflug', 'Battuta', 'Liement', 'Gambit', 'Rayke', 'One for All', 'Odyllic Subterfuge', 'Swipe', 'Lunge'],
};

const MAGE_JOBS = new Set(['WHM', 'BLM', 'RDM', 'SCH', 'GEO', 'SMN', 'BLU', 'PLD', 'RUN', 'DRK', 'NIN', 'BRD']);
const HEALER_JOBS = new Set(['WHM', 'RDM', 'SCH', 'PLD', 'GEO', 'BLU', 'RUN']);
const NUKER_JOBS = new Set(['BLM', 'RDM', 'SCH', 'GEO', 'DRK', 'BLU', 'NIN', 'SMN', 'RUN']);
const RANGED_JOBS = new Set(['RNG', 'COR']);

function block(path: string, opts: { combine?: string; comment?: string; indent?: string } = {}): string {
  const ind = opts.indent ?? '    ';
  const open = opts.combine ? `${path} = set_combine(${opts.combine}, {` : `${path} = {`;
  const close = opts.combine ? '})' : '}';
  const lines = [
    ...(opts.comment ? [`${ind}-- ${opts.comment}`] : []),
    `${ind}${open}`,
    ...SLOT_LINES.map((s) => `${ind}    --${s}="",`),
    `${ind}${close}`,
    '',
  ];
  return lines.join('\n');
}

function luaString(s: string): string {
  return s.includes("'") ? `"${s.replace(/"/g, '\\"')}"` : `'${s}'`;
}

export type SkeletonOptions = {
  /** Weapon skills to emit `sets.precast.WS[...]` blocks for. */
  wsNames: string[];
  /** Player name for the header comment. */
  player?: string;
  /** Date string for the header comment (pass a fixed value for deterministic output). */
  generated?: string;
};

/** Build a complete, loadable Mote-Include job file with every gear set left blank. */
export function buildSkeleton(job: string, opts: SkeletonOptions): string {
  const J = job.toUpperCase();
  const jobName = JOB_NAMES[J] ?? J;
  const jas = JOB_ABILITIES[J] ?? [];
  const ws = Array.from(new Set(opts.wsNames.filter(Boolean)));
  const mage = MAGE_JOBS.has(J);
  const ranged = RANGED_JOBS.has(J);
  const out: string[] = [];
  const p = (s = '') => out.push(s);

  p(`-- GearSwap job file for ${J} (${jobName})`);
  p(`-- Generic Mote-Include skeleton generated by Vana'diel Gear Optimizer${opts.player ? ` for ${opts.player}` : ''}`);
  if (opts.generated) p(`-- Generated: ${opts.generated}`);
  p('-- Structure follows Motenten\'s Mote-Include layout (mote_include_version 2).');
  p();
  p('-------------------------------------------------------------------------------------------------------------------');
  p('-- Default Keybinds (from Mote-Globals.lua)');
  p('-------------------------------------------------------------------------------------------------------------------');
  p('-- F9 = Cycle Offense Mode (Normal > Acc)      Ctrl+F9 = Cycle Hybrid Mode (Normal > DT)');
  p('-- Win+F9 = Cycle Weaponskill Mode            F10 / F11 = Physical / Magical defense');
  p('-- Alt+F10 = Toggle Kiting                    F12 = Update gear      Ctrl+F12 = Cycle Idle Mode');
  p('-- Commands: //gs c cycle OffenseMode   //gs c set HybridMode DT   //gs c toggle Kiting');
  p('-------------------------------------------------------------------------------------------------------------------');
  p();
  p('function get_sets()');
  p('    mote_include_version = 2');
  p("    include('Mote-Include.lua')");
  p('end');
  p();
  p('function job_setup()');
  if (J === 'THF') {
    p("    state.Buff['Sneak Attack'] = buffactive['sneak attack'] or false");
    p("    state.Buff['Trick Attack'] = buffactive['trick attack'] or false");
    p("    state.TreasureMode = M{['description']='Treasure Mode', 'None', 'Tag', 'SATA', 'Fulltime'}");
  }
  p('    no_swap_gear = S{"Warp Ring", "Dim. Ring (Dem)", "Dim. Ring (Holla)", "Dim. Ring (Mea)",');
  p('        "Trizek Ring", "Echad Ring", "Facility Ring", "Capacity Ring"}');
  p('end');
  p();
  p('function user_setup()');
  p("    state.OffenseMode:options('Normal', 'Acc')");
  p("    state.HybridMode:options('Normal', 'DT')");
  p("    state.IdleMode:options('Normal', 'DT')");
  p("    state.WeaponskillMode:options('Normal', 'Acc')");
  if (ranged) p("    state.RangedMode:options('Normal', 'Acc')");
  if (mage) p("    state.CastingMode:options('Normal', 'Resistant')");
  p("    state.PhysicalDefenseMode:options('PDT')");
  p("    state.MagicalDefenseMode:options('MDT')");
  p("    state.WeaponLock = M(false, 'Weapon Lock')");
  p('    set_macro_page(1, 1)');
  p('end');
  p();
  p('function user_unload()');
  p('end');
  p();
  p('function init_gear_sets()');
  p();
  p('    ------------------------------------------------------------------------------------------------');
  p('    ---------------------------------------- Precast Sets ------------------------------------------');
  p('    ------------------------------------------------------------------------------------------------');
  p();
  p(block('sets.precast.FC', { comment: 'Fast Cast (all spells)' }));
  if (mage) p(block("sets.precast.FC['Enhancing Magic']", { combine: 'sets.precast.FC', comment: 'Enhancing magic precast' }));
  if (J === 'NIN') p(block('sets.precast.FC.Utsusemi', { combine: 'sets.precast.FC', comment: 'Utsusemi precast' }));
  if (HEALER_JOBS.has(J)) p(block('sets.precast.FC.Cure', { combine: 'sets.precast.FC', comment: 'Cure precast (Cure spellcasting time)' }));
  for (const ja of jas) p(block(`sets.precast.JA[${luaString(ja)}]`, { comment: ja }));
  if (ranged) p(block('sets.precast.RA', { comment: 'Ranged attack precast (snapshot)' }));
  p(block('sets.precast.Waltz', { comment: 'Curing Waltz' }));
  p(block('sets.precast.Step', { comment: 'Steps (accuracy)' }));
  p(block('sets.precast.Flourish1', { comment: 'Flourishes' }));
  p();
  p('    ------------------------------------------------------------------------------------------------');
  p('    ------------------------------------- Weapon Skill Sets ----------------------------------------');
  p('    ------------------------------------------------------------------------------------------------');
  p();
  p(block('sets.precast.WS', { comment: 'Default weapon skill set (used for any WS without its own set)' }));
  p(block('sets.precast.WS.Acc', { combine: 'sets.precast.WS', comment: 'Accuracy weapon skill set' }));
  for (const name of ws) {
    p(block(`sets.precast.WS[${luaString(name)}]`, { combine: 'sets.precast.WS', comment: name }));
    p(block(`sets.precast.WS[${luaString(name)}].Acc`, { combine: `sets.precast.WS[${luaString(name)}]`, comment: `${name} (accuracy)` }));
  }
  p();
  p('    ------------------------------------------------------------------------------------------------');
  p('    ---------------------------------------- Midcast Sets ------------------------------------------');
  p('    ------------------------------------------------------------------------------------------------');
  p();
  p(block('sets.midcast.FastRecast', { comment: 'Generic midcast (recast / interruption)' }));
  if (J === 'NIN') p(block('sets.midcast.Utsusemi', { comment: 'Utsusemi midcast' }));
  if (HEALER_JOBS.has(J)) {
    p(block('sets.midcast.Cure', { comment: 'Cure potency' }));
    p(block('sets.midcast.Curaga', { combine: 'sets.midcast.Cure', comment: 'Curaga' }));
    p(block('sets.midcast.Cursna', { comment: 'Cursna (Cursna+ / healing skill)' }));
    p(block('sets.midcast.Regen', { comment: 'Regen potency / duration' }));
  }
  if (NUKER_JOBS.has(J)) {
    const nukePath = J === 'NIN' ? 'sets.midcast.ElementalNinjutsu' : J === 'DRK' ? "sets.midcast['Dark Magic']" : J === 'BLU' ? "sets.midcast['Blue Magic']" : "sets.midcast['Elemental Magic']";
    p(block(nukePath, { comment: 'Nuking (magic attack / magic accuracy)' }));
    p(block(`${nukePath}.Resistant`, { combine: nukePath, comment: 'Nuking against resistant targets' }));
    p(block(`${nukePath}.MagicBurst`, { combine: nukePath, comment: 'Magic burst' }));
  }
  if (mage) p(block("sets.midcast['Enhancing Magic']", { comment: 'Enhancing magic skill' }));
  if (mage && !['NIN', 'SMN', 'BRD'].includes(J)) p(block("sets.midcast['Enfeebling Magic']", { comment: 'Enfeebling magic (magic accuracy / skill / potency)' }));
  if (ranged) p(block('sets.midcast.RA', { comment: 'Ranged attack midcast' }));
  p();
  p('    ------------------------------------------------------------------------------------------------');
  p('    ----------------------------------------- Idle Sets --------------------------------------------');
  p('    ------------------------------------------------------------------------------------------------');
  p();
  p(block('sets.idle', { comment: 'Idle (refresh / regen / movement / DT)' }));
  p(block('sets.idle.DT', { combine: 'sets.idle', comment: 'Idle - damage taken' }));
  p(block('sets.idle.Town', { combine: 'sets.idle', comment: 'Idle in town' }));
  p(block('sets.Kiting', { comment: 'Kiting (movement speed)' }));
  p(block('sets.defense.PDT', { comment: 'Physical defense' }));
  p(block('sets.defense.MDT', { comment: 'Magical defense' }));
  p();
  p('    ------------------------------------------------------------------------------------------------');
  p('    ---------------------------------------- Engaged Sets ------------------------------------------');
  p('    ------------------------------------------------------------------------------------------------');
  p();
  p(block('sets.engaged', { comment: 'TP set' }));
  p(block('sets.engaged.Acc', { combine: 'sets.engaged', comment: 'TP set - accuracy' }));
  p(block('sets.engaged.DT', { combine: 'sets.engaged', comment: 'Hybrid TP / damage taken' }));
  p(block('sets.engaged.Acc.DT', { combine: 'sets.engaged.DT', comment: 'Hybrid TP - accuracy' }));
  if (J === 'THF') {
    p(block('sets.TreasureHunter', { comment: 'Treasure Hunter' }));
    p(block('sets.engaged.TH', { combine: 'sets.engaged', comment: 'TP set with Treasure Hunter (TreasureMode Fulltime)' }));
  }
  p();
  p('    ------------------------------------------------------------------------------------------------');
  p('    ----------------------------------------- Buff Sets --------------------------------------------');
  p('    ------------------------------------------------------------------------------------------------');
  p();
  p(block('sets.buff.Doom', { comment: 'Doom (Holy Water / Cursna received gear)' }));
  p('end');
  p();
  p('-------------------------------------------------------------------------------------------------------------------');
  p('-- Job-specific hooks for standard casting events.');
  p('-------------------------------------------------------------------------------------------------------------------');
  p();
  p('function job_precast(spell, action, spellMap, eventArgs)');
  if (J === 'THF') {
    p("    if spell.english == 'Sneak Attack' or spell.english == 'Trick Attack' then");
    p('        state.Buff[spell.english] = true');
    p('    end');
  }
  p('end');
  p();
  p('function job_aftercast(spell, action, spellMap, eventArgs)');
  if (J === 'THF') {
    p("    if state.Buff[spell.english] ~= nil then");
    p('        state.Buff[spell.english] = not spell.interrupted or buffactive[spell.english]');
    p('    end');
  }
  p('end');
  p();
  if (J === 'THF') {
    p('function customize_melee_set(meleeSet)');
    p("    if state.TreasureMode.value == 'Fulltime' then");
    p('        meleeSet = set_combine(meleeSet, sets.TreasureHunter)');
    p('    end');
    p('    return meleeSet');
    p('end');
    p();
  }
  p('function job_buff_change(buff, gain)');
  p("    if buff == 'Doom' then");
  p('        if gain then');
  p('            equip(sets.buff.Doom)');
  p("            disable('ring1', 'ring2', 'waist')");
  p('        else');
  p("            enable('ring1', 'ring2', 'waist')");
  p('            handle_equipping_gear(player.status)');
  p('        end');
  p('    end');
  p('end');
  p();
  p('function job_state_change(stateField, newValue, oldValue)');
  p("    if stateField == 'Weapon Lock' then");
  p('        if newValue == true then');
  p("            disable('main', 'sub', 'range')");
  p('        else');
  p("            enable('main', 'sub', 'range')");
  p('        end');
  p('    end');
  p('end');
  p();
  p('function job_handle_equipping_gear(playerStatus, eventArgs)');
  p('    check_rings()');
  p('end');
  p();
  p('function check_rings()');
  p('    if no_swap_gear:contains(player.equipment.ring1) then');
  p("        disable('ring1')");
  p('    else');
  p("        enable('ring1')");
  p('    end');
  p('    if no_swap_gear:contains(player.equipment.ring2) then');
  p("        disable('ring2')");
  p('    else');
  p("        enable('ring2')");
  p('    end');
  p('end');
  p();
  p('function select_default_macro_book()');
  p('    set_macro_page(1, 1)');
  p('end');
  p();
  return out.join('\n');
}

/** Jobs that ship with a vendored community template (Masin-M/Gearswap_generator, MIT). */
export const VENDORED_TEMPLATE_JOBS = ['DRG', 'DRK', 'NIN', 'PLD', 'RDM', 'RUN', 'SAM'] as const;

export function hasVendoredTemplate(job: string): boolean {
  return (VENDORED_TEMPLATE_JOBS as readonly string[]).includes(job.toUpperCase());
}

export const TEMPLATE_VERSION = 1;

export function vendoredTemplateUrl(job: string): string {
  return `/templates/${job.toUpperCase()}.lua?v=${TEMPLATE_VERSION}`;
}
