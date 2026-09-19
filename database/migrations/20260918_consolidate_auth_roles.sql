-- Consolida la autorización institucional en ADMINISTRADOR y TURISTA.
-- No elimina cuentas: las asignaciones históricas de REVISOR/GESTOR pasan a ADMINISTRADOR.
BEGIN;

INSERT INTO roles (nombre_rol)
VALUES ('ADMINISTRADOR'), ('TURISTA')
ON CONFLICT (nombre_rol) DO NOTHING;

INSERT INTO usuarios_roles (rol_id, usuario_id)
SELECT admin_role.id, assignment.usuario_id
  FROM usuarios_roles assignment
  JOIN roles old_role ON old_role.id = assignment.rol_id
 CROSS JOIN roles admin_role
 WHERE old_role.nombre_rol IN ('REVISOR', 'GESTOR')
   AND admin_role.nombre_rol = 'ADMINISTRADOR'
ON CONFLICT (rol_id, usuario_id) DO NOTHING;

DELETE FROM usuarios_roles assignment
 USING roles old_role
 WHERE assignment.rol_id = old_role.id
   AND old_role.nombre_rol IN ('REVISOR', 'GESTOR');

DELETE FROM roles
 WHERE nombre_rol IN ('REVISOR', 'GESTOR');

COMMIT;
