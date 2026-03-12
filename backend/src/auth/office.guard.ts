import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OfficeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }
    if (user.role === 'SUPER_ADMIN') {
      if (user.officeId) return true;
      const headerOfficeId = (req.headers['x-office-id'] as string) ?? '';
      if (headerOfficeId) {
        req.user.officeId = headerOfficeId;
        return true;
      }
      throw new ForbiddenException('officeId obrigatorio');
    }
    if (!user.officeId) {
      throw new ForbiddenException('Conta sem escritorio vinculado');
    }
    return true;
  }
}
