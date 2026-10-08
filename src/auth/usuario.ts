import type { AccountInfo } from '@azure/msal-browser';
import type { ConfigM365 } from '../config';
import type { Persona, Rol, Usuario } from '../domain/tipos';
import { AppError } from '../data/errores';
import type { Cliente } from '../data/http';
import { SCOPE_PERFIL } from './msal';

const GRAPH = 'https://graph.microsoft.com/v1.0';

interface Me {
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string;
  department?: string | null;
}

/**
 * Rol de interfaz. Primero mira la reclamación "groups" del token (si IT la ha
 * activado, no hace falta llamar a Graph). Si no viene o hay demasiados grupos,
 * consulta /me/checkMemberGroups. Ante cualquier error, "equipo".
 */
export async function resolverRol(
  account: AccountInfo,
  cfg: ConfigM365,
  cliente: Cliente,
): Promise<Rol> {
  const claims = account.idTokenClaims as
    { groups?: unknown; _claim_names?: { groups?: unknown } } | undefined;
  const grupos = Array.isArray(claims?.groups) ? (claims.groups as unknown[]) : null;
  if (grupos?.includes(cfg.managersGroupId)) return 'manager';
  if (grupos && !claims?._claim_names?.groups) return 'equipo';
  try {
    const r = await cliente.peticion<{ value: string[] }>(`${GRAPH}/me/checkMemberGroups`, {
      method: 'POST',
      scopes: [SCOPE_PERFIL],
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: [cfg.managersGroupId] }),
    });
    return r.value.includes(cfg.managersGroupId) ? 'manager' : 'equipo';
  } catch (e) {
    if (e instanceof AppError) return 'equipo';
    throw e;
  }
}

export async function cargarUsuario(
  account: AccountInfo,
  cfg: ConfigM365,
  cliente: Cliente,
  personas: readonly Persona[],
): Promise<Usuario> {
  const [me, rol] = await Promise.all([
    cliente.peticion<Me>(`${GRAPH}/me?$select=displayName,mail,userPrincipalName,department`, {
      scopes: [SCOPE_PERFIL],
    }),
    resolverRol(account, cfg, cliente),
  ]);
  const correos = [me.mail, me.userPrincipalName, account.username]
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .map((c) => c.toLowerCase());
  const persona = personas.find((p) => correos.includes(p.email.toLowerCase())) ?? null;
  return {
    nombre: me.displayName ?? account.name ?? account.username,
    email: me.mail ?? me.userPrincipalName ?? account.username,
    personaId: persona?.id ?? null,
    departamento: me.department ?? null,
    rol,
  };
}
