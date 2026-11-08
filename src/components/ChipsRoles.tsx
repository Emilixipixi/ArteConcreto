import type { RolId } from '../types';
import { ROL_NOMBRE } from '../data/roles';

export default function ChipsRoles({ roles }: { roles: RolId[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => <span key={r} className="chip">{ROL_NOMBRE[r]}</span>)}
    </span>
  );
}
