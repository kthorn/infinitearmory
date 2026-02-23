import { RARITY_COLORS, TRIGGER_DISPLAY } from '@/lib/schemas'
import type { WeaponSpec, FantasyWeaponSpec, SciFiHandheldSpec, TurretSpec, MechSpec } from '@/lib/schemas'

interface StatBlockProps {
  spec: WeaponSpec
}

export function StatBlock({ spec }: StatBlockProps) {
  switch (spec.category) {
    case 'fantasy_weapon':
      return <FantasyStatBlock spec={spec} />
    case 'scifi_handheld':
      return <HandheldStatBlock spec={spec} />
    case 'scifi_turret':
      return <TurretStatBlock spec={spec} />
    case 'mech':
      return <MechStatBlock spec={spec} />
  }
}

// ── Shared sub-components ──

function StatBlockShell({ children, name, rarity, subtitle }: {
  children: React.ReactNode
  name: string
  rarity: string
  subtitle: string
}) {
  const rarityColor = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 font-serif">
      <div className="border-b border-amber-700/50 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-amber-100">{name}</h2>
        <p className="text-sm italic text-slate-400">
          <span className={rarityColor}>{rarity.replaceAll('_', ' ')}</span>
          {' '}{subtitle}
        </p>
      </div>
      {children}
    </div>
  )
}

function EffectsBlock({ effects }: { effects: WeaponSpec['effects'] }) {
  if (effects.length === 0) return null
  return (
    <div className="mb-4 space-y-2">
      {effects.map((effect, index) => (
        <div key={index} className="text-slate-300">
          <span className="font-semibold text-amber-300">
            {TRIGGER_DISPLAY[effect.trigger]}:
          </span>{' '}
          {effect.description}
        </div>
      ))}
    </div>
  )
}

function RulesAndTags({ rulesText, tags }: { rulesText: string; tags: string[] }) {
  return (
    <>
      <div className="border-t border-slate-700 pt-4 mt-4">
        <p className="text-slate-400 italic text-sm leading-relaxed">{rulesText}</p>
      </div>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="text-slate-300">
      <span className="font-semibold">{label}:</span> {value}
    </p>
  )
}

// ── Category-specific stat blocks ──

function FantasyStatBlock({ spec }: { spec: FantasyWeaponSpec }) {
  return (
    <StatBlockShell
      name={spec.name}
      rarity={spec.rarity}
      subtitle={`${spec.weaponType}${spec.properties.length > 0 ? ` (${spec.properties.join(', ')})` : ''}`}
    >
      <div className="mb-4">
        <StatLine label="Damage" value={`${spec.damage.dice} ${spec.damage.type}${spec.damageBonus ? ` + ${spec.damageBonus}` : ''}`} />
        {spec.toHitBonus !== undefined && (
          <StatLine label="Attack Bonus" value={spec.toHitBonus >= 0 ? `+${spec.toHitBonus}` : spec.toHitBonus} />
        )}
      </div>
      {spec.charges && (
        <div className="mb-4 p-3 bg-slate-800 rounded">
          <StatLine label="Charges" value={<>{spec.charges.current}/{spec.charges.max} <span className="text-slate-500">(recharges {spec.charges.recharge})</span></>} />
        </div>
      )}
      <EffectsBlock effects={spec.effects} />
      <RulesAndTags rulesText={spec.rulesText} tags={spec.tags} />
    </StatBlockShell>
  )
}

function HandheldStatBlock({ spec }: { spec: SciFiHandheldSpec }) {
  return (
    <StatBlockShell
      name={spec.name}
      rarity={spec.rarity}
      subtitle={`${spec.weaponClass} — ${spec.firingMode} fire`}
    >
      <div className="mb-4 space-y-1">
        <StatLine label="Damage" value={`${spec.damage.dice} ${spec.damage.type}`} />
        <StatLine label="Range" value={spec.range} />
        {spec.ammoCapacity !== undefined && <StatLine label="Ammo Capacity" value={spec.ammoCapacity} />}
        {spec.energyCost !== undefined && <StatLine label="Energy Cost" value={spec.energyCost} />}
      </div>
      <EffectsBlock effects={spec.effects} />
      <RulesAndTags rulesText={spec.rulesText} tags={spec.tags} />
    </StatBlockShell>
  )
}

function TurretStatBlock({ spec }: { spec: TurretSpec }) {
  return (
    <StatBlockShell
      name={spec.name}
      rarity={spec.rarity}
      subtitle={`${spec.mountType} turret`}
    >
      <div className="mb-4 space-y-1">
        <StatLine label="Damage" value={`${spec.damage.dice} ${spec.damage.type}`} />
        <StatLine label="Firing Mode" value={spec.firingMode} />
        <StatLine label="Range" value={spec.range} />
        <StatLine label="Rate of Fire" value={spec.rateOfFire} />
        {spec.ammoCapacity !== undefined && <StatLine label="Ammo Capacity" value={spec.ammoCapacity} />}
        {spec.energyCost !== undefined && <StatLine label="Energy Cost" value={spec.energyCost} />}
        {spec.deploymentRequirements && <StatLine label="Deployment" value={spec.deploymentRequirements} />}
      </div>
      <EffectsBlock effects={spec.effects} />
      <RulesAndTags rulesText={spec.rulesText} tags={spec.tags} />
    </StatBlockShell>
  )
}

function MechStatBlock({ spec }: { spec: MechSpec }) {
  return (
    <StatBlockShell
      name={spec.name}
      rarity={spec.rarity}
      subtitle={`${spec.mechClass}-class mech — ${spec.tonnage} tons`}
    >
      {/* Core Stats */}
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1">
        <StatLine label="Armor" value={spec.armorRating} />
        <StatLine label="Heat Capacity" value={spec.heatCapacity} />
        <StatLine label="Speed" value={spec.mobility.speed} />
        <StatLine label="Jump Jets" value={spec.mobility.jumpJets ? 'Yes' : 'No'} />
      </div>

      {/* Weapon Systems */}
      <div className="mb-4">
        <p className="font-semibold text-amber-300 mb-2">Weapon Systems</p>
        <div className="space-y-1">
          {spec.weaponSystems.map((ws, i) => (
            <div key={i} className="text-slate-300 text-sm flex justify-between">
              <span>{ws.name} <span className="text-slate-500">({ws.location})</span></span>
              <span>{ws.damage.dice} {ws.damage.type} <span className="text-orange-400">+{ws.heatGenerated} heat</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Special Systems */}
      {spec.specialSystems.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold text-amber-300 mb-1">Special Systems</p>
          <p className="text-slate-300 text-sm">{spec.specialSystems.join(', ')}</p>
        </div>
      )}

      <EffectsBlock effects={spec.effects} />
      <RulesAndTags rulesText={spec.rulesText} tags={spec.tags} />
    </StatBlockShell>
  )
}
