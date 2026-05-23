import type { Role } from '../../../generated/prisma/client.js';
import { Permission } from './permissions';

/**
 * Maps every Role to the set of Permission strings it is granted.
 *
 * Rules:
 *  - SUPER_ADMIN  : all permissions (platform management)
 *  - CHURCH_ADMIN : all administrative permissions except marriage.classify
 *                   (classification is a pastoral act, not administrative)
 *  - SECRETARY    : day-to-day member registration and appointment booking
 *  - PASTOR       : marriage review, case classification, document generation
 *  - COMMUNITY_LEADER: read-only view of community members
 *  - MEMBER       : own profile, submit marriage request, book appointment
 *
 * Add new permissions to this map whenever a new Permission constant is added.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission) as Permission[],

  CHURCH_ADMIN: [
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_DELETE,
    Permission.COMMUNITY_CREATE,
    Permission.COMMUNITY_UPDATE,
    Permission.MARRIAGE_CREATE,
    Permission.MARRIAGE_REVIEW,
    // MARRIAGE_CLASSIFY intentionally excluded — pastoral act, not admin
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_MANAGE,
    Permission.DOCUMENT_GENERATE,
    Permission.DOCUMENT_VIEW,
    Permission.DASHBOARD_VIEW,
    Permission.AUDIT_VIEW,
  ],

  SECRETARY: [
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.APPOINTMENT_CREATE,
    Permission.DOCUMENT_VIEW,
  ],

  PASTOR: [
    Permission.MEMBER_READ,
    Permission.MARRIAGE_REVIEW,
    Permission.MARRIAGE_CLASSIFY,
    Permission.APPOINTMENT_MANAGE,
    Permission.DOCUMENT_VIEW,
    Permission.DOCUMENT_GENERATE,
  ],

  COMMUNITY_LEADER: [Permission.MEMBER_READ],

  MEMBER: [
    Permission.MEMBER_READ,
    Permission.MARRIAGE_CREATE,
    Permission.APPOINTMENT_CREATE,
    Permission.DOCUMENT_VIEW,
  ],
};
