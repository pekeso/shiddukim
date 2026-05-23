import { IsString, MinLength } from 'class-validator';

/**
 * DTO for POST /communities/:id/members — assigns a member to a community.
 *
 * All validation messages are in French.
 */
export class AssignMemberDto {
  @IsString({ message: 'Le code fidèle est requis.' })
  @MinLength(1, { message: 'Le code fidèle ne peut pas être vide.' })
  memberCode!: string;
}
