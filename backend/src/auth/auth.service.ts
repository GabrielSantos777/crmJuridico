import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(data: { name: string; email: string; password: string }) {
    if (!data?.name || !data?.email || !data?.password) {
      throw new BadRequestException('Dados invÃ¡lidos');
    }

    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email jÃ¡ cadastrado');
    }

    const hash = await bcrypt.hash(data.password, 10);

    const user = await this.usersService.create({
      name: data.name,
      email: data.email,
      password: hash,
    });

    await this.usersService.applyInviteIfAny(user.id, user.email);
    const refreshed = await this.usersService.findByEmail(user.email);

    const payload = {
      sub: refreshed?.id ?? user.id,
      email: refreshed?.email ?? user.email,
      name: refreshed?.name ?? user.name,
      role: refreshed?.role ?? user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: refreshed?.id ?? user.id,
        email: refreshed?.email ?? user.email,
        name: refreshed?.name ?? user.name,
        role: refreshed?.role ?? user.role,
      },
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Credenciais invÃ¡lidas');
    }

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
