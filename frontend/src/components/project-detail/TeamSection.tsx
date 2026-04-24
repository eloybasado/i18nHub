import { Crown, Shield, Trash2, UserMinus, UserRoundCog, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import type { ProjectMember } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

type TeamSectionProps = {
  members: ProjectMember[];
  currentUserId: string | null;
  canManageTeam: boolean;
  memberEmail: string;
  memberRole: 'EDITOR' | 'VIEWER';
  loading: boolean;
  canLeaveProject: boolean;
  onMemberEmailChange: (value: string) => void;
  onMemberRoleChange: (value: 'EDITOR' | 'VIEWER') => void;
  onAddMember: (event: FormEvent) => void | Promise<void>;
  onUpdateMemberRole: (member: ProjectMember, role: 'EDITOR' | 'VIEWER') => void | Promise<void>;
  onRequestRemoveMember: (member: ProjectMember) => void;
  onRequestTransferOwnership: (member: ProjectMember) => void;
  onLeaveProject: () => void | Promise<void>;
};

export function TeamSection({
  members,
  currentUserId,
  canManageTeam,
  memberEmail,
  memberRole,
  loading,
  canLeaveProject,
  onMemberEmailChange,
  onMemberRoleChange,
  onAddMember,
  onUpdateMemberRole,
  onRequestRemoveMember,
  onRequestTransferOwnership,
  onLeaveProject,
}: TeamSectionProps) {
  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Users size={16} />
        Equipo
      </h2>

      <p className="mt-2 text-sm text-zinc-600">
        Gestiona quien puede colaborar en este proyecto y que permisos tiene cada persona.
      </p>

      {canManageTeam ? (
        <form className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={onAddMember}>
          <div>
            <label className="mb-1 block text-sm text-zinc-600">Email del miembro</label>
            <Input
              type="email"
              placeholder="persona@equipo.com"
              value={memberEmail}
              onChange={(event) => onMemberEmailChange(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600">Rol</label>
            <Select value={memberRole} onChange={(event) => onMemberRoleChange(event.target.value as 'EDITOR' | 'VIEWER')}>
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </Select>
          </div>

          <div className="md:self-end">
            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
              {loading ? 'Anadiendo...' : 'Anadir miembro'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Solo el owner del proyecto puede gestionar miembros.
        </p>
      )}

      {members.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No hay miembros configurados.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {members.map((member) => {
            const isCurrentUser = currentUserId === member.userId;

            return (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{member.name}</p>
                  <p className="text-xs text-zinc-500">{member.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {member.isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                      <Crown size={12} className="text-amber-700" />
                      Owner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
                      <Shield size={12} />
                      {member.role}
                    </span>
                  )}

                  {isCurrentUser ? (
                    <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                      Tu
                    </span>
                  ) : null}

                  {canManageTeam && !member.isOwner ? (
                    <Select
                      className="h-8 min-w-[110px] py-1 text-xs"
                      value={member.role}
                      disabled={loading}
                      onChange={(event) => {
                        const nextRole = event.target.value as 'EDITOR' | 'VIEWER';
                        void onUpdateMemberRole(member, nextRole);
                      }}
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </Select>
                  ) : null}

                  {canManageTeam && !member.isOwner ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => onRequestTransferOwnership(member)}
                    >
                      <UserRoundCog size={14} className="mr-1" />
                      Hacer owner
                    </Button>
                  ) : null}

                  {canManageTeam && !member.isOwner ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                      disabled={loading}
                      onClick={() => onRequestRemoveMember(member)}
                    >
                      <Trash2 size={14} className="mr-1" />
                      Eliminar
                    </Button>
                  ) : null}

                  {!canManageTeam && isCurrentUser && canLeaveProject ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                      disabled={loading}
                      onClick={() => {
                        void onLeaveProject();
                      }}
                    >
                      <UserMinus size={14} className="mr-1" />
                      Salir del proyecto
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
