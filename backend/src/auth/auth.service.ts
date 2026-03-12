import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { assertStrongPassword } from './password.util';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(data: { name: string; email: string; password: string; cpf: string }, officeId?: string) {
    if (!data?.name || !data?.email || !data?.password || !data?.cpf) {
      throw new BadRequestException('Dados invalidos');
    }

    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email ja cadastrado');
    }
    const existingCpf = await this.usersService.findByCpf(data.cpf);
    if (existingCpf) {
      throw new ConflictException('CPF ja cadastrado');
    }

    assertStrongPassword(data.password);
    const hash = await bcrypt.hash(data.password, 10);

    const user = await this.usersService.create({
      name: data.name,
      email: data.email,
      cpf: data.cpf,
      password: hash,
      officeId: officeId ?? null,
      role: 'UNASSIGNED' as any,
    });

    await this.usersService.applyInviteIfAny(user.id, user.email);
    const refreshed = await this.usersService.findByEmail(user.email);

    const payload = {
      sub: refreshed?.id ?? user.id,
      email: refreshed?.email ?? user.email,
      name: refreshed?.name ?? user.name,
      role: refreshed?.role ?? user.role,
      officeId: refreshed?.officeId ?? user.officeId ?? null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: refreshed?.id ?? user.id,
        email: refreshed?.email ?? user.email,
        name: refreshed?.name ?? user.name,
        role: refreshed?.role ?? user.role,
        officeId: refreshed?.officeId ?? user.officeId ?? null,
      },
    };
  }

  async login(params: { identifier?: string; email?: string; cpf?: string; password: string }) {
    const identifier = params.identifier ?? params.email ?? params.cpf;
    if (!identifier || !params.password) {
      throw new BadRequestException('Credenciais invalidas');
    }

    const user = await this.usersService.findByEmailOrCpf(identifier);

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const passwordMatch = await bcrypt.compare(params.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    if (user.mustChangePassword) {
      const changeToken = this.jwtService.sign(
        { sub: user.id, stage: 'force_change', email: user.email },
        { expiresIn: '15m' },
      );
      return {
        requiresPasswordChange: true,
        changeToken,
      };
    }

    if (user.role === 'SUPER_ADMIN') {
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        officeId: null,
      };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          officeId: null,
        },
      };
    }

    const officeLockId = (process.env.OFFICE_LOCK_ID ?? '').trim() || null;
    let offices = await this.usersService.listUserOffices(user.id);

    if (offices.length === 0 && user.officeId) {
      await this.usersService.addUserToOffice({
        userId: user.id,
        officeId: user.officeId,
        role: user.role ?? 'BASIC',
      });
      offices = await this.usersService.listUserOffices(user.id);
    }

    if (officeLockId) {
      const locked = offices.find((item) => item.officeId === officeLockId);
      if (!locked) {
        throw new UnauthorizedException('Conta sem escritorio vinculado');
      }
      return this.issueTokenForOffice(user, locked.officeId, locked.role);
    }

    if (offices.length === 0) {
      throw new UnauthorizedException('Conta sem escritorio vinculado');
    }

    if (offices.length === 1) {
      return this.issueTokenForOffice(user, offices[0].officeId, offices[0].role);
    }

    const selectionToken = this.jwtService.sign(
      { sub: user.id, stage: 'select', email: user.email },
      { expiresIn: '15m' },
    );

    return {
      requiresOfficeSelection: true,
      selectionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      offices: offices.map((item) => ({
        id: item.officeId,
        name: item.office.name,
      })),
    };
  }

  async selectOffice(selectionToken: string, officeId: string) {
    if (!selectionToken || !officeId) {
      throw new BadRequestException('Dados invalidos');
    }
    let payload: any;
    try {
      payload = this.jwtService.verify(selectionToken);
    } catch {
      throw new UnauthorizedException('Token invalido');
    }
    if (payload?.stage !== 'select') {
      throw new UnauthorizedException('Token invalido');
    }
    const user = await this.usersService.findByEmailOrCpf(payload.email);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }
    const offices = await this.usersService.listUserOffices(user.id);
    const selected = offices.find((item) => item.officeId === officeId);
    if (!selected) {
      throw new UnauthorizedException('Conta sem escritorio vinculado');
    }
    return this.issueTokenForOffice(user, selected.officeId, selected.role);
  }

  async forceChangePassword(changeToken: string, newPassword: string) {
    if (!changeToken || !newPassword) {
      throw new BadRequestException('Dados invalidos');
    }
    assertStrongPassword(newPassword);
    let payload: any;
    try {
      payload = this.jwtService.verify(changeToken);
    } catch {
      throw new UnauthorizedException('Token invalido');
    }
    if (payload?.stage !== 'force_change') {
      throw new UnauthorizedException('Token invalido');
    }
    const user = await this.usersService.findByEmailOrCpf(payload.email);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hash);
    return { ok: true };
  }

  private issueTokenForOffice(user: any, officeId: string, role: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
      officeId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        officeId,
      },
    };
  }

  async adminLogin(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Credenciais invalidas');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais invalidas');
    }
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      officeId: null,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        officeId: null,
      },
    };
  }
}
