import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HashingService } from '../common/services/hashing.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AuthModule — wires together all authentication concerns:
 *
 * - HashingService (Argon2 password + token hashing)
 * - JwtStrategy (access token validation via Passport)
 * - JwtAuthGuard (route protection)
 * - AuthService (login / logout / refresh logic)
 * - AuthController (POST /auth/login, /auth/logout, /auth/refresh-token)
 *
 * JwtModule is registered without a default secret here; each signAsync /
 * verifyAsync call passes its own secret so access and refresh tokens use
 * different secrets (JWT_ACCESS_SECRET vs JWT_REFRESH_SECRET).
 *
 * PrismaModule is global so it doesn't need to be listed in imports,
 * but it is explicitly imported here for clarity.
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Register JwtModule without a default secret — secrets are passed
    // per-call in AuthService to keep access and refresh secrets separate.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, HashingService, JwtStrategy, JwtAuthGuard],
  exports: [HashingService, JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
