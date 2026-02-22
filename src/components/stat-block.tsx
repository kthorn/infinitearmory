import { RARITY_COLORS, TRIGGER_DISPLAY } from '@/lib/schemas'
import type { WeaponSpec } from '@/lib/schemas'

interface StatBlockProps {
  spec: WeaponSpec
}

export function StatBlock({ spec }: StatBlockProps) {
  const rarityColor = RARITY_COLORS[spec.rarity]

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 font-serif">
      {/* Header */}
      <div className="border-b border-amber-700/50 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-amber-100">{spec.name}</h2>
        <p className="text-sm italic text-slate-400">
          <span className={rarityColor}>{spec.rarity.replaceAll('_', ' ')}</span>
          {' '}{spec.weaponType}
          {spec.properties.length > 0 && (
            <span className="text-slate-500">
              {' '}({spec.properties.join(', ')})
            </span>
          )}
        </p>
      </div>

      {/* Damage */}
      <div className="mb-4">
        <p className="text-slate-300">
          <span className="font-semibold">Damage:</span>{' '}
          {spec.damage.dice} {spec.damage.type}
          {spec.damageBonus ? ` + ${spec.damageBonus}` : ''}
        </p>
        {spec.toHitBonus !== undefined && (
          <p className="text-slate-300">
            <span className="font-semibold">Attack Bonus:</span> {spec.toHitBonus >= 0 ? `+${spec.toHitBonus}` : spec.toHitBonus}
          </p>
        )}
      </div>

      {/* Charges */}
      {spec.charges && (
        <div className="mb-4 p-3 bg-slate-800 rounded">
          <p className="text-slate-300">
            <span className="font-semibold">Charges:</span>{' '}
            {spec.charges.current}/{spec.charges.max}
            <span className="text-slate-500"> (recharges {spec.charges.recharge})</span>
          </p>
        </div>
      )}

      {/* Effects */}
      {spec.effects.length > 0 && (
        <div className="mb-4 space-y-2">
          {spec.effects.map((effect, index) => (
            <div key={index} className="text-slate-300">
              <span className="font-semibold text-amber-300">
                {TRIGGER_DISPLAY[effect.trigger]}:
              </span>{' '}
              {effect.description}
            </div>
          ))}
        </div>
      )}

      {/* Rules Text */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <p className="text-slate-400 italic text-sm leading-relaxed">{spec.rulesText}</p>
      </div>

      {/* Tags */}
      {spec.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {spec.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
