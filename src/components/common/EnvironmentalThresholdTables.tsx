import { Badge, levelToTone } from './Badge';
import { ENV_THRESHOLD_TABLE } from '../../utils/calculations';

/** Temperature + noise classification tables, rendered from the single source of truth. */
export function EnvironmentalThresholdTables({ columns = false }: { columns?: boolean }) {
  return (
    <div className={columns ? 'grid grid-cols-1 gap-6 md:grid-cols-2' : 'space-y-5'}>
      {Object.values(ENV_THRESHOLD_TABLE).map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
          <table className="w-full text-left text-xs">
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="w-28 py-2 pr-3 align-top">
                    <Badge tone={levelToTone(row.level)}>{row.label}</Badge>
                  </td>
                  <td className="py-2 align-top">
                    <span className="font-medium text-primary">{row.range}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
